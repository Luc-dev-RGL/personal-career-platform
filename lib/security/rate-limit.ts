/**
 * Rate limiting applicatif (protection brute-force, spam, abus IA).
 *
 * Principe : compteur INCR + expiration TTL dans Redis, clé composée
 * d'un identifiant d'action et de l'IP du client (dérivée des headers
 * proxy standards de Vercel). Le fallback mémoire offre le même
 * comportement en développement local sans Redis.
 */
import { redisIncr } from "@/lib/redis/client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Vérifie et incrémente le compteur de requêtes.
 * @param key      identifiant unique de la limite (ex: "login:1.2.3.4")
 * @param limit    nombre de requêtes autorisées sur la fenêtre
 * @param windowS  fenêtre en secondes
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowS: number
): Promise<RateLimitResult> {
  const count = await redisIncr(`rl:${key}`, windowS);
  if (count === 1) {
    // première requête de la fenêtre
    return { allowed: count <= limit, remaining: limit - 1, retryAfterSeconds: windowS };
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: windowS,
  };
}

/** Extrait l'IP client depuis les headers proxy (Vercel) ou la requête. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "inconnue"
  );
}
