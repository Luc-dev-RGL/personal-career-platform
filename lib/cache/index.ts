/**
 * Cache de lectures (Redis) avec invalidation explicite.
 *
 * Stratégie : les données publiques du portfolio changent rarement
 * mais sont lues très souvent → cache-aside avec TTL court.
 * Toute écriture admin invalide les clés de lecture associées
 * (delCache des groupes) — pas de stalence au-delà du TTL.
 */
import { redisGet, redisSet, redisDel, redisDelPattern } from "@/lib/redis/client";

export const CACHE_GROUPS = {
  profile: "cache:profile",
  projects: "cache:projects:*",
  articles: "cache:articles:*",
  skills: "cache:skills",
  experiences: "cache:experiences",
  services: "cache:services",
} as const;

const TTL = 60; // secondes

export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlS = TTL): Promise<void> {
  await redisSet(key, JSON.stringify(value), ttlS);
}

/** Cache-aside : renvoie la donnée en cache, sinon exécute le loader. */
export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = await getCache<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await setCache(key, value);
  return value;
}

export async function delCache(...keys: string[]): Promise<void> {
  if (keys.length) await redisDel(...keys);
}

export async function delCachePattern(pattern: string): Promise<void> {
  await redisDelPattern(pattern);
}
