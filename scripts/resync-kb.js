/**
 * RESYNCHRONISATION DE LA BASE DE CONNAISSANCES RAG (KnowledgeChunk)
 * =================================================================
 *
 * Pourquoi ce script existe :
 * - le seed initial ne remplit PAS la base de connaissances du chatbot ;
 * - la resync via l'admin (POST /api/admin/chatbot) tourne en serverless
 *   Vercel (risque de timeout pendant les appels d'embedding).
 * Ce script tourne EN LOCAL (aucune limite de temps, logs visibles) sur
 * la MÊME base Neon → la production en profite immédiatement.
 *
 * Il fait deux choses :
 *   1. DIAGNOSTIC : users, projets (id/slug/statut/auteur), articles,
 *      état actuel des KnowledgeChunk (nb + dimensions des vecteurs).
 *   2. RESYNC : purge complète puis re-vectorisation de TOUT le contenu
 *      publié avec le modèle d'embedding actuel (.env).
 *
 * Usage (depuis la racine du projet) :
 *   node --env-file=.env scripts/resync-kb.js
 */

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY absente du .env — impossible de vectoriser.");
  process.exit(1);
}

// ————— Même algorithme de chunking que lib/ai/rag.ts —————
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];

  const chunks = [];
  let cursor = 0;
  while (cursor < clean.length) {
    const end = Math.min(cursor + CHUNK_SIZE, clean.length);
    let boundary = end;
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > cursor + CHUNK_SIZE / 2) boundary = lastSpace;
    }
    chunks.push(clean.slice(cursor, boundary).trim());
    if (end >= clean.length) break;
    cursor = boundary - CHUNK_OVERLAP;
  }
  return chunks.filter(Boolean);
}

