import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getPublishedProjects } from "@/lib/public-data";
import { Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = (await params) as { slug: string };
  const project = await getProjectBySlug(slug).catch(() => null);
  if (!project) return { title: "Projet introuvable" };
  return { title: project.title, description: project.description };
}

export default async function ProjetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = (await params) as { slug: string };
  const project = await getProjectBySlug(slug).catch(() => null);
  if (!project) notFound();

  const others = (await getPublishedProjects().catch(() => []))
    .filter((p) => p.slug !== slug)
    .slice(0, 2);

  return (
    <article className="mx-auto max-w-4xl px-5 py-16">
      <Link href="/projets" className="text-sm text-muted transition hover:text-accent">
        ← Tous les projets
      </Link>

      <header className="mt-8 border-b border-line pb-10">
        <p className="label-mono">{formatDate(project.createdAt)}</p>
        <h1 className="display mt-4 text-4xl leading-tight md:text-5xl">{project.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{project.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {project.techTags
            .split(",")
            .filter(Boolean)
            .map((tag) => (
              <Badge key={tag} tone="info">
                {tag.trim()}
              </Badge>
            ))}
        </div>
        {(project.link || project.repoUrl) && (
          <div className="mt-8 flex gap-3">
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-semibold text-bg transition hover:bg-accent-hover"
              >
                Voir le projet ↗
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md border border-line-strong px-5 text-sm transition hover:border-accent hover:text-accent"
              >
                Code source ↗
              </a>
            )}
          </div>
        )}
      </header>

      {/* Contenu long : rendu paragraphe par paragraphe — React échappe
          automatiquement le texte (protection XSS native). */}
      <div className="py-10">
        {project.content
          .split("\n\n")
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i} className="mb-5 leading-[1.8] text-ink/90">
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
                href={`/projets/${other.slug}`}
                className="group rounded-lg border border-line px-5 py-4 transition hover:border-accent"
              >
                <h3 className="display font-semibold transition group-hover:text-accent">
                  {other.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-sm text-muted">{other.description}</p>
              </Link>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}
