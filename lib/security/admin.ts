/**
 * Garde-fou des routes API d'administration.
 * Combine : vérification d'origine (CSRF), session serveur complète
 * (token en base) et contrôle du rôle admin (RBAC).
 */
import { NextResponse } from "next/server";
import { checkOrigin, readJsonWithLimit } from "./request";
import { requireAdmin, type SessionUser } from "@/lib/auth/session";

export type AdminGuardResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export async function guardAdmin(request: Request): Promise<AdminGuardResult> {
  if (!checkOrigin(request)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Origine non autorisée" }, { status: 403 }),
    };
  }

  const session = await requireAdmin();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    };
  }

  return { ok: true, session };
}

/** Parse le body JSON avec une limite stricte (512 Ko par défaut). */
export async function readAdminJson(request: Request): Promise<unknown | null> {
  return readJsonWithLimit(request, 512 * 1024);
}
