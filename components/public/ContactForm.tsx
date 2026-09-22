"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";

/**
 * Formulaire de contact public.
 * - Champ "website" invisible (honeypot anti-bot : les robots le
 *   remplissent, les humains ne le voient pas).
 * - La validation serveur (Zod + rate limiting) reste la source
 *   de vérité ; ici la validation est un confort utilisateur.
 */
export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [followUpUrl, setFollowUpUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      message: formData.get("message"),
      website: formData.get("website"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Envoi impossible");
      setStatus("sent");
      if (data.followUpUrl) setFollowUpUrl(data.followUpUrl);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-accent/40 bg-accent-dim px-7 py-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg text-bg">
          ✓
        </span>
        <h2 className="display text-xl font-semibold">Message bien reçu</h2>
        <p className="text-sm leading-relaxed text-muted">
          Merci, votre message a été transmis. Conservez le lien ci-dessous :
          il vous permet de suivre la conversation et de répondre directement.
        </p>
        {followUpUrl && (
          <a
            href={followUpUrl}
            className="break-all rounded-md border border-accent/40 bg-bg px-3.5 py-2 font-mono text-xs text-accent"
          >
            {followUpUrl}
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Honeypot anti-bot — caché des humains via aria-hidden + CSS */}
      <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet *" htmlFor="contact-name">
          <Input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" />
        </Field>
        <Field label="Email *" htmlFor="contact-email">
          <Input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" />
        </Field>
      </div>

      <Field label="Société (optionnel)" htmlFor="contact-company">
        <Input id="contact-company" name="company" maxLength={160} autoComplete="organization" />
      </Field>

      <Field
        label="Votre message *"
        htmlFor="contact-message"
        hint="Contexte, objectifs, échéances — tout ce qui aide à répondre utilement."
      >
        <Textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={6} />
      </Field>

      {status === "error" && error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={sending} className="self-start">
        {sending ? "Envoi en cours…" : "Envoyer le message"}
      </Button>
    </form>
  );
}
