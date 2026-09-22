"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

interface ThreadMessage {
  id: number;
  content: string;
  isFromVisitor: boolean;
  senderName: string | null;
  createdAt: string | Date;
}

/**
 * Fil de conversation côté visiteur avec polling incrémental.
 * Choix technique (justifié dans ARCHITECTURE.md) : polling intelligent
 * avec curseur (dernier id connu) toutes les 5 s — fiable sur Vercel
 * serverless, contrairement aux WebSockets qui exigent un serveur dédié.
 */
export function ConversationThread({
  conversationId,
  initialMessages,
}: {
  conversationId: number;
  initialMessages: ThreadMessage[];
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Polling incrémental : ne renvoie que les messages postérieurs au dernier connu
  useEffect(() => {
    const interval = setInterval(async () => {
      const lastId = messages.length > 0 ? Math.max(...messages.map((m) => m.id)) : 0;
      try {
        const res = await fetch(
          `/api/messages?conversationId=${conversationId}&after=${lastId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages?.length > 0) {
          setMessages((prev) => [...prev, ...data.messages]);
        }
      } catch {
        /* silencieux : le prochain tick réessaiera */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [conversationId, messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const content = reply.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReply("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="py-8">
      <div className="flex flex-col gap-4" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] rounded-lg px-4 py-3",
              msg.isFromVisitor
                ? "self-end bg-accent text-bg"
                : "self-start border border-line bg-elevated"
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            <p
              className={cn(
                "mt-2 font-mono text-[0.6rem]",
                msg.isFromVisitor ? "text-bg/60" : "text-faint"
              )}
            >
              {msg.isFromVisitor ? "Vous" : (msg.senderName ?? "Le candidat")} ·{" "}
              {formatDateTime(msg.createdAt)}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendReply} className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Écrire une réponse…"
          aria-label="Votre réponse"
        />
        <Button type="submit" disabled={sending || !reply.trim()} className="self-start">
          {sending ? "Envoi…" : "Répondre"}
        </Button>
      </form>
    </div>
  );
}
