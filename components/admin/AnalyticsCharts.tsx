"use client";

import { useState } from "react";

interface DailyPoint {
  date: string;
  count: number;
}

/**
 * Graphiques analytics en SVG/CSS pur — zéro dépendance, zéro JS lourd.
 * (Server Component : ce tableau n'a pas besoin d'hydratation.)
 */
export function AnalyticsCharts({
  total30d,
  daily,
  topPaths,
  referrers,
}: {
  total30d: number;
  daily: DailyPoint[];
  topPaths: { path: string; count: number }[];
  referrers: { referrer: string; count: number }[];
}) {
  const max = Math.max(1, ...daily.map((d) => d.count));

  return (
    <div className="flex flex-col gap-8">
      {/* Total + histogramme 30 jours */}
      <section className="rounded-lg border border-line bg-elevated p-6">
        <p className="label-mono !text-[0.6rem]">Visites — 30 derniers jours</p>
        <p className="display mt-1 text-4xl font-semibold">{total30d}</p>
        <div className="mt-6 flex h-28 items-end gap-[3px]" role="img" aria-label="Visites par jour sur 30 jours">
          {daily.map((d) => (
            <div key={d.date} className="group relative flex-1" title={`${d.date} : ${d.count} visite(s)`}>
              <div
                className="w-full rounded-t bg-accent/70 transition group-hover:bg-accent"
                style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.55rem] text-faint">
          <span>{daily[0]?.date.slice(5)}</span>
          <span>{daily[daily.length - 1]?.date.slice(5)}</span>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pages les plus vues */}
        <section className="rounded-lg border border-line bg-elevated p-6">
          <h2 className="display mb-4 text-sm font-semibold">Pages les plus visitées</h2>
          {topPaths.length === 0 ? (
            <p className="text-xs text-faint">Aucune donnée pour le moment.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {topPaths.map((p) => {
                const pct = Math.round((p.count / Math.max(1, topPaths[0].count)) * 100);
                return (
                  <li key={p.path} className="flex items-center gap-3 text-xs">
                    <span className="w-36 truncate font-mono text-muted">{p.path}</span>
                    <div className="h-1 flex-1 rounded bg-line">
                      <div className="h-1 rounded bg-info" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-faint">{p.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sources de trafic */}
        <section className="rounded-lg border border-line bg-elevated p-6">
          <h2 className="display mb-4 text-sm font-semibold">Sources de trafic</h2>
          {referrers.length === 0 ? (
            <p className="text-xs text-faint">Aucun référent externe — trafic direct.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {referrers.map((r) => {
                const pct = Math.round((r.count / Math.max(1, referrers[0].count)) * 100);
                return (
                  <li key={r.referrer} className="flex items-center gap-3 text-xs">
                    <span className="w-36 truncate font-mono text-muted">{r.referrer}</span>
                    <div className="h-1 flex-1 rounded bg-line">
                      <div className="h-1 rounded bg-success" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-faint">{r.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
