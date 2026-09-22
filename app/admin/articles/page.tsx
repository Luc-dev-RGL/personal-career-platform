import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const session = await requireAdmin();
  const articles = await db.article.findMany({
    where: { authorId: session!.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="label-mono">Contenu</p>
          <h1 className="display mt-2 text-3xl">Articles</h1>
        </div>
        <Link
          href="/admin/articles/nouveau"
          className="inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-semibold text-bg transition hover:bg-accent-hover"
        >
          + Nouvel article
        </Link>
      </header>

      <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
        {articles.length === 0 && (
          <p className="bg-bg px-5 py-12 text-center text-sm text-muted">
            Aucun article — créez le premier.
          </p>
        )}
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/admin/articles/${article.id}`}
            className="flex items-center justify-between gap-4 bg-bg px-5 py-4 transition hover:bg-elevated"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{article.title}</p>
              <p className="label-mono mt-1 !text-[0.58rem]">{formatDate(article.createdAt)}</p>
            </div>
            <Badge tone={article.published ? "success" : "neutral"}>
              {article.published ? "Publié" : "Brouillon"}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
