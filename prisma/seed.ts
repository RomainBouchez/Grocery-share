import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function code(len = 6) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(len)).map((b) => a[b % a.length]).join("");
}

async function main() {
  // Utilisateurs de démo
  const romain = await prisma.user.upsert({
    where: { email: "romain@exemple.fr" },
    update: {},
    create: { name: "Romain", email: "romain@exemple.fr" },
  });
  const tom = await prisma.user.upsert({
    where: { email: "tom@exemple.fr" },
    update: {},
    create: { name: "Tom", email: "tom@exemple.fr" },
  });
  const mika = await prisma.user.upsert({
    where: { email: "mika@exemple.fr" },
    update: {},
    create: { name: "Mika", email: "mika@exemple.fr" },
  });

  // Groupe "Coloc" avec une liste en planning
  const group = await prisma.group.create({
    data: {
      name: "Coloc",
      inviteCode: code(),
      members: {
        create: [
          { userId: romain.id, role: "owner" },
          { userId: tom.id, role: "member" },
          { userId: mika.id, role: "member" },
        ],
      },
      lists: { create: { status: "planning" } },
    },
    include: { lists: true },
  });

  const listId = group.lists[0].id;

  // Vodka : Romain 1 part, Tom 2 parts (cf. exemple de la spec)
  await prisma.listItem.create({
    data: {
      listId,
      label: "Vodka 1L",
      addedByUserId: romain.id,
      participants: {
        create: [
          { userId: romain.id, parts: 1 },
          { userId: tom.id, parts: 2 },
        ],
      },
    },
  });

  await prisma.listItem.create({
    data: {
      listId,
      label: "Lait entier 1L",
      addedByUserId: mika.id,
      participants: { create: [{ userId: mika.id, parts: 1 }] },
    },
  });

  console.log(`✅ Seed terminé. Groupe "${group.name}" — code: ${group.inviteCode}`);
  console.log("   Connecte-toi avec romain@exemple.fr / tom@exemple.fr / mika@exemple.fr");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
