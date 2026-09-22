/**
 * Client Redis (ioredis) avec dégradation gracieuse.
 *
 * En production (Vercel + Upstash) : REDIS_URL est défini → toutes les
 * fonctionnalités Redis sont actives (cache, rate limiting centralisé).
 *
 * En développement local sans Redis : fallback sur un cache mémoire
 * par instance. Le comportement applicatif est identique, seule la
 * portée change (processus vs réseau). Ce choix permet de développer
 * sans infrastructure tout en gardant le même code applicatif.
 */
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
  memoryFallback: Map<string, { value: string; expiresAt: number }>;
};

export const memoryFallback =
  globalForRedis.memoryFallback ?? (globalForRedis.memoryFallback = new Map());

function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn(
      "[redis] REDIS_URL non défini — fallback cache mémoire (dev uniquement)"
    );
    globalForRedis.redis = null;
    return null;
  }

  try {
    globalForRedis.redis = new Redis(url, {
      // Upstash exige TLS ("rediss://" déjà présent dans l'URL)
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      enableOfflineQueue: false,
    });
    globalForRedis.redis.on("error", (err) => {
      console.error("[redis] erreur:", err.message);
    });
  } catch (err) {
    console.error("[redis] connexion impossible, fallback mémoire:", err);
    globalForRedis.redis = null;
  }

  return globalForRedis.redis;
}

/** GET avec fallback mémoire */
export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      return await redis.get(key);
    } catch {
      /* retombe sur la mémoire */
    }
  }
  const entry = memoryFallback.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryFallback.delete(key);
    return null;
  }
  return entry.value;
}

/** SET avec TTL (secondes) et fallback mémoire */
export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      if (ttlSeconds) await redis.set(key, value, "EX", ttlSeconds);
      else await redis.set(key, value);
      return;
    } catch {
      /* retombe sur la mémoire */
    }
  }
  memoryFallback.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity,
  });
}

/** INCR avec expiration (rate limiting) — retourne le compteur */
export async function redisIncr(key: string, ttlSeconds: number): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, ttlSeconds);
      return count;
    } catch {
      /* retombe sur la mémoire */
    }
  }
  const current = await redisGet(key);
  const count = (current ? parseInt(current, 10) : 0) + 1;
  await redisSet(key, String(count), ttlSeconds);
  return count;
}

/** DEL (invalidation de cache) — supprime la clé exacte + un préfixe */
export async function redisDel(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(...keys);
    } catch {
      /* ignore */
    }
  }
  for (const key of keys) memoryFallback.delete(key);
}

/** Supprime toutes les clés correspondant à un motif (invalidation par tag) */
export async function redisDelPattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    } catch {
      /* ignore */
    }
  }
  for (const key of memoryFallback.keys()) {
    if (key.startsWith(pattern.replace("*", ""))) memoryFallback.delete(key);
  }
}
