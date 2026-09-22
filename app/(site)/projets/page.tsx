import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedProjects } from "@/lib/public-data";
import { Reveal } from "@/components/Reveal";
import { Badge, EmptyState } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Projets" };
export const dynamic = "force-dynamic";

export default async function ProjetsPage() {
  const projects = await getPublishedProjects().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header>
        <p className="label-mono">Projets</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">
          Des produits réels, pas des démos<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Chaque projet ci-dessous a été conçu, développé et déployé par moi —
          architecture, données, interface et mise en production.
        </p>
      </header>

      <div className="mt-14 flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
        {projects.length === 0 && (
          <EmptyState
            title="Aucun projet publié"
            description="Les projets apparaîtront ici dès leur publication depuis l'espace d'administration."
          />
        )}
        {projects.map((project, i) => (
          <Reveal key={project.id} delay={i * 50}>
            <Link
              href={`/projets/${project.slug}`}
              className="group flex flex-col gap-3 bg-bg px-5 py-8 transition hover:bg-elevated md:flex-row md:items-center md:gap-10 md:px-8"
            >
              <span className="label-mono w-10 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <h2 className="display text-2xl font-semibold transition group-hover:text-accent">
                  {project.title}
                </h2>
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted">
                  {project.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                <p className="label-mono !text-[0.6rem]">{formatDate(project.createdAt)}</p>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {project.techTags
                    .split(",")
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((tag) => (
                      <Badge key={tag} tone="info">{tag.trim()}</Badge>
                    ))}
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
