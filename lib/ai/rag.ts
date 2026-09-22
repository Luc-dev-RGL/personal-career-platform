/**
 * PIPELINE RAG (Retrieval-Augmented Generation) — cœur du chatbot.
 *
 * 1. SOURCES      : le contenu réel du portfolio (profil, projets,
 *                   expériences, compétences, articles, config extra).
 * 2. CHUNKING     : chaque source est découpée en passages ~800 chars
 *                   avec chevauchement 100 chars (respecte la cohérence).
 * 3. EMBEDDING    : chaque passage est vectorisé via Gemini
 *                   (text-embedding-004) — clé serveur uniquement.
 * 4. STOCKAGE     : KnowledgeChunk (embedding sérialisé en JSON).
 * 5. RETRIEVAL    : à chaque question, la question est vectorisée puis
 *                   comparée (similarité cosinus) à tous les chunks —
 *                   top-k au-dessus d'un seuil de pertinence.
 * 6. GÉNÉRATION   : le prompt système VERROUILLÉ + le contexte récupéré
 *                   sont envoyés à Gemini. En l'absence d'information
 *                   pertinente, le modèle est forcé de le dire.
 *
 * Synchronisation : syncSource() est appelée après chaque écriture
 * admin (create/update/delete) — la base de connaissances reflète
 * toujours le contenu publié.
 */
import "server-only";
import { db } from "@/lib/db";
import { embedText, isGeminiConfigured } from "./gemini";

