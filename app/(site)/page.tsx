import Link from "next/link";
import {
  getProfile,
  getPublishedProjects,
  getPublishedArticles,
  getSkills,
  getExperiences,
} from "@/lib/public-data";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profile, projects, articles, skills, experiences] = await Promise.all([
    getProfile().catch(() => null),
    getPublishedProjects(3).catch(() => []),
    getPublishedArticles(2).catch(() => []),
    getSkills().catch(() => []),
    getExperiences().catch(() => []),
  ]);

  const name = profile?.name ?? "Luc";
  const headline = profile?.headline ?? "Développeur Full-Stack";
  const featuredSkills = skills.filter((s) => s.category === "Technique").slice(0, 6);
  const latestExperience = experiences[0];

  return (
    <>
      {/* ————————— HERO : composition éditoriale, asymétrique ————————— */}
      <section className="bg-grid border-b border-line">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="flex items-center gap-2.5">
            <span className="label-mono">{headline}</span>
            {profile?.availability && (
              <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                <span className="label-mono !text-[0.6rem] text-ink">Disponible</span>
              </span>
            )}
          </div>

          <h1 className="display mt-8 max-w-3xl text-[2.6rem] leading-[1.05] sm:text-6xl md:text-[4.2rem]">
            Je conçois des produits web
            <br />
            qui tiennent la charge
            <span className="text-accent">.</span>
          </h1>

          <p className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-muted">
            {profile?.bio ??
              "Développeur full-stack : architecture, base de données, API, interface, déploiement. Du premier wireframe au monitoring en production."}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/projets"
              className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-sm font-semibold text-bg transition hover:bg-accent-hover"
            >
              Voir mes projets
            </Link>
            <Link
              href="/reservation"
              className="inline-flex h-11 items-center rounded-md border border-line-strong px-6 text-sm text-ink transition hover:border-accent hover:text-accent"
            >
              Réserver un appel →
            </Link>
          </div>

          {/* Métadonnées en colonnes — style fiche technique */}
          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            {[
              { label: "Poste actuel", value: latestExperience?.title ?? headline },
              { label: "Localisation", value: profile?.location ?? "France · Remote" },
              {
                label: "Stack principale",
                value: featuredSkills[0]?.name ?? "TypeScript",
              },
              { label: "Articles publiés", value: String(articles.length > 0 ? articles.length : "—") },
            ].map((item) => (
              <div key={item.label} className="bg-bg px-5 py-4">
                <dt className="label-mono !text-[0.6rem]">{item.label}</dt>
                <dd className="display mt-1.5 truncate text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ————————— 01 · PROJETS ————————— */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <h2 className="display text-3xl md:text-4xl">
              <span className="mr-3 font-mono text-sm text-accent">01</span>
              Sélection de projets
            </h2>
            <Link href="/projets" className="shrink-0 text-sm text-muted transition hover:text-accent">
              Tous les projets →
            </Link>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
          {projects.length === 0 && (
            <p className="bg-bg px-5 py-12 text-center text-sm text-muted">
              Les premiers projets arrivent bientôt.
            </p>
          )}
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={i * 60}>
              <Link
                href={`/projets/${project.slug}`}
                className="group flex flex-col gap-3 bg-bg px-5 py-7 transition hover:bg-elevated md:flex-row md:items-center md:gap-8 md:px-8"
              >
                <span className="label-mono w-10 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="display text-xl font-semibold transition group-hover:text-accent md:text-2xl">
                    {project.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted">
                    {project.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5 md:w-52 md:justify-end">
                  {project.techTags
                    .split(",")
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((tag) => (
                      <Badge key={tag} tone="info">{tag.trim()}</Badge>
                    ))}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ————————— 02 · PARCOURS ————————— */}
      {experiences.length > 0 && (
        <section className="border-y border-line bg-elevated/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <Reveal>
              <h2 className="display text-3xl md:text-4xl">
                <span className="mr-3 font-mono text-sm text-info">02</span>
                Parcours
              </h2>
            </Reveal>
            <div className="mt-10">
              {experiences.slice(0, 3).map((exp, i) => (
                <Reveal key={exp.id} delay={i * 60}>
                  <div className="flex flex-col gap-1.5 border-b border-line py-6 first:pt-0 last:border-0 md:flex-row md:gap-10">
                    <span className="label-mono w-44 shrink-0 pt-1">
                      {formatDate(exp.startDate, { month: "short", year: "numeric" })}
                      {" — "}
                      {exp.endDate
                        ? formatDate(exp.endDate, { month: "short", year: "numeric" })
                        : "aujourd'hui"}
                    </span>
                    <div>
                      <h3 className="display text-lg font-semibold">{exp.title}</h3>
                      <p className="mt-0.5 text-sm text-accent">{exp.company}</p>
                      {exp.details && (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                          {exp.details}
                        </p>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ————————— 03 · COMPÉTENCES ————————— */}
      {featuredSkills.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <h2 className="display text-3xl md:text-4xl">
              <span className="mr-3 font-mono text-sm text-success">03</span>
              Ce avec quoi je travaille
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {featuredSkills.map((skill, i) => (
              <Reveal key={skill.id} delay={i * 40}>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="label-mono !text-[0.6rem]">{skill.level}%</span>
                  </div>
                  <div className="mt-2 h-px w-full bg-line" role="presentation">
                    <div
                      className="h-px bg-accent transition-all duration-700"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ————————— 04 · ÉCRITS ————————— */}
      {articles.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <Reveal>
              <div className="flex items-end justify-between gap-6">
                <h2 className="display text-3xl md:text-4xl">
                  <span className="mr-3 font-mono text-sm text-warning">04</span>
                  Derniers écrits
                </h2>
                <Link href="/articles" className="shrink-0 text-sm text-muted transition hover:text-accent">
                  Tous les articles →
                </Link>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {articles.map((article, i) => (
                <Reveal key={article.id} delay={i * 60}>
                  <Link href={`/articles/${article.slug}`} className="group block">
                    <p className="label-mono">{formatDate(article.createdAt)}</p>
                    <h3 className="display mt-3 text-2xl font-semibold leading-snug transition group-hover:text-accent">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                      {article.excerpt}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ————————— CTA FINAL ————————— */}
      <section className="border-t border-line bg-elevated/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center">
          <Reveal>
            <div>
              <h2 className="display text-3xl md:text-4xl">Un projet en tête ?</h2>
              <p className="mt-3 max-w-md text-muted">
                Réservez un appel de présentation de 30 minutes, gratuit et sans engagement —
                ou écrivez-moi directement.
              </p>
            </div>
          </Reveal>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/reservation"
              className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-sm font-semibold text-bg transition hover:bg-accent-hover"
            >
              Réserver un créneau
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-md border border-line-strong px-6 text-sm transition hover:border-accent hover:text-accent"
            >
              Écrire un message
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
