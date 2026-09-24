/**
 * FUSION DES COMPTES ADMIN — garde UN seul admin propriétaire de tout.
 * ⚠️ Garde le compte avec lequel tu te connectes réellement à /admin !
 * Si c'est admin@test.local, mets KEEP_ID = 2 ci-dessous.
 * Usage : node --env-file=.env scripts/merge-admins.js
 * Puis relance : node --env-file=.env scripts/resync-kb.js
 */

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

// ←←← LE compte à CONSERVER (celui de ta connexion /admin) ←←←
const KEEP_ID = 2;

async function main() {
  const admins = await db.user.findMany({
    where: { role: "admin" },
    select: { id: true, email: true },
    orderBy: { id: "asc" },
  });
  console.log("Admins trouvés :", admins.map((a) => `#${a.id} ${a.email}`).join(" | "));

  const keep = admins.find((a) => a.id === KEEP_ID);
  if (!keep) {
    throw new Error(`Aucun admin avec id=${KEEP_ID} — ajuste KEEP_ID en haut du script.`);
  }
  const remove = admins.find((a) => a.id !== KEEP_ID);
  if (!remove) {
    console.log("✅ Un seul admin existe déjà : rien à faire.");
    return;
  }

  console.log(`\nCONSERVÉ  : #${keep.id} ${keep.email}`);
  console.log(`SUPPRIMÉ  : #${remove.id} ${remove.email} (après transfert de son contenu)\n`);

  // ——— 1. Contenus UNIQUES par user : Profile & ChatbotConfig ———
  const keepProfile = await db.profile.findUnique({ where: { userId: keep.id } });
  const rmProfile = await db.profile.findUnique({ where: { userId: remove.id } });
  if (rmProfile) {
    if (keepProfile) {
      console.log(`Profil en doublon (#${remove.id}) → supprimé. Conservé : "${keepProfile.name}"`);
      await db.profile.delete({ where: { userId: remove.id } });
    } else {
      await db.profile.update({ where: { userId: remove.id }, data: { userId: keep.id } });
      console.log(`Profil "${rmProfile.name}" déplacé vers #${keep.id}`);
    }
  }

  const keepCfg = await db.chatbotConfig.findUnique({ where: { userId: keep.id } });
  const rmCfg = await db.chatbotConfig.findUnique({ where: { userId: remove.id } });
  if (rmCfg) {
    if (keepCfg) {
      console.log("ChatbotConfig en doublon → supprimée (celle du compte conservé garde la main).");
      await db.chatbotConfig.delete({ where: { userId: remove.id } });
    } else {
      await db.chatbotConfig.update({ where: { userId: remove.id }, data: { userId: keep.id } });
      console.log("ChatbotConfig déplacée vers le compte conservé.");
    }
  }

  // ——— 2. Tout le contenu : ré-attribué au compte conservé ———
  const models = [
    "project", "article", "experience", "skill", "media", "service",
    "availability", "dateBlock", "appointment", "lead",
    "knowledgeChunk", "notification", "pageView", "conversation",
  ];
  for (const m of models) {
    const r = await db[m].updateMany({
      where: { authorId: remove.id },
      data: { authorId: keep.id },
    });
    if (r.count > 0) console.log(`  ${m} : ${r.count} élément(s) → auteur #${keep.id}`);
  }

  // ——— 3. Suppression du doublon (ses sessions partent en cascade) ———
  await db.user.delete({ where: { id: remove.id } });

  console.log(`\n✅ Fusion terminée : tout le contenu appartient à #${keep.id} (${keep.email}).`);
  console.log("→ Relance maintenant : node --env-file=.env scripts/resync-kb.js");
}

main()
  .catch((err) => {
    console.error("❌ Erreur fatale :", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());