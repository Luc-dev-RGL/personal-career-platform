import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ConversationThread } from "@/components/public/ConversationThread";

export const metadata: Metadata = { title: "Suivre la conversation" };
export const dynamic = "force-dynamic";

/**
 * Suivi public d'une conversation par token opaque.
 * Le token (UUID v4) est communiqué au visiteur après son premier
 * message : il permet de relire le fil et de répondre, sans compte.
 */
export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = (await params) as { token: string };

  const conversation = await db.conversation.findUnique({
    where: { visitorToken: token },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <header className="border-b border-line pb-8">
        <p className="label-mono">Suivi de conversation</p>
        <h1 className="display mt-3 text-3xl">
          {conversation.subject ?? "Échange avec le candidat"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Cette page affiche l&apos;historique de votre échange. Conservez son
          adresse (URL) pour y revenir.
        </p>
      </header>

      <ConversationThread conversationId={conversation.id} initialMessages={conversation.messages} />
    </div>
  );
}