// ————————————————— CHUNKING —————————————————

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < clean.length) {
    const end = Math.min(cursor + CHUNK_SIZE, clean.length);
    // découpe propre : ne coupe pas au milieu d'un mot
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

// ————————————————— CONSTRUCTION DES SOURCES —————————————————

interface SourceContent {
  source: string;
  sourceId: number;
  content: string;
}

/** Reconstruit le texte brut d'une source du portfolio. */
async function buildSource(ownerId: number, source: string, sourceId: number): Promise<SourceContent | null> {
  switch (source) {
    case "profile": {
      const p = await db.profile.findFirst({ where: { id: sourceId, userId: ownerId } });
      if (!p) return null;
      return {
        source,
        sourceId,
        content: `Profil de ${p.name}. Titre : ${p.headline}. Bio : ${p.bio}. Localisation : ${p.location ?? "non précisée"}. ${
          p.availability ? "Actuellement disponible pour de nouvelles opportunités." : "Non disponible actuellement."
        }`,
      };
    }
    case "project": {
      const p = await db.project.findFirst({ where: { id: sourceId, authorId: ownerId } });
      if (!p) return null;
      return {
        source,
        sourceId,
        content: `Projet « ${p.title} » [statut : ${p.status}]. Description : ${p.description}. Détails : ${p.content}. Technologies : ${p.techTags.replace(/,/g, ", ")}.`,
      };
    }
    case "experience": {
      const e = await db.experience.findFirst({ where: { id: sourceId, authorId: ownerId } });
      if (!e) return null;
      const end = e.endDate ? e.endDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "aujourd'hui";
      return {
        source,
        sourceId,
        content: `Expérience : ${e.title} chez ${e.company} (de ${e.startDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} à ${end}). ${e.details ?? ""}`,
      };
    }
    case "article": {
      const a = await db.article.findFirst({ where: { id: sourceId, authorId: ownerId } });
      if (!a) return null;
      return {
        source,
        sourceId,
        content: a.published
          ? `Article publié « ${a.title} ». ${a.excerpt} Contenu : ${a.content}`
          : `Article (brouillon) « ${a.title} ».`,
      };
    }
    case "custom": {
      const cfg = await db.chatbotConfig.findFirst({ where: { userId: ownerId } });
      if (!cfg) return null;
      return { source, sourceId, content: `Informations supplémentaires : ${cfg.extraContext}` };
    }
    case "skill": {
      // source collective : les compétences en une seule entrée (sourceId = 0)
      return await buildSkillsSource(ownerId);
    }
    default:
      return null;
  }
}

/** Compétences : source collective (sourceId = 0). */
async function buildSkillsSource(ownerId: number): Promise<SourceContent> {
  const skills = await db.skill.findMany({
    where: { authorId: ownerId },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
  const grouped = new Map<string, string[]>();
  for (const s of skills) {
    const list = grouped.get(s.category) ?? [];
    list.push(`${s.name} (${s.level}%)`);
    grouped.set(s.category, list);
  }
  const text = [...grouped.entries()]
    .map(([cat, items]) => `Compétences ${cat} : ${items.join(", ")}.`)
    .join(" ");
  return { source: "skill", sourceId: 0, content: text };
}

/** Compétences : source collective (sourceId = 0) — API dédiée. */
export async function syncSkillList(ownerId: number): Promise<void> {
  await syncSource(ownerId, "skill", 0);
}

// ————————————————— SYNCHRONISATION —————————————————

/** Vectorise et stocke les chunks d'une source (remplace l'existant). */
export async function syncSource(ownerId: number, source: string, sourceId: number): Promise<void> {
  // Suppression de l'ancien état de la source (create, update OU delete)
  await db.knowledgeChunk.deleteMany({
    where: { authorId: ownerId, source, sourceId },
  });

  if (!isGeminiConfigured()) return; // configuration différée : le contenu se resynchronise à la première clé disponible

  const built =
    source === "skill"
      ? sourceId === 0
        ? await buildSkillsSource(ownerId)
        : null
      : await buildSource(ownerId, source, sourceId);
  if (!built || !built.content.trim()) return;

  await storeChunks(ownerId, built);
}

/** Resynchronise TOUTE la base de connaissances (bouton admin). */
export async function syncAllSources(ownerId: number): Promise<number> {
  if (!isGeminiConfigured()) throw new Error("GEMINI_NOT_CONFIGURED");

  // purge complète
  await db.knowledgeChunk.deleteMany({ where: { authorId: ownerId } });

  const jobs: Array<[string, number]> = [];

  const profile = await db.profile.findUnique({ where: { userId: ownerId } });
  if (profile) jobs.push(["profile", profile.id]);

  const [projects, experiences, articles] = await Promise.all([
    db.project.findMany({ where: { authorId: ownerId }, select: { id: true } }),
    db.experience.findMany({ where: { authorId: ownerId }, select: { id: true } }),
    db.article.findMany({ where: { authorId: ownerId }, select: { id: true } }),
  ]);
  for (const p of projects) jobs.push(["project", p.id]);
  for (const e of experiences) jobs.push(["experience", e.id]);
  for (const a of articles) jobs.push(["article", a.id]);
  jobs.push(["custom", 0]);

  let count = 0;
  for (const [source, sourceId] of jobs) {
    const built =
      source === "custom"
        ? ((await db.chatbotConfig.findFirst({ where: { userId: ownerId } }))
            ? { source, sourceId: 0, content: `Informations supplémentaires : ${
                (await db.chatbotConfig.findFirst({ where: { userId: ownerId } }))!.extraContext
              }` }
            : null)
        : await buildSource(ownerId, source, sourceId);
    if (built?.content.trim()) {
      count += await storeChunks(ownerId, built);
    }
  }

  // compétences (source collective)
  const skills = await buildSkillsSource(ownerId);
  if (skills.content.trim()) count += await storeChunks(ownerId, skills);

  return count;
}

/** Découpe, vectorise et stocke une source. Retourne le nb de chunks. */
async function storeChunks(ownerId: number, src: SourceContent): Promise<number> {
  const chunks = chunkText(src.content);
  let stored = 0;

  for (const chunk of chunks) {
    try {
      const embedding = await embedText(chunk);
      await db.knowledgeChunk.create({
        data: {
          authorId: ownerId,
          source: src.source,
          sourceId: src.sourceId,
          content: chunk,
          embedding: JSON.stringify(embedding),
        },
      });
      stored++;
    } catch (err) {
      console.error("[rag] embedding d'un chunk impossible:", err);
    }
  }
  return stored;
}

// ————————————————— RETRIEVAL —————————————————

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface RetrievedContext {
  passages: string[];
  bestScore: number;
}

/**
 * Recherche vectorielle : top-k des passages les plus pertinents.
 * Le volume de chunks d'un portfolio reste modéré (quelques centaines
 * max) : la comparaison cosinus en mémoire est rapide et sans
 * infrastructure supplémentaire (pgvector documenté comme évolution).
 */
export async function retrieveContext(ownerId: number, question: string, topK = 5): Promise<RetrievedContext> {
  const chunks = await db.knowledgeChunk.findMany({
    where: { authorId: ownerId },
    select: { content: true, embedding: true },
  });
  if (chunks.length === 0) return { passages: [], bestScore: 0 };

  const questionEmbedding = await embedText(question);

  const scored = chunks.map((c) => ({
    content: c.content,
    score: cosineSimilarity(questionEmbedding, JSON.parse(c.embedding) as number[]),
  }));

  scored.sort((a, b) => b.score - a.score);

  const SEUIL = 0.55; // en dessous : considéré comme non pertinent
  const passages = scored
    .filter((s) => s.score >= SEUIL)
    .slice(0, topK)
    .map((s) => s.content);

  return { passages, bestScore: scored[0]?.score ?? 0 };
}