// ————— Embedding via l'API REST Gemini (identique à embedText) —————
async function embedText(text) {
  const url = `${API_BASE}/${MODEL}:embedContent?key=${API_KEY}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 4000) }] } }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.embedding || !Array.isArray(data.embedding.values)) {
          throw new Error("Réponse inattendue : " + JSON.stringify(data).slice(0, 200));
        }
        return data.embedding.values;
      }
      const body = await res.text();
      if (attempt === 3) throw new Error(`HTTP ${res.status} : ${body.slice(0, 300)}`);
      console.warn(`  ⚠️ embed HTTP ${res.status}, nouvelle tentative (${attempt}/2)…`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    } catch (err) {
      if (attempt === 3) throw err;
      console.warn(`  ⚠️ ${err.message}, nouvelle tentative (${attempt}/2)…`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const dateFr = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

// ————— Mêmes sources que lib/ai/rag.ts (buildSource) —————
async function buildSources(ownerId) {
  const sources = [];

  const p = await db.profile.findUnique({ where: { userId: ownerId } });
  if (p && (p.bio || p.headline)) {
    sources.push({
      source: "profile",
      sourceId: p.id,
      content:
        `Profil de ${p.name}. Titre : ${p.headline}. Bio : ${p.bio}. ` +
        `Localisation : ${p.location ?? "non précisée"}. ` +
        (p.availability
          ? "Actuellement disponible pour de nouvelles opportunités."
          : "Non disponible actuellement."),
    });
  }

  const projects = await db.project.findMany({ where: { authorId: ownerId } });
  for (const pr of projects) {
    sources.push({
      source: "project",
      sourceId: pr.id,
      content:
        `Projet « ${pr.title} » [statut : ${pr.status}]. Description : ${pr.description}. ` +
        `Détails : ${pr.content}. Technologies : ${pr.techTags.replace(/,/g, ", ")}.`,
    });
  }

  const exps = await db.experience.findMany({ where: { authorId: ownerId } });
  for (const e of exps) {
    const end = e.endDate ? dateFr(e.endDate) : "aujourd'hui";
    sources.push({
      source: "experience",
      sourceId: e.id,
      content:
        `Expérience : ${e.title} chez ${e.company} (de ${dateFr(e.startDate)} à ${end}). ${e.details ?? ""}`,
    });
  }

  const arts = await db.article.findMany({ where: { authorId: ownerId } });
  for (const a of arts) {
    sources.push({
      source: "article",
      sourceId: a.id,
      content: a.published
        ? `Article publié « ${a.title} ». ${a.excerpt} Contenu : ${a.content}`
        : `Article (brouillon) « ${a.title} ».`,
    });
  }

  const cfg = await db.chatbotConfig.findUnique({ where: { userId: ownerId } });
  if (cfg && cfg.extraContext && cfg.extraContext.trim()) {
    sources.push({
      source: "custom",
      sourceId: 0,
      content: `Informations supplémentaires : ${cfg.extraContext}`,
    });
  }

  const skills = await db.skill.findMany({
    where: { authorId: ownerId },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
  if (skills.length) {
    const grouped = new Map();
    for (const s of skills) {
      const list = grouped.get(s.category) ?? [];
      list.push(`${s.name} (${s.level}%)`);
      grouped.set(s.category, list);
    }
    sources.push({
      source: "skill",
      sourceId: 0,
      content:
        [...grouped.entries()].map(([c, items]) => `Compétences ${c} : ${items.join(", ")}.`).join(" "),
    });
  }

  return sources;
}

async function main() {
  console.log("═══════════════ 1. DIAGNOSTIC ═══════════════");

  const users = await db.user.findMany({ select: { id: true, email: true, role: true } });
  console.log(`Users (${users.length}) :`);
  for (const u of users) console.log(`  #${u.id} ${u.email} [${u.role}]`);
  if (users.filter((u) => u.role === "admin").length > 1) {
    console.log("  ⚠️ PLUSIEURS admins ! L'app utilise le premier trouvé (findFirst).");
  }

  const projects = await db.project.findMany({
    select: { id: true, slug: true, status: true, authorId: true },
    orderBy: { id: "asc" },
  });
  console.log(`\nProjets (${projects.length}) :`);
  for (const pr of projects) console.log(`  #${pr.id} "${pr.slug}" statut=${pr.status} auteur=#${pr.authorId}`);

  const articles = await db.article.findMany({
    select: { id: true, slug: true, published: true, authorId: true },
    orderBy: { id: "asc" },
  });
  console.log(`\nArticles (${articles.length}) :`);
  for (const a of articles) console.log(`  #${a.id} "${a.slug}" published=${a.published} auteur=#${a.authorId}`);

  const before = await db.knowledgeChunk.findMany({ select: { source: true, embedding: true } });
  const dimsSample = before.slice(0, 3).map((c) => JSON.parse(c.embedding).length);
  console.log(`\nKnowledgeChunk AVANT : ${before.length} chunk(s)`);
  if (before.length) {
    const per = {};
    for (const c of before) per[c.source] = (per[c.source] ?? 0) + 1;
    for (const [k, v] of Object.entries(per)) console.log(`  - ${k} : ${v}`);
    console.log(`  dimensions des vecteurs (échantillon) : [${dimsSample.join(", ")}]`);
  } else {
    console.log("  ⚠️ BASE DE CONNAISSANCES VIDE → le chatbot répond toujours le fallback. C'est confirmé.");
  }

  console.log("\n═══════════════ 2. RESYNCHRONISATION ═══════════════");
  const admin = await db.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("Aucun compte admin en base.");
  console.log(`Owner retenu : #${admin.id} (${admin.email}) — modèle : ${MODEL}`);

  await db.knowledgeChunk.deleteMany({ where: { authorId: admin.id } });
  console.log("Purge effectuée.");

  const sources = await buildSources(admin.id);
  let stored = 0;
  let failed = 0;
  let index = 0;

  for (const src of sources) {
    const chunks = chunkText(src.content);
    for (const chunk of chunks) {
      index++;
      try {
        const embedding = await embedText(chunk);
        await db.knowledgeChunk.create({
          data: {
            authorId: admin.id,
            source: src.source,
            sourceId: src.sourceId,
            content: chunk,
            embedding: JSON.stringify(embedding),
          },
        });
        stored++;
        console.log(`  [${index}] ${src.source}#${src.sourceId} ✓ (${embedding.length} dims)`);
      } catch (err) {
        failed++;
        console.error(`  [${index}] ${src.source}#${src.sourceId} ✗ ERREUR : ${err.message}`);
      }
    }
  }

  const after = await db.knowledgeChunk.count({ where: { authorId: admin.id } });
  console.log("\n═══════════════ 3. RÉSULTAT ═══════════════");
  console.log(`Chunks stockés : ${stored} | échecs : ${failed} | total en base : ${after}`);
  if (failed > 0) {
    console.log("⚠️ Des chunks ont échoué — relance le script (il repart de zéro proprement).");
  } else if (after > 0) {
    console.log("✅ Base de connaissances reconstruite. Le chatbot en prod l'utilise directement.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Erreur fatale :", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());