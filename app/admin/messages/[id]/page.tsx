import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { AdminConversationThread } from "@/components/admin/AdminConversationThread";

export const dynamic = "force-dynamic";

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isInteger(conversationId)) notFound();

  const session = await requireAdmin();
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, authorId: session!.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) notFound();

  // Marquer les messages du visiteur comme lus (sémantique "boîte de réception")
  await db.message.updateMany({
    where: { conversationId, isFromVisitor: true, readByAdmin: false },
    data: { readByAdmin: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/messages" className="text-sm text-muted transition hover:text-accent">
        ← Messages
      </Link>

      <header className="mt-5 border-b border-line pb-6">
        <p className="label-mono">{conversation.visitorEmail ?? "Visiteur"}</p>
        <h1 className="display mt-2 text-2xl">{conversation.subject ?? "Conversation"}</h1>
      </header>

      <AdminConversationThread
        conversationId={conversation.id}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          content: m.content,
          isFromVisitor: m.isFromVisitor,
          senderName: m.senderName,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
