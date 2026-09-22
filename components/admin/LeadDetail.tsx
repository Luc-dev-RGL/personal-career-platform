"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { LEAD_STAGE_LABELS, formatDateTime } from "@/lib/utils";

interface LeadDetailProps {
  lead: { id: number; stage: string; value: number | null };
  notes: { id: number; content: string; createdAt: string }[];
  events: { id: number; type: string; content: string; createdAt: string }[];
}

const STAGES = ["new", "contacted", "discussion", "proposal", "won", "lost"];

/** Détail prospect : étape, valeur, notes (timeline d'événements). */
export function LeadDetail({ lead, notes, events }: LeadDetailProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(lead.stage);
  const [value, setValue] = useState(lead.value?.toString() ?? "");

  async function update(payload: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    router.refresh();
    setBusy(false);
  }

  async function addNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = (fd.get("content") as string)?.trim();
    if (!content) return;
    setBusy(true);
    await fetch(`/api/admin/leads/${lead.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => {});
    (e.target as HTMLFormElement).reset();
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {/* Panneau : étape + valeur */}
      <section className="rounded-lg border border-line bg-elevated p-5">
        <h2 className="display mb-4 text-sm font-semibold">Suivi</h2>
        <label className="label-mono !text-[0.6rem]" htmlFor="lead-stage">Étape du pipeline</label>
        <select
          id="lead-stage"
          value={stage}
          onChange={(e) => {
            setStage(e.target.value);
            void update({ stage: e.target.value });
          }}
          className="mt-1.5 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>
          ))}
        </select>

        <label className="label-mono mt-4 !text-[0.6rem]" htmlFor="lead-value">Valeur estimée (€)</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="lead-value"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          />
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => update({ value: value === "" ? null : Number(value) })}
          >
            OK
          </Button>
        </div>

        {/* Timeline événements */}
        <h3 className="display mt-6 mb-3 text-sm font-semibold">Historique</h3>
        <ul className="flex flex-col gap-2.5">
          {events.map((ev) => (
            <li key={ev.id} className="flex gap-3 text-xs">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <div>
                <p className="text-muted">{ev.content}</p>
                <p className="label-mono !text-[0.52rem] mt-0.5">{formatDateTime(ev.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Panneau : notes */}
      <section className="rounded-lg border border-line bg-elevated p-5">
        <h2 className="display mb-4 text-sm font-semibold">Notes ({notes.length})</h2>
        <form onSubmit={addNote} className="flex flex-col gap-2.5">
          <Textarea name="content" rows={3} maxLength={2000} placeholder="Compte-rendu d'appel, contexte…" required />
          <Button type="submit" size="sm" disabled={busy} className="self-start">
            Ajouter la note
          </Button>
        </form>
        <ul className="mt-5 flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-line bg-surface px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
              <p className="label-mono mt-1.5 !text-[0.52rem]">{formatDateTime(note.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
