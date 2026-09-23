"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Widget chatbot flottant â€” interroge /api/chat (RAG Gemini cÃ´tÃ© serveur).
 * L'historique est conservÃ© cÃ´tÃ© client (max 20 messages) : aucun Ã©tat
 * sensible cÃ´tÃ© serveur, rate limiting par IP sur l'endpoint.
 */
export function ChatWidget({ assistantName }: { assistantName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de l'assistant");
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de l'assistant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant IA"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition",
          open ? "bg-elevated border border-line text-ink" : "bg-accent text-bg hover:bg-accent-hover"
        )}
        style={{ height: 52, width: 52 }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
            <path
              d="M11 2C5.9 2 2 5.5 2 9.8c0 2.4 1.2 4.5 3.1 6L4.5 20l4-2.1c.8.2 1.6.3 2.5.3 5.1 0 9-3.5 9-7.8S16.1 2 11 2z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>

      {/* Panneau */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[480px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-line bg-elevated shadow-2xl">
          <div className="border-b border-line px-4 py-3">
            <p className="display text-sm font-semibold">{assistantName}</p>
            <p className="label-mono !text-[0.58rem] mt-0.5">
              RÃ©pond Ã  partir des donnÃ©es publiques
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-lg border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-muted">
                Bonjour ! Je peux rÃ©pondre Ã  vos questions sur mon parcours, mes
                projets et mes compÃ©tences â€” uniquement Ã  partir des donnÃ©es
                publiÃ©es sur ce site.
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-accent text-bg"
                    : "border border-line bg-surface text-ink"
                )}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="flex gap-1.5 px-2" aria-label="L'assistant rÃ©dige une rÃ©ponse">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre questionâ€¦"
              maxLength={2000}
              aria-label="Votre message pour l'assistant"
              className="h-9 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-accent px-3.5 text-sm font-semibold text-bg transition hover:bg-accent-hover disabled:opacity-40"
            >
              â†’
            </button>
          </form>
        </div>
      )}
    </>
  );
}
