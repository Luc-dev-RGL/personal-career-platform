import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { ArticleForm } from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId)) notFound();

  const session = await requireAdmin();
  const article = await db.article.findFirst({
    where: { id: articleId, authorId: session!.userId },
  });
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Modifier l&apos;article</h1>
      </header>
      <ArticleForm article={article} />
    </div>
  );
}
