/**
 * Couche d'accès aux données publiques du portfolio.
 * Toutes les lectures passent par le cache Redis (cache-aside, TTL 60s).
 * Les écritures admin invalident les groupes correspondants.
 */
import "server-only";
import { db } from "@/lib/db";
import { cached, delCache, delCachePattern } from "@/lib/cache";

/** L'ID du propriétaire de la plateforme (compte admin). */
export async function getOwnerId(): Promise<number> {
  return cached("cache:owner", async () => {
    const admin = await db.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    });
    if (!admin) throw new Error("Aucun compte administrateur configuré");
    return admin.id;
  });
}

export async function getProfile() {
  return cached("cache:profile", async () => {
    const owner = await getOwnerId();
    return db.profile.findUnique({ where: { userId: owner } });
  });
}

export async function getPublishedProjects(limit?: number) {
  return cached(`cache:projects:list:${limit ?? "all"}`, async () => {
    const owner = await getOwnerId();
    return db.project.findMany({
      where: { authorId: owner, status: "published" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        link: true,
        techTags: true,
        createdAt: true,
      },
    });
  });
}

export async function getProjectBySlug(slug: string) {
  return cached(`cache:projects:item:${slug}`, async () => {
    const owner = await getOwnerId();
    return db.project.findFirst({
      where: { authorId: owner, slug, status: "published" },
      include: { media: true },
    });
  });
}

export async function getPublishedArticles(limit?: number) {
  return cached(`cache:articles:list:${limit ?? "all"}`, async () => {
    const owner = await getOwnerId();
    return db.article.findMany({
      where: { authorId: owner, published: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        createdAt: true,
      },
    });
  });
}

export async function getArticleBySlug(slug: string) {
  return cached(`cache:articles:item:${slug}`, async () => {
    const owner = await getOwnerId();
    return db.article.findFirst({
      where: { authorId: owner, slug, published: true },
    });
  });
}

export async function getSkills() {
  return cached("cache:skills", async () => {
    const owner = await getOwnerId();
    return db.skill.findMany({
      where: { authorId: owner },
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });
  });
}

export async function getExperiences() {
  return cached("cache:experiences", async () => {
    const owner = await getOwnerId();
    return db.experience.findMany({
      where: { authorId: owner },
      orderBy: { startDate: "desc" },
    });
  });
}

/**
 * Configuration publique du chatbot (nom affiché, message d'accueil, activation).
 * Retourne null si jamais configurée — le widget applique alors ses valeurs
 * par défaut. Cachée 60s : la sauvegarde admin invalide la clé.
 */
export async function getPublicChatbotConfig() {
  return cached("cache:chatbot", async () => {
    const owner = await getOwnerId();
    return db.chatbotConfig.findUnique({
      where: { userId: owner },
      select: { assistantName: true, greeting: true, enabled: true },
    });
  });
}

export async function invalidateChatbotConfig(): Promise<void> {
  await delCache("cache:chatbot");
}

export async function getActiveServices() {
  return cached("cache:services", async () => {
    const owner = await getOwnerId();
    return db.service.findMany({
      where: { authorId: owner, active: true },
      orderBy: { duration: "asc" },
    });
  });
}

// ————— Invalidation (appelée par les écritures admin) —————

export async function invalidateProjects(): Promise<void> {
  await delCachePattern("cache:projects:");
  await delCachePattern("cache:knowledge:"); // la base de connaissances RAG dépend des projets
}

export async function invalidateArticles(): Promise<void> {
  await delCachePattern("cache:articles:");
  await delCachePattern("cache:knowledge:");
}

export async function invalidateProfile(): Promise<void> {
  await delCache("cache:profile", "cache:owner");
  await delCachePattern("cache:knowledge:");
}

export async function invalidateSkills(): Promise<void> {
  await delCache("cache:skills");
  await delCachePattern("cache:knowledge:");
}

export async function invalidateExperiences(): Promise<void> {
  await delCache("cache:experiences");
  await delCachePattern("cache:knowledge:");
}

export async function invalidateServices(): Promise<void> {
  await delCache("cache:services");
}
