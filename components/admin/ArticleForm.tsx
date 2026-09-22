"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";

interface ArticleData {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
}

/**
 * Éditeur d'article. Les paragraphes sont séparés par une ligne vide
 * (rendu public : split sur "\n\n" — aucun HTML arbitraire n'est
 * interprété, le texte est échappé par React → anti-XSS).
 */
export function ArticleForm({ article }: { article?: ArticleData }) {
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
      excerpt: fd.get("excerpt"),
      content: fd.get("content"),
      published: publish,
    };

    try {
      const url = article ? `/api/admin/articles/${article.id}` : "/api/admin/articles";
      const res = await fetch(url, {
        method: article ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.push("/admin/articles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setBusy(false);
    }
  }

  async function remove() {
    if (!article || !confirm("Supprimer définitivement cet article ?")) return;
    setBusy(true);
    await fetch(`/api/admin/articles/${article.id}`, { method: "DELETE" }).catch(() => {});
    router.push("/admin/articles");
    router.refresh();
  }

  return (
    <form ref={formRef} className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
      <Field label="Titre *" htmlFor="a-title">
        <Input id="a-title" name="title" defaultValue={article?.title ?? ""} required maxLength={200} />
      </Field>
      <Field label="Accroche" htmlFor="a-excerpt" hint="Affichée dans les listes (150-300 caractères recommandés).">
        <Input id="a-excerpt" name="excerpt" defaultValue={article?.excerpt ?? ""} maxLength={400} />
      </Field>
      <Field
        label="Contenu *"
        htmlFor="a-content"
        hint="Séparez les paragraphes par une ligne vide. Texte brut : pas de HTML."
      >
        <Textarea id="a-content" name="content" defaultValue={article?.content ?? ""} rows={16} required maxLength={50000} />
      </Field>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => save(true)}>
          {busy ? "…" : article ? "Enregistrer & publier" : "Publier"}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => save(false)}>
          Enregistrer en brouillon
        </Button>
        {article && (
          <Button type="button" variant="danger" disabled={busy} onClick={remove} className="ml-auto">
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
