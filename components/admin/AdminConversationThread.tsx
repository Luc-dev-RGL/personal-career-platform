"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

interface MessageItem {
  id: number;
  content: string;
  isFromVisitor: boolean;
  senderName: string | null;
  createdAt: string;
}

/** Fil admin : rendu des messages + envoi de réponse. */
export function AdminConversationThread({
  conversationId,
  initialMessages,
}: {
  conversationId: number;
  initialMessages: MessageItem[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = reply.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, { ...data.message, createdAt: data.message.createdAt ?? new Date().toISOString() }]);
        setReply("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="py-6">
      <div className="flex flex-col gap-4" role="log">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] rounded-lg px-4 py-3 ${
              msg.isFromVisitor
                ? "self-start border border-line bg-elevated"
                : "self-end bg-accent text-bg"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            <p
              className={`mt-2 font-mono text-[0.6rem] ${
                msg.isFromVisitor ? "text-faint" : "text-bg/60"
              }`}
            >
              {msg.isFromVisitor ? (msg.senderName ?? "Visiteur") : "Vous"} ·{" "}
              {formatDateTime(msg.createdAt)}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Répondre au visiteur… (il le voit sur sa page de suivi)"
          aria-label="Votre réponse"
        />
        <Button type="submit" disabled={sending || !reply.trim()} className="self-start">
          {sending ? "Envoi…" : "Envoyer la réponse"}
        </Button>
      </form>
    </div>
  );
}
