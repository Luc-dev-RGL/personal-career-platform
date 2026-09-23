/**
 * BASCULE LE PROPRIÉTAIRE DE LA PLATEFORME vers admin@test.local
 * ==============================================================
 * État visé : UN SEUL compte admin (admin@test.local) propriétaire de
 * TOUT le contenu ; admin@localhost supprimé pour de bon.
 *
 * Le script gère les deux situations :
 *   - admin@test.local existe déjà → conservé tel quel (mot de passe inchangé) ;
 *   - il a été supprimé par une fusion précédente → recréé avec un mot de
 *     passe temporaire (à changer ensuite dans /admin/settings).
 *
 * Usage : node --env-file=.env --import tsx scripts/switch-owner.ts
 * Puis   : node --env-file=.env scripts/resync-kb.js
 */

import { db } from "../lib/db";
import { hashPassword } from "../lib/auth/password";

const KEEP_EMAIL = "admin@test.local";
const TEMP_PASSWORD = "Admin1234!"; // utilisé UNIQUEMENT si le compte doit être recréé

const CONTENT_MODELS = [
  "project", "article", "experience", "skill", "media", "service",
  "availability", "dateBlock", "appointment", "lead",
  "knowledgeChunk", "notification", "pageView", "conversation",
] as const;

async function main() {
  // ——— 1. Le compte à conserver existe-t-il ? ———
  let keep = await db.user.findUnique({ where: { email: KEEP_EMAIL } });
  if (!keep) {
    const hash = await hashPassword(TEMP_PASSWORD);
    keep = await db.user.create({
      data: { email: KEEP_EMAIL, password: hash, role: "admin" },
    });
    console.log(`✅ Compte recréé : #${keep.id} ${keep.email}`);
    console.log(`   🔑 Mot de passe temporaire : ${TEMP_PASSWORD}`);
    console.log("      → connecte-toi puis change-le dans /admin/settings");
  } else {
    console.log(`✅ Compte conservé : #${keep.id} ${keep.email} (mot de passe inchangé)`);
  }

  // ——— 2. Transfert depuis les autres admins + suppression ———
  const others = await db.user.findMany({
    where: { role: "admin", id: { not: keep.id } },
    select: { id: true, email: true },
  });
  if (others.length === 0) {
    console.log("Aucun autre admin : rien à transférer.");
    return;
  }

  for (const remove of others) {
    console.log(`\nTransfert depuis #${remove.id} ${remove.email} :`);

    // Contenus UNIQUES par utilisateur : Profile / ChatbotConfig
    const keepProfile = await db.profile.findUnique({ where: { userId: keep.id } });
    const rmProfile = await db.profile.findUnique({ where: { userId: remove.id } });
    if (rmProfile) {
      if (keepProfile) {
        await db.profile.delete({ where: { userId: remove.id } });
        console.log(`  Profil en doublon → supprimé (conservé : "${keepProfile.name}")`);
      } else {
        await db.profile.update({ where: { userId: remove.id }, data: { userId: keep.id } });
        console.log(`  Profil "${rmProfile.name}" déplacé`);
      }
    }

    const keepCfg = await db.chatbotConfig.findUnique({ where: { userId: keep.id } });
    const rmCfg = await db.chatbotConfig.findUnique({ where: { userId: remove.id } });
    if (rmCfg) {
      if (keepCfg) {
        await db.chatbotConfig.delete({ where: { userId: remove.id } });
        console.log("  ChatbotConfig en doublon → supprimée");
      } else {
        await db.chatbotConfig.update({ where: { userId: remove.id }, data: { userId: keep.id } });
        console.log("  ChatbotConfig déplacée");
      }
    }

    // Tout le contenu passe au compte conservé
    for (const m of CONTENT_MODELS) {
      const r = await (db as any)[m].updateMany({
        where: { authorId: remove.id },
        data: { authorId: keep.id },
      });
      if (r.count > 0) console.log(`  ${m} : ${r.count} élément(s)`);
    }

    // Suppression du compte doublon (ses sessions partent en cascade)
    await db.user.delete({ where: { id: remove.id } });
    console.log(`  ✅ #${remove.id} supprimé`);
  }

  // ——— 3. Vérification finale ———
  const admins = await db.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true },
  });
  const totalProjects = await db.project.count({ where: { authorId: keep.id } });
  console.log(`\nAdmin unique désormais : ${admins.map((a) => `#${a.id} ${a.email}`).join(", ")}`);
  console.log(`Projets appartenant à ${keep.email} : ${totalProjects}`);
  console.log("\n→ Relance maintenant : node --env-file=.env scripts/resync-kb.js");
  console.log("  (le projet transféré doit apparaître : project#… ✓ et le total doit monter)");
}

main()
  .catch((err) => {
    console.error("❌ Erreur fatale :", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());