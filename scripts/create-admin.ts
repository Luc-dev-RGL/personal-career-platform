/**
 * Création (ou reset) du compte administrateur.
 *
 * Sécurité : AUCUN secret en dur dans le code (règle du challenge).
 * - ADMIN_EMAIL / ADMIN_PASSWORD depuis l'environnement (.env)
 * - Si ADMIN_PASSWORD est vide : un mot de passe fort est généré
 *   aléatoirement et affiché UNE seule fois dans le terminal.
 * Usage : npm run admin:create
 */
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth/password";
import { randomBytes } from "crypto";

function generateStrongPassword(): string {
  const bytes = randomBytes(12).toString("base64url");
  return `Pcp-${bytes}-A9`;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@localhost").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || generateStrongPassword();

  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 10) {
    throw new Error("ADMIN_PASSWORD doit faire au moins 10 caractères.");
  }

  const hash = await hashPassword(password);

  const admin = await db.user.upsert({
    where: { email },
    update: { password: hash, role: "admin" },
    create: { email, password: hash, role: "admin" },
  });

  // Profil public par défaut s'il n'existe pas
  await db.profile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      name: "Luc",
      headline: "Développeur Full-Stack — Next.js · TypeScript · Prisma",
      bio: "Développeur full-stack orienté produit : je conçois des applications web complètes, du schéma de base de données à l'interface.",
      availability: true,
    },
  });

  // Config chatbot par défaut
  await db.chatbotConfig.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log("✅ Compte administrateur prêt :", admin.email);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("🔑 Mot de passe généré (à conserver maintenant, il ne sera plus affiché) :");
    console.log("   " + password);
  }
}

main()
  .catch((err) => {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
