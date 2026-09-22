import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getPublishedArticles } from "@/lib/public-data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = (await params) as { slug: string };
  const article = await getArticleBySlug(slug).catch(() => null);
  if (!article) return { title: "Article introuvable" };
  return { title: article.title, description: article.excerpt };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = (await params) as { slug: string };
  const article = await getArticleBySlug(slug).catch(() => null);
  if (!article) notFound();

  const others = (await getPublishedArticles(4).catch(() => []))
    .filter((a) => a.slug !== slug)
    .slice(0, 2);

  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/articles" className="text-sm text-muted transition hover:text-accent">
        ← Tous les articles
      </Link>

      <header className="mt-8 border-b border-line pb-10">
        <p className="label-mono">{formatDate(article.createdAt)}</p>
        <h1 className="display mt-4 text-4xl leading-tight md:text-[2.9rem]">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="mt-5 text-lg leading-relaxed text-muted">{article.excerpt}</p>
        )}
      </header>

      <div className="py-10">
        {article.content
          .split("\n\n")
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i} className="mb-5 leading-[1.85] text-ink/90">
              {paragraph}
            </p>
          ))}
      </div>

      {others.length > 0 && (
        <footer className="border-t border-line pt-10">
          <p className="label-mono">À lire ensuite</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {others.map((other) => (
              <Link
                key={other.id}
                href={`/articles/${other.slug}`}
                className="group rounded-lg border border-line px-5 py-4 transition hover:border-accent"
              >
                <h3 className="display font-semibold transition group-hover:text-accent">
                  {other.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-sm text-muted">{other.excerpt}</p>
              </Link>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}
