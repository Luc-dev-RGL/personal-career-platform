import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardPublicEndpoint, parseAndValidate } from "@/lib/security/request";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { getOwnerId } from "@/lib/public-data";

const replyVisitorSchema = z.object({
  conversationId: z.number().int().positive(),
  content: z.string().min(1).max(5000),
});

/**
 * POST /api/messages — réponse d'un VISITEUR dans sa conversation.
 * Le visiteur prouve l'accès par le token (passé en header X-Visitor-Token)
 * — pas de session nécessaire. Rate limité + validé.
 */
export async function POST(request: Request) {
  const guard = await guardPublicEndpoint(request, "visitor-reply", 10, 300);
  if (guard) return guard;

  const data = await parseAndValidate(request, replyVisitorSchema, 32 * 1024);
  if (!data) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const token = request.headers.get("x-visitor-token");
  if (!token) {
    return NextResponse.json({ error: "Token de suivi manquant" }, { status: 401 });
  }

  const conversation = await db.conversation.findUnique({
    where: { visitorToken: token },
  });
  if (!conversation || conversation.id !== data.conversationId) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const [message] = await db.$transaction([
    db.message.create({
      data: {
        conversationId: conversation.id,
        senderName: conversation.visitorName,
        senderEmail: conversation.visitorEmail,
        content: data.content.trim(),
        isFromVisitor: true,
      },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  if (conversation.authorId) {
    await createNotification(
      conversation.authorId,
      "message",
      `Réponse de ${conversation.visitorName ?? "un visiteur"} dans la conversation`,
      `/admin/messages/${conversation.id}`
    );
  }

  return NextResponse.json({ success: true, message }, { status: 201 });
}

/**
 * GET /api/messages?conversationId=&after= — messages nouveaux depuis
 * le curseur (polling incrémental côté visiteur). Authentifié par token.
 */
export async function GET(request: Request) {
  const guard = await guardPublicEndpoint(request, "visitor-poll", 120, 60);
  if (guard) return guard;

  const url = new URL(request.url);
  const conversationId = Number(url.searchParams.get("conversationId"));
  const after = Number(url.searchParams.get("after") ?? "0");
  const token = request.headers.get("x-visitor-token");

  if (!Number.isInteger(conversationId) || !token) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const conversation = await db.conversation.findUnique({
    where: { visitorToken: token },
  });
  if (!conversation || conversation.id !== conversationId) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const messages = await db.message.findMany({
    where: {
      conversationId,
      id: { gt: Number.isInteger(after) && after >= 0 ? after : 0 },
    },
    orderBy: { id: "asc" },
    take: 50,
  });

  return NextResponse.json({ messages });
}
