/**
 * Authentification maison : sessions serveur en base de données.
 *
 * Fonctionnement (à défendre à l'oral) :
 * 1. Au login, le serveur génère un token aléatoire de 32 octets
 *    (256 bits d'entropie, crypto. — jamais prévisible).
 * 2. Le token est envoyé au navigateur dans un cookie httpOnly,
 *    Secure (en prod), SameSite=Lax → inaccessible au JavaScript
 *    (protection XSS) et non envoyé sur les requêtes cross-site
 *    (réduction CSRF).
 * 3. Seul le hash SHA-256 du token est stocké en base : si la base
 *    fuit, les tokens ne sont pas réutilisables (comme pour les
 *    mots de passe).
 * 4. Chaque requête protégée résout la session en base : expiration
 *    vérifiée, révocation immédiate possible (logout, invalidation).
 * 5. Rôle porté par l'utilisateur en base (RBAC) : un cookie
 *    modifié ne peut pas conférer un rôle — la source de vérité
 *    est la table users.
 */
import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "pcp_session";
const SESSION_TTL_DAYS = 7;

export interface SessionUser {
  userId: number;
  email: string;
  role: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crée une session en base et pose le cookie de session. */
export async function createSession(userId: number, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent },
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Résout la session courante depuis le cookie → vérification serveur
 * complète (token en base + expiration + utilisateur existant).
 * Retourne null si aucune session valide.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // nettoyage paresseux de la session expirée
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { userId: session.user.id, email: session.user.email, role: session.user.role };
}

/** Exige une session admin (RBAC serveur) — sinon null. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

/** Détruit la session courante (logout) : suppression base + cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}
