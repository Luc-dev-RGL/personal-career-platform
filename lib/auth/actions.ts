"use server";

/**
 * Server Actions d'authentification.
 *
 * Sécurité :
 * - Rate limiting Redis sur le login (anti brute-force) : 5 tentatives
 *   par IP et par tranche de 5 minutes.
 * - Message d'erreur volontairement générique ("identifiants
 *   incorrects") : pas de divulgation de l'existence d'un compte.
 * - Vérification du rôle admin : un compte non-admin ne peut pas
 *   ouvrir une session d'administration.
 * - Les Server Actions Next.js vérifient déjà l'origine de la requête
 *   (protection CSRF intégrée).
 */
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Email invalide").max(200),
  password: z.string().min(1, "Mot de passe requis").max(200),
});

export interface LoginState {
  error: string | null;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Vérifiez votre email et votre mot de passe." };
  }

  // Anti brute-force : 5 tentatives / 5 min / IP
  const hdrs = await headers();
  const ip =
    hdrs.get("x-real-ip") ??
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const rl = await rateLimit(`login:${ip}`, 5, 300);
  if (!rl.allowed) {
    return {
      error: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
    };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });

  if (!user) {
    return { error: "Identifiants incorrects." };
  }

  const valid = await verifyPassword(parsed.data.password, user.password);
  if (!valid) {
    return { error: "Identifiants incorrects." };
  }

  if (user.role !== "admin") {
    return { error: "Accès réservé à l'administration." };
  }

  await createSession(user.id, hdrs.get("user-agent") ?? undefined);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/connexion");
}
