// Calcul de la balance d'un groupe (façon Tricount), à partir des tickets.
// Helper serveur pur : importé par les pages/actions, fait ses propres lectures Prisma.
//
// Principe : chaque ligne de ticket (ReceiptItem) a un prix et est rattachée à un
// article (ListItem) dont les participants (ItemParticipant) définissent qui partage
// la dépense et avec combien de parts. Le payeur du ticket (Receipt.paidByUserId) a
// avancé l'argent. La balance nette de chacun = ce qu'il a payé − ce qu'il a consommé,
// ajustée des remboursements déjà enregistrés (Settlement).

import { prisma } from "@/lib/db";

export type NetBalance = {
  userId: string;
  name: string;
  color: string | null;
  net: number; // > 0 = on lui doit (créancier) · < 0 = il doit (débiteur) · arrondi au centime
};

export type SettlementSuggestion = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number; // euros positifs, arrondi au centime
};

export type GroupBalances = {
  nets: NetBalance[]; // une ligne par membre courant, triée par net décroissant
  suggestions: SettlementSuggestion[]; // « qui paie qui », minimal
  everyoneSettled: boolean; // tous les |net| < 0.01
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function computeGroupBalances(groupId: string): Promise<GroupBalances> {
  // 1. Membres courants du groupe → définit l'ensemble des lignes + les participants valides.
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, color: true } } },
  });
  const memberIds = new Set(members.map((m) => m.userId));

  // 2. Tous les tickets du groupe avec, par ligne, les participants de l'article rattaché.
  const receipts = await prisma.receipt.findMany({
    where: { list: { groupId } },
    include: {
      items: { include: { matchedItem: { include: { participants: true } } } },
    },
  });

  // 3. Tous les remboursements déjà saisis.
  const settlements = await prisma.settlement.findMany({ where: { groupId } });

  // net initialisé à 0 pour chaque membre courant.
  const net = new Map<string, number>();
  for (const id of memberIds) net.set(id, 0);
  const add = (userId: string, delta: number) => {
    if (net.has(userId)) net.set(userId, net.get(userId)! + delta);
  };

  // 4. Accumulation à partir des lignes de ticket.
  for (const receipt of receipts) {
    const payer = receipt.paidByUserId;
    for (const item of receipt.items) {
      const participants = (item.matchedItem?.participants ?? []).filter((p) =>
        memberIds.has(p.userId),
      );
      const totalParts = participants.reduce((s, p) => s + p.parts, 0);
      // Aucun participant connu → le coût reste sur le payeur (neutre, il a payé ce qu'il a consommé).
      if (totalParts === 0) continue;

      add(payer, item.price); // le payeur a avancé le prix de la ligne…
      for (const p of participants) {
        add(p.userId, -(item.price * p.parts) / totalParts); // …et chacun doit sa part.
      }
    }
  }

  // 5. Application des remboursements : le débiteur a réduit sa dette.
  for (const s of settlements) {
    add(s.fromUserId, s.amount);
    add(s.toUserId, -s.amount);
  }

  // Arrondi au centime au niveau du net final uniquement.
  const nets: NetBalance[] = members
    .map((m) => ({
      userId: m.userId,
      name: m.user.name,
      color: m.user.color,
      net: round2(net.get(m.userId) ?? 0),
    }))
    .sort((a, b) => b.net - a.net);

  // 6. Simplification gloutonne « qui paie qui » en centimes entiers (évite la dérive float).
  const nameById = new Map(nets.map((n) => [n.userId, n.name]));
  const debtors = nets
    .filter((n) => Math.round(n.net * 100) < 0)
    .map((n) => ({ userId: n.userId, cents: Math.round(n.net * 100) })) // négatif
    .sort((a, b) => a.cents - b.cents); // plus gros débiteur d'abord
  const creditors = nets
    .filter((n) => Math.round(n.net * 100) > 0)
    .map((n) => ({ userId: n.userId, cents: Math.round(n.net * 100) })) // positif
    .sort((a, b) => b.cents - a.cents); // plus gros créancier d'abord

  const suggestions: SettlementSuggestion[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di];
    const c = creditors[ci];
    const pay = Math.min(-d.cents, c.cents);
    if (pay > 0) {
      suggestions.push({
        fromUserId: d.userId,
        fromName: nameById.get(d.userId) ?? "",
        toUserId: c.userId,
        toName: nameById.get(c.userId) ?? "",
        amount: pay / 100,
      });
      d.cents += pay;
      c.cents -= pay;
    }
    if (d.cents === 0) di++;
    if (c.cents === 0) ci++;
  }

  const everyoneSettled = nets.every((n) => Math.abs(n.net) < 0.01);

  return { nets, suggestions, everyoneSettled };
}
