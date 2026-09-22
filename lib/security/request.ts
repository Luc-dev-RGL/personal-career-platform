/**
 * Utilitaires de sécurité pour les routes API.
 * - Vérification d'origine (protection CSRF sur les endpoints publics POST)
 * - Limitation de taille de payload
 * - Réponses d'erreur propres (jamais de stack trace côté client)
 */
import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { getClientIp, rateLimit } from "./rate-limit";

/**
 * Protection CSRF : sur un endpoint public, on refuse toute requête
 * dont l'origine ne correspond pas au host servi. Les navigateurs
 * envoient Origin sur les requêtes POST cross-site — un formulaire
 * forcé depuis un site malveillant est donc rejeté.
 *
 * Derrière un proxy/gateway, l'en-tête Host vu par l'app peut différer
 * de l'origine publique : on compare donc Origin à une liste d'hôtes
 * de confiance (Host + X-Forwarded-Host + PREVIEW_ORIGIN éventuel).
 */
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Clients non navigateurs (curl, tests) : autorisés, le contenu
    // reste validé par Zod de toute façon.
    return true;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  // Hôtes de référence : Host direct + X-Forwarded-Host (chaîne de proxies).
  const trusted = new Set<string>();
  const host = request.headers.get("host");
  if (host) trusted.add(host.toLowerCase());
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    for (const part of forwarded.split(",")) {
      const h = part.trim().toLowerCase();
      if (h) trusted.add(h);
    }
  }
  // Domaine de preview explicitement autorisé (déploiement sandbox).
  const previewOrigin = process.env.PREVIEW_ORIGIN;
  if (previewOrigin) {
    for (const part of previewOrigin.split(",")) {
      const h = part.trim().toLowerCase();
      if (h) trusted.add(h);
    }
  }
  if (trusted.has(originHost)) return true;

  // Sandbox de preview de la plateforme : on n'accepte le suffixe
  // *.space-z.ai que hors production (le déploiement réel sert son
  // propre domaine, où le contrôle standard Origin === Host s'applique).
  if (
    process.env.NODE_ENV !== "production" &&
    originHost.endsWith(".space-z.ai")
  ) {
    return true;
  }
  return false;
}

/** Limite la taille du corps de requête (défaut : 256 Ko). */
export async function readJsonWithLimit(
  request: Request,
  maxBytes = 256 * 1024
): Promise<unknown | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maxBytes) return null;

  const text = await request.text();
  if (text.length > maxBytes) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Parse + valide un payload JSON avec Zod. Retourne null si invalide. */
export async function parseAndValidate<T>(
  request: Request,
  schema: ZodSchema<T>,
  maxBytes?: number
): Promise<T | null> {
  const body = await readJsonWithLimit(request, maxBytes);
  if (body === null) return null;
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Garde-fou complet d'un endpoint public :
 * origine + rate limiting par IP. Retourne une NextResponse d'erreur
 * si la requête doit être rejetée, sinon null.
 */
export async function guardPublicEndpoint(
  request: Request,
  actionName: string,
  limit: number,
  windowS: number
): Promise<NextResponse | null> {
  if (!checkOrigin(request)) {
    return jsonError("Origine non autorisée", 403);
  }
  const ip = getClientIp(request.headers);
  const rl = await rateLimit(`${actionName}:${ip}`, limit, windowS);
  if (!rl.allowed) {
    return jsonError("Trop de requêtes, réessayez plus tard", 429, {
      retryAfter: rl.retryAfterSeconds,
    });
  }
  return null;
}
