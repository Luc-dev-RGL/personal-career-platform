import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const session = await requireAdmin();
  const conversations = await db.conversation.findMany({
    where: { authorId: session!.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="label-mono">Business</p>
        <h1 className="display mt-2 text-3xl">Messages</h1>
      </header>

      <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
        {conversations.length === 0 && (
          <p className="bg-bg px-5 py-12 text-center text-sm text-muted">
            Aucune conversation — les messages du formulaire de contact arrivent ici.
          </p>
        )}
        {conversations.map((conv) => {
          const last = conv.messages[0];
          return (
            <Link
              key={conv.id}
              href={`/admin/messages/${conv.id}`}
              className="flex items-center justify-between gap-4 bg-bg px-5 py-4 transition hover:bg-elevated"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {conv.visitorName ?? "Visiteur"}
                  {conv.subject && <span className="font-normal text-muted"> — {conv.subject}</span>}
                </p>
                {last && (
                  <p className="truncate text-xs text-muted">
                    {last.isFromVisitor ? "" : "Vous : "}
                    {last.content}
                  </p>
                )}
              </div>
              <span className="label-mono shrink-0 !text-[0.58rem]">
                {formatDateTime(conv.updatedAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
