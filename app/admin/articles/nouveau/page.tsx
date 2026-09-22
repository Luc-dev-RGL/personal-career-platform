import { ArticleForm } from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";

export default function NouvelArticlePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Nouvel article</h1>
      </header>
      <ArticleForm />
    </div>
  );
}
