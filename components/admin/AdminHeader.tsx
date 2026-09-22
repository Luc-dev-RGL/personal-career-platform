"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: number;
  type: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Cloche de notifications avec dropdown — polling 30s (léger, suffisant). */
export function AdminHeader({ email }: { email: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      /* silencieux */
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Fermeture au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = notifications.filter((n) => !n.isRead).length;

  async function markAllRead() {
    await fetch("/api/admin/notifications", { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg/90 px-5 backdrop-blur-sm md:px-8">
      <p className="label-mono hidden sm:block">Espace d&apos;administration</p>

      <div className="flex items-center gap-3">
        {/* Cloche */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition hover:border-accent hover:text-accent"
            aria-label={`Notifications (${unread} non lues)`}
            aria-expanded={open}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 3-1.5 4.5-1.5 4.5h12s-1.5-1.5-1.5-4.5A4.5 4.5 0 008 1.5zM6.5 12.5a1.5 1.5 0 003 0"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.55rem] font-bold text-bg">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-lg border border-line bg-elevated shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <p className="label-mono !text-[0.6rem]">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-accent hover:underline">
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-faint">
                    Aucune notification pour le moment.
                  </p>
                )}
                {notifications.slice(0, 10).map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "/admin"}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-line px-4 py-3 transition last:border-0 hover:bg-surface ${
                      n.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <p className="text-xs leading-relaxed">{n.content}</p>
                    <p className="label-mono mt-1 !text-[0.55rem]">{formatDateTime(n.createdAt)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="hidden items-center gap-2 rounded-md border border-line px-3 py-1.5 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          <span className="font-mono text-[0.68rem] text-muted">{email}</span>
        </span>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-line px-3.5 py-2 text-xs text-muted transition hover:border-danger hover:text-danger"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
