import "server-only";
import { db } from "@/lib/db";

/** Crée une notification dashboard pour l'admin (nouveau message/lead/RDV). */
export async function createNotification(
  userId: number,
  type: "message" | "lead" | "appointment" | "system",
  content: string,
  link?: string
): Promise<void> {
  try {
    await db.notification.create({
      data: { authorId: userId, type, content, link },
    });
  } catch (err) {
    // une notification ratée ne doit jamais faire échouer l'action métier
    console.error("[notifications] création impossible:", err);
  }
}
