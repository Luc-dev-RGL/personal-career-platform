import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Client Gemini â€” instanciÃ© UNIQUEMENT cÃ´tÃ© serveur.
 * La clÃ© API ne quitte jamais le process Node : elle est lue depuis
 * l'environnement serveur et n'est jamais exposÃ©e au bundle client.
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

/** ModÃ¨le de chat (paramÃ©trable via GEMINI_CHAT_MODEL). */
export function getChatModel(systemInstruction: string) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_NOT_CONFIGURED");

  return ai.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
    systemInstruction,
    generationConfig: {
      temperature: 0.4, // bas : rÃ©ponses factuelles, peu crÃ©atives
      maxOutputTokens: 600,
    },
  });
}

/** GÃ©nÃ¨re l'embedding d'un texte (RAG â€” vectorisation). */
export async function embedText(text: string): Promise<number[]> {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_NOT_CONFIGURED");

  const model = ai.getGenerativeModel({
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  });

  const result = await model.embedContent(text.slice(0, 4000));
  return result.embedding.values;
}
