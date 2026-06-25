import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

function code(len = 6) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(len)).map((b) => a[b % a.length]).join("");
}

// Même format que src/lib/password.ts ("sel:clé"). Dupliqué ici pour que le
// seed reste exécutable hors du contexte Next (le module est "server-only").
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

const DEMO_PASSWORD = "motdepasse";

async function main() {
  // Utilisateurs de démo (tous avec le même mot de passe de démo)
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const romain = await prisma.user.upsert({
    where: { email: "romain@exemple.fr" },
    update: { passwordHash },
    create: { name: "Romain", email: "romain@exemple.fr", passwordHash },
  });
  const tom = await prisma.user.upsert({
    where: { email: "tom@exemple.fr" },
    update: { passwordHash },
    create: { name: "Tom", email: "tom@exemple.fr", passwordHash },
  });
  const mika = await prisma.user.upsert({
    where: { email: "mika@exemple.fr" },
    update: { passwordHash },
    create: { name: "Mika", email: "mika@exemple.fr", passwordHash },
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
  console.log(`   Connecte-toi avec romain@exemple.fr / tom@exemple.fr / mika@exemple.fr (mot de passe : ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
