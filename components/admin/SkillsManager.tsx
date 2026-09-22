"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Skill = {
  id: number;
  name: string;
  level: number;
  category: string;
  order: number;
};

const CATEGORIES = ["Technique", "Outils", "Soft skills"];

export function SkillsManager({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/admin/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          level: Number(fd.get("level")),
          category: fd.get("category"),
          order: Number(fd.get("order") ?? 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    await fetch(`/api/admin/skills/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-line bg-elevated p-6">
        <h2 className="display mb-5 text-sm font-semibold">Ajouter une compétence</h2>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <Field label="Nom *" htmlFor="skill-name">
            <Input id="skill-name" name="name" required maxLength={80} placeholder="TypeScript" />
          </Field>
          <Field label="Niveau (0-100) *" htmlFor="skill-level">
            <Input id="skill-level" name="level" type="number" min={0} max={100} defaultValue={80} required />
          </Field>
          <Field label="Catégorie" htmlFor="skill-cat">
            <Select id="skill-cat" name="category">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <input type="hidden" name="order" value={skills.length + 1} />
          <Button type="submit" disabled={busy} className="h-10">
            Ajouter
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      </section>

      <section className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
        {skills.length === 0 && (
          <p className="bg-bg px-5 py-10 text-center text-sm text-muted">Aucune compétence enregistrée.</p>
        )}
        {skills.map((skill) => (
          <div key={skill.id} className="flex items-center gap-5 bg-bg px-5 py-3.5">
            <span className="label-mono w-20 shrink-0 !text-[0.58rem]">{skill.category}</span>
            <span className="w-40 shrink-0 truncate text-sm font-medium">{skill.name}</span>
            <div className="flex-1" aria-hidden>
              <div className="h-1 w-full rounded bg-line">
                <div className={cn("h-1 rounded bg-accent")} style={{ width: `${skill.level}%` }} />
              </div>
            </div>
            <span className="font-mono text-xs text-muted">{skill.level}%</span>
            <Button size="sm" variant="danger" onClick={() => remove(skill.id)} disabled={busy}>
              ✕
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
