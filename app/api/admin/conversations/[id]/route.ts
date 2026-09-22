import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { replySchema } from "@/lib/validations/schemas";

/** POST /api/admin/conversations/[id] — répond à un visiteur. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isInteger(conversationId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, authorId: guard.session.userId },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const profile = await db.profile.findUnique({ where: { userId: guard.session.userId } });

  const [message] = await db.$transaction([
    db.message.create({
      data: {
        conversationId,
        content: parsed.data.content,
        isFromVisitor: false,
        senderName: profile?.name ?? "Le candidat",
        readByAdmin: true,
      },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true, message }, { status: 201 });
}
