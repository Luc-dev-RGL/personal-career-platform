import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { changePasswordSchema } from "@/lib/validations/schemas";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * POST /api/admin/password — changement de mot de passe.
 * Révoque toutes les AUTRES sessions de l'utilisateur (bonne pratique :
 * un vol de session ne survit pas à un changement de mot de passe),
 * la session courante reste active.
 */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Mot de passe trop faible (10+ caractères, majuscule, minuscule, chiffre)",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: guard.session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const valid = await verifyPassword(parsed.data.current, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
  }

  // Hash de la session courante (à préserver)
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const currentHash = token ? createHash("sha256").update(token).digest("hex") : null;

  // Transaction : rotation du hash + purge des autres sessions
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(parsed.data.next) },
    }),
    db.session.deleteMany({
      where: currentHash
        ? { userId: user.id, NOT: { tokenHash: currentHash } }
        : { userId: user.id },
    }),
  ]);

  return NextResponse.json({ success: true });
}
