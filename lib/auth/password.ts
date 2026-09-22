import bcrypt from "bcryptjs";

/** Hash un mot de passe avec bcrypt (cost 12 — ~250ms, robuste 2025). */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** Vérifie un mot de passe contre son hash bcrypt. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
