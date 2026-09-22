import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/security/admin";

/** GET /api/admin/notifications — liste pour la cloche (polling 30s). */
export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const notifications = await db.notification.findMany({
    where: { authorId: guard.session.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ notifications });
}

/** POST /api/admin/notifications — marque toutes comme lues. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  await db.notification.updateMany({
    where: { authorId: guard.session.userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
