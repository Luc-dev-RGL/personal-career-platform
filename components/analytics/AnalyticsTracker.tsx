"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Tracking de fréquentation (analytics first-party).
 * - Un identifiant visiteur anonyme est stocké en localStorage
 *   (aucun cookie tiers, aucune donnée personnelle).
 * - Un ping est envoyé par changement de page, dédupliqué 30s.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const lastTime = useRef(0);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const now = Date.now();
    if (pathname === lastPath.current && now - lastTime.current < 30_000) return;
    lastPath.current = pathname;
    lastTime.current = now;

    let visitorId = localStorage.getItem("pcp_visitor");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("pcp_visitor", visitorId);
    }

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, visitorId }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
