import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export interface SessionUser {
  userId: number;
  email: string;
  role: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}