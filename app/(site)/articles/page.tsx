import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/public-data";
import { Reveal } from "@/components/Reveal";
import { EmptyState } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await getPublishedArticles().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <header>
        <p className="label-mono">Articles</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">
          Notes de terrain<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Ce que j'apprends en construisant des applications : architecture,
          choix techniques, erreurs et solutions.
        </p>
      </header>

      <div className="mt-14 flex flex-col">
        {articles.length === 0 && (
          <EmptyState
            title="Aucun article publié"
            description="Les articles publiés depuis l'espace d'administration apparaîtront ici."
          />
        )}
        {articles.map((article, i) => (
          <Reveal key={article.id} delay={i * 40}>
            <Link
              href={`/articles/${article.slug}`}
              className="group block border-b border-line py-9 first:border-t"
            >
              <div className="flex items-baseline justify-between gap-6">
                <p className="label-mono shrink-0">{formatDate(article.createdAt)}</p>
                <span className="font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h2 className="display mt-3 text-2xl font-semibold leading-snug transition group-hover:text-accent md:text-3xl">
                {article.title}
              </h2>
              {article.excerpt && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                  {article.excerpt}
                </p>
              )}
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
