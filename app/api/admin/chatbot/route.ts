import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { chatbotConfigSchema } from "@/lib/validations/schemas";
import { syncAllSources } from "@/lib/ai/rag";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { invalidateChatbotConfig } from "@/lib/public-data";

/** PUT /api/admin/chatbot — enregistre la configuration du chatbot. */
export async function PUT(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = chatbotConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  await db.chatbotConfig.upsert({
    where: { userId: guard.session.userId },
    update: {
      assistantName: data.assistantName,
      greeting: data.greeting,
      tone: data.tone,
      extraContext: data.extraContext,
      enabled: data.enabled,
    },
    create: { userId: guard.session.userId, ...data },
  });

  // Le nom, le message d'accueil et le flag enabled sont affichés côté
  // public via le cache Redis → invalidation immédiate.
  await invalidateChatbotConfig();

  // Le contexte additionnel fait partie des sources RAG → resync
  if (isGeminiConfigured()) {
    await syncAllSources(guard.session.userId).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

/** POST /api/admin/chatbot — resynchronisation complète de la base RAG. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY non configurée — configurez-la dans .env puis redémarrez." },
      { status: 503 }
    );
  }

  try {
    const chunks = await syncAllSources(guard.session.userId);
    return NextResponse.json({ success: true, chunks });
  } catch (err) {
    console.error("[chatbot] sync:", err);
    return NextResponse.json({ error: "Synchronisation impossible pour le moment." }, { status: 502 });
  }
}
