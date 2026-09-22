"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";

interface Config {
  assistantName: string;
  greeting: string;
  tone: string;
  extraContext: string;
  enabled: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  profile: "Profil",
  project: "Projets",
  experience: "Expériences",
  article: "Articles",
  skill: "Compétences",
  custom: "Contexte additionnel",
};

export function ChatbotConfigForm({
  config,
  geminiConfigured,
  chunkCount,
  chunkBySource,
}: {
  config: Config;
  geminiConfigured: boolean;
  chunkCount: number;
  chunkBySource: { source: string; count: number }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [enabled, setEnabled] = useState(config.enabled);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/chatbot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantName: fd.get("assistantName"),
          greeting: fd.get("greeting"),
          tone: fd.get("tone"),
          extraContext: fd.get("extraContext"),
          enabled: fd.get("enabled") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEnabled(fd.get("enabled") === "on");
      setMessage({ type: "ok", text: "Configuration enregistrée." });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  async function resync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/chatbot", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({
        type: "ok",
        text: `Base de connaissances synchronisée : ${data.chunks} passage(s) indexé(s).`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* État de la base de connaissances */}
      <section className="rounded-lg border border-line bg-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="display text-sm font-semibold">Base de connaissances</h2>
            <p className="mt-1 text-xs text-muted">
              {geminiConfigured
                ? "Pipeline RAG actif : chunking → embeddings Gemini → recherche vectorielle."
                : "Clé GEMINI_API_KEY absente du .env — le chatbot restera indisponible tant que la clé n'est pas configurée."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={geminiConfigured ? "success" : "warning"}>
              {geminiConfigured ? "Gemini configuré" : "Clé manquante"}
            </Badge>
            <Badge tone={enabled ? "accent" : "neutral"}>{enabled ? "Chatbot activé" : "Chatbot désactivé"}</Badge>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="label-mono !text-[0.6rem]">{chunkCount} passage(s) indexé(s) :</span>
          {chunkBySource.length === 0 && (
            <span className="text-xs text-faint">aucun — lancez une synchronisation après avoir configuré la clé.</span>
          )}
          {chunkBySource.map((s) => (
            <Badge key={s.source}>
              {SOURCE_LABELS[s.source] ?? s.source} : {s.count}
            </Badge>
          ))}
        </div>

        <Button type="button" variant="secondary" disabled={syncing || !geminiConfigured} onClick={resync} className="mt-5">
          {syncing ? "Synchronisation en cours…" : "Resynchroniser la base de connaissances"}
        </Button>
        {!geminiConfigured && (
          <p className="mt-2 text-xs text-faint">
            Les écritures admin (projets, articles…) resynchronisent automatiquement leurs
            sources dès que la clé est présente — ce bouton force une resynchronisation complète.
          </p>
        )}
      </section>

      {/* Configuration */}
      <form onSubmit={save} className="rounded-lg border border-line bg-elevated p-6">
        <h2 className="display mb-5 text-sm font-semibold">Personnalisation</h2>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l'assistant *" htmlFor="ai-name">
              <Input id="ai-name" name="assistantName" defaultValue={config.assistantName} required maxLength={80} />
            </Field>
            <Field label="Ton *" htmlFor="ai-tone" hint="Injecté dans le prompt système.">
              <Input id="ai-tone" name="tone" defaultValue={config.tone} maxLength={120} />
            </Field>
          </div>
          <Field label="Message d'accueil *" htmlFor="ai-greeting">
            <Input id="ai-greeting" name="greeting" defaultValue={config.greeting} required maxLength={300} />
          </Field>
          <Field
            label="Informations supplémentaires"
            htmlFor="ai-extra"
            hint="Tout ce que l'assistant doit savoir en plus (tarifs, méthodes de travail, dispo précises…)."
          >
            <Textarea id="ai-extra" name="extraContext" defaultValue={config.extraContext} rows={5} maxLength={8000} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={config.enabled}
              className="h-4 w-4 accent-[#ff6b2c]"
            />
            <span className="text-sm">Activer le chatbot sur le site public</span>
          </label>

          {message && (
            <p
              className={`rounded-md border px-4 py-2.5 text-sm ${
                message.type === "ok" ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"
              }`}
              role="status"
            >
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
