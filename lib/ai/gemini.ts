import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Client Gemini — instancié UNIQUEMENT côté serveur.
 * La clé API ne quitte jamais le process Node : elle est lue depuis
 * l'environnement serveur et n'est jamais exposée au bundle client.
 */

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Modèle de chat (paramétrable via GEMINI_CHAT_MODEL). */
export function getChatModel(systemInstruction: string) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_NOT_CONFIGURED");

  return ai.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash",
    systemInstruction,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2000,
      // Thinking désactivé : sans cela le modèle consomme tout le budget de
      // sortie en jetons de réflexion → réponse vide → 502.
      // Kill-switch : GEMINI_NO_THINKING=0 pour réactiver le thinking.
      ...(process.env.GEMINI_NO_THINKING === "0"
        ? {}
        : { thinkingConfig: { thinkingBudget: 0 } }),
    },
  });
}

/** Génère l'embedding d'un texte (RAG — vectorisation). */
export async function embedText(text: string): Promise<number[]> {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_NOT_CONFIGURED");

  const model = ai.getGenerativeModel({
    model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
  });

  const result = await model.embedContent(text.slice(0, 4000));
  return result.embedding.values;
}
