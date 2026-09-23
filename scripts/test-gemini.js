const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = process.env.GEMINI_API_KEY;
console.log("1) Cle       :", key ? key.slice(0, 6) + "..." + key.slice(-4) + " (" + key.length + " car.)" : "ABSENTE");
if (!key) process.exit(1);

const ai = new GoogleGenerativeAI(key);

async function main() {
  try {
    const m = ai.getGenerativeModel({ model: process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash" });
    const r = await m.generateContent("Reponds exactement : OK");
    console.log("2) Chat      : OK ->", r.response.text().trim().slice(0, 50));
  } catch (e) {
    console.error("2) Chat      : ECHEC ->", e.message.slice(0, 300));
  }
  try {
    const m = ai.getGenerativeModel({ model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004" });
    const r = await m.embedContent("test");
    console.log("3) Embedding : OK -> vecteur de", r.embedding.values.length, "dimensions");
  } catch (e) {
    console.error("3) Embedding : ECHEC ->", e.message.slice(0, 300));
  }
}
main();
