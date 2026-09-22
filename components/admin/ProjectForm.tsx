"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";

interface ProjectData {
  id: number;
  title: string;
  description: string;
  content: string;
  imageUrl: string | null;
  link: string | null;
  repoUrl: string | null;
  techTags: string;
  status: string;
}

export function ProjectForm({ projet }: { projet?: ProjectData }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(publish: boolean) {
    if (!formRef.current || busy) return;
    setBusy(true);
    setError(null);

    const fd = new FormData(formRef.current);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      content: fd.get("content"),
      imageUrl: fd.get("imageUrl"),
      link: fd.get("link"),
      repoUrl: fd.get("repoUrl"),
      techTags: fd.get("techTags"),
      status: publish ? "published" : "draft",
    };

    try {
      const url = projet ? `/api/admin/projects/${projet.id}` : "/api/admin/projects";
      const res = await fetch(url, {
        method: projet ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.push("/admin/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setBusy(false);
    }
  }

  async function remove() {
    if (!projet || !confirm("Supprimer définitivement ce projet ?")) return;
    setBusy(true);
    await fetch(`/api/admin/projects/${projet.id}`, { method: "DELETE" }).catch(() => {});
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <form ref={formRef} className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
      <Field label="Titre *" htmlFor="pr-title">
        <Input id="pr-title" name="title" defaultValue={projet?.title ?? ""} required maxLength={160} />
      </Field>
      <Field
        label="Description courte *"
        htmlFor="pr-desc"
        hint="1 à 2 phrases, affichée dans les listes et injectée dans le chatbot."
      >
        <Input id="pr-desc" name="description" defaultValue={projet?.description ?? ""} required maxLength={600} />
      </Field>
      <Field label="Présentation détaillée" htmlFor="pr-content" hint="Paragraphes séparés par une ligne vide.">
        <Textarea id="pr-content" name="content" defaultValue={projet?.content ?? ""} rows={8} maxLength={20000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Image (URL)" htmlFor="pr-image" hint="Uploadez via la Médiathèque puis collez l'URL.">
          <Input id="pr-image" name="imageUrl" defaultValue={projet?.imageUrl ?? ""} />
        </Field>
        <Field label="Technologies" htmlFor="pr-tags" hint="Séparées par des virgules.">
          <Input id="pr-tags" name="techTags" defaultValue={projet?.techTags ?? ""} placeholder="Next.js, Prisma, Neon" />
        </Field>
        <Field label="Lien public" htmlFor="pr-link">
          <Input id="pr-link" name="link" defaultValue={projet?.link ?? ""} placeholder="https://…" />
        </Field>
        <Field label="Dépôt source" htmlFor="pr-repo">
          <Input id="pr-repo" name="repoUrl" defaultValue={projet?.repoUrl ?? ""} placeholder="https://github.com/…" />
        </Field>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => save(true)}>
          {busy ? "…" : projet ? "Enregistrer & publier" : "Publier"}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => save(false)}>
          Enregistrer en brouillon
        </Button>
        {projet && (
          <Button type="button" variant="danger" disabled={busy} onClick={remove} className="ml-auto">
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
