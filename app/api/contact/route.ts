import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardPublicEndpoint, parseAndValidate } from "@/lib/security/request";
import { contactSchema } from "@/lib/validations/schemas";
import { getOwnerId } from "@/lib/public-data";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/contact — endpoint public.
 *
 * Pipeline métier (conforme au sujet) : un message sérieux crée
 * automatiquement 1) une conversation suivie par le visiteur (token
 * opaque), 2) un prospect dans le CRM (étape "new"), 3) une notification.
 *
 * Sécurité : origine vérifiée (CSRF), rate limiting 5 req/10 min/IP,
 * payload ≤ 32 Ko, validation Zod stricte, honeypot anti-bot.
 */
export async function POST(request: Request) {
  const guard = await guardPublicEndpoint(request, "contact", 5, 600);
  if (guard) return guard;

  const data = await parseAndValidate(request, contactSchema, 32 * 1024);
  if (!data) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Honeypot rempli → robot : réponse neutre, rien n'est stocké
  if (data.website) {
    return NextResponse.json({ success: true });
  }

  const ownerId = await getOwnerId();
  const name = data.name.trim();
  const message = data.message.trim();

  // Transaction : conversation + 1er message + lead + event + notification
  const result = await db.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        subject: `Prise de contact — ${name}`,
        visitorName: name,
        visitorEmail: data.email,
        authorId: ownerId,
      },
    });

    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderName: name,
        senderEmail: data.email,
        content: message,
        isFromVisitor: true,
      },
    });

    const lead = await tx.lead.create({
      data: {
        name,
        company: data.company || null,
        email: data.email,
        source: "contact_form",
        message,
        authorId: ownerId,
      },
    });

    await tx.leadEvent.create({
      data: { leadId: lead.id, type: "created", content: "Prospect créé via le formulaire de contact" },
    });

    return { conversation, lead };
  });

  await createNotification(
    ownerId,
    "message",
    `Nouveau message de ${name}${data.company ? ` (${data.company})` : ""}`,
    "/admin/messages"
  );
  await createNotification(
    ownerId,
    "lead",
    `Nouveau prospect : ${name}`,
    "/admin/leads"
  );

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.json(
    {
      success: true,
      leadId: result.lead.id,
      followUpUrl: `${baseUrl}/messages/${result.conversation.visitorToken}`,
    },
    { status: 201 }
  );
}
