import Link from "next/link";

export function SiteFooter({ name }: { name: string }) {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 md:flex-row md:items-center">
        <div>
          <p className="display text-sm font-semibold">
            {name}
            <span className="text-accent">.</span>dev
          </p>
          <p className="mt-1 text-xs text-faint">
            © {new Date().getFullYear()} — Développé avec Next.js, Prisma et beaucoup de café.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Liens de pied de page">
          <Link href="/projets" className="text-xs text-muted transition hover:text-accent">
            Projets
          </Link>
          <Link href="/articles" className="text-xs text-muted transition hover:text-accent">
            Articles
          </Link>
          <Link href="/reservation" className="text-xs text-muted transition hover:text-accent">
            Réserver un appel
          </Link>
          <Link href="/contact" className="text-xs text-muted transition hover:text-accent">
            Contact
          </Link>
          <Link href="/connexion" className="text-xs text-faint transition hover:text-muted">
            Administration
          </Link>
        </nav>
      </div>
    </footer>
  );
}
