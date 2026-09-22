"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";

interface ExperienceItem {
  id: number;
  title: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string;
  details: string;
  label: string;
}

/** Gestionnaire CRUD expériences — création inline, édition via re-soumission. */
export function ExperienceManager({ experiences }: { experiences: ExperienceItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExperienceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      company: fd.get("company"),
      location: fd.get("location"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
      details: fd.get("details"),
    };

    try {
      const url = editing ? `/api/admin/experience/${editing.id}` : "/api/admin/experience";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cette expérience ?")) return;
    setBusy(true);
    await fetch(`/api/admin/experience/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-line bg-elevated p-6">
        <h2 className="display mb-5 text-sm font-semibold">
          {editing ? `Modifier — ${editing.title}` : "Ajouter une expérience"}
        </h2>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Poste *" htmlFor="exp-title">
              <Input id="exp-title" name="title" defaultValue={editing?.title ?? ""} required maxLength={160} />
            </Field>
            <Field label="Entreprise *" htmlFor="exp-company">
              <Input id="exp-company" name="company" defaultValue={editing?.company ?? ""} required maxLength={160} />
            </Field>
            <Field label="Localisation" htmlFor="exp-location">
              <Input id="exp-location" name="location" defaultValue={editing?.location ?? ""} maxLength={160} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début *" htmlFor="exp-start">
                <Input id="exp-start" name="startDate" type="month" defaultValue={editing?.startDate ?? ""} required />
              </Field>
              <Field label="Fin" htmlFor="exp-end" hint="Vide = poste actuel">
                <Input id="exp-end" name="endDate" type="month" defaultValue={editing?.endDate ?? ""} />
              </Field>
            </div>
          </div>
          <Field label="Description" htmlFor="exp-details">
            <Textarea id="exp-details" name="details" defaultValue={editing?.details ?? ""} rows={3} maxLength={4000} />
          </Field>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "…" : editing ? "Enregistrer" : "Ajouter"}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
        {experiences.length === 0 && (
          <p className="bg-bg px-5 py-10 text-center text-sm text-muted">Aucune expérience enregistrée.</p>
        )}
        {experiences.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between gap-4 bg-bg px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {exp.title} <span className="text-accent">· {exp.company}</span>
              </p>
              <p className="label-mono mt-1 !text-[0.58rem]">{exp.label}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(exp)}>
                Modifier
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(exp.id)} disabled={busy}>
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
