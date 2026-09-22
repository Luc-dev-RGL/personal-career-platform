"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/projets", label: "Projets" },
  { href: "/articles", label: "Articles" },
  { href: "/reservation", label: "Réserver" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Accueil">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold text-bg">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="display text-[0.95rem] font-semibold tracking-tight">
            {name}
            <span className="text-accent">.</span>dev
          </span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "link-underline text-sm transition",
                pathname === link.href ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bouton mobile */}
        <button
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md border border-line md:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Menu"
        >
          <span className={cn("h-px w-4 bg-ink transition", open && "translate-y-[3.5px] rotate-45")} />
          <span className={cn("h-px w-4 bg-ink transition", open && "-translate-y-[3.5px] -rotate-45")} />
        </button>
      </div>

      {/* Navigation mobile */}
      {open && (
        <nav className="border-t border-line bg-bg px-5 py-4 md:hidden" aria-label="Navigation mobile">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm transition",
                    pathname === link.href
                      ? "bg-accent-dim text-accent"
                      : "text-muted hover:bg-elevated hover:text-ink"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
