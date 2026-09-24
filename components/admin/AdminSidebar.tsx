"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections: { group: string; items: { href: string; label: string; sub?: string; exact?: boolean }[] }[] = [
  { group: "Pilotage", items: [{ href: "/admin", label: "Le Foyer", sub: "Tableau de bord", exact: true }] },
  {
    group: "Contenu",
    items: [
      { href: "/admin/profile", label: "La Fiche artiste", sub: "Profil" },
      { href: "/admin/projects", label: "Les Décors", sub: "Projets" },
      { href: "/admin/experience", label: "Les Répétitions", sub: "Expériences" },
      { href: "/admin/skills", label: "Les Costumes", sub: "Compétences" },
      { href: "/admin/articles", label: "Le Livret", sub: "Articles" },
      { href: "/admin/media", label: "Les Ateliers", sub: "Médiathèque" },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/admin/leads", label: "Le Registre", sub: "Prospects · CRM" },
      { href: "/admin/calendar", label: "La Billetterie", sub: "Rendez-vous" },
      { href: "/admin/messages", label: "Les Feuilles de route", sub: "Messages" },
    ],
  },
  {
    group: "Système",
    items: [
      { href: "/admin/ai", label: "Le Souffleur", sub: "Assistant RAG" },
      { href: "/admin/analytics", label: "La Critique", sub: "Statistiques" },
      { href: "/admin/settings", label: "La Régie", sub: "Paramètres" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-elevated/50 md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
        <Link href="/admin" className="display flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent font-mono text-[0.6rem] font-bold text-bg">
            C
          </span>
          Les Coulisses
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navigation admin">
        {sections.map((section) => (
          <div key={section.group} className="mb-6">
            <p className="label-mono mb-2 px-2 !text-[0.58rem]">{section.group}</p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2 text-[0.83rem] transition",
                        active
                          ? "bg-accent-dim font-medium text-accent"
                          : "text-muted hover:bg-surface hover:text-ink"
                      )}
                    >
                      {item.label}
                      {item.sub && (
                        <span className="mt-0.5 block text-[0.62rem] font-normal text-faint">
                          {item.sub}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <Link href="/" target="_blank" className="text-xs text-faint transition hover:text-accent">
          ↗ Retour sur scène
        </Link>
      </div>
    </aside>
  );
}
