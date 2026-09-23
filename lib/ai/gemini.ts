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

/**
 * Les modèles Gemini récents « raisonnent » avant de répondre
 * (thinking) : ce raisonnement interne consomme le budget de tokens
 * de sortie ET 20-40 s de latence — pour un chatbot factuel c'est
 * inutile et nuisible (réponse tronquée → texte vide → fallback).
 *
 * thinkingBudget: 0 le désactive. Kill-switch sans code : définir
 * GEMINI_NO_THINKING=0 dans l'environnement si l'API renvoie un 400
 * sur ce champ (visible dans les logs [chat]).
 */
function buildGenerationConfig() {
  const config: Record<string, unknown> = {
    temperature: 0.4, // bas : réponses factuelles, peu créatives
    maxOutputTokens: 2000, // était 600 : trop juste si le modèle réfléchit
  };
  if (process.env.GEMINI_NO_THINKING !== "0") {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

/** Modèle de chat (paramétrable via GEMINI_CHAT_MODEL). */
export function getChatModel(systemInstruction: string) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_NOT_CONFIGURED");

  return ai.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
    systemInstruction,
    generationConfig: buildGenerationConfig(),
  });
}

/** Génère l'embedding d'un texte (RAG — vectorisation). */
export async function embedText(text: string): Promise<number[]> {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_NOT_CONFIGURED");

  const model = ai.getGenerativeModel({
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  });

  const result = await model.embedContent(text.slice(0, 4000));
  return result.embedding.values;
}