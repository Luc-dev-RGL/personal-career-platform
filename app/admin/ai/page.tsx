import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { ChatbotConfigForm } from "@/components/admin/ChatbotConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const session = await requireAdmin();
  const [config, chunkCount] = await Promise.all([
    db.chatbotConfig.upsert({
      where: { userId: session!.userId },
      update: {},
      create: { userId: session!.userId },
    }),
    db.knowledgeChunk.count({ where: { authorId: session!.userId } }),
  ]);

  const chunkBySource = await db.knowledgeChunk.groupBy({
    by: ["source"],
    where: { authorId: session!.userId },
    _count: { id: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Système</p>
        <h1 className="display mt-2 text-3xl">Le Souffleur</h1>
        <p className="mt-2 text-sm text-muted">
          L&apos;assistant murmure uniquement ce que contient votre portfolio :
          chaque source ci-dessous est découpée, vectorisée (Gemini) puis
          recherchée par similarité à chaque question. Rien n&apos;est inventé —
          un bon souffleur n&apos;improvise pas.
        </p>
      </header>

      <ChatbotConfigForm
        config={{
          assistantName: config.assistantName,
          greeting: config.greeting,
          tone: config.tone,
          extraContext: config.extraContext,
          enabled: config.enabled,
        }}
        geminiConfigured={isGeminiConfigured()}
        chunkCount={chunkCount}
        chunkBySource={chunkBySource.map((c) => ({ source: c.source, count: c._count.id }))}
      />
    </div>
  );
}
