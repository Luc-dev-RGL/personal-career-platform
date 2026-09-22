import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await requireAdmin();
  const ownerId = session!.userId;
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [views30d, topPaths, referrers, daily] = await Promise.all([
    db.pageView.count({ where: { authorId: ownerId, createdAt: { gte: since } } }),
    db.pageView.groupBy({
      by: ["path"],
      where: { authorId: ownerId, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    db.pageView.groupBy({
      by: ["referrer"],
      where: { authorId: ownerId, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      // Pré-agrégation large : les URLs seront fusionnées par host ensuite.
      take: 20,
    }),
    db.pageView.findMany({
      where: { authorId: ownerId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // Agrégation quotidienne côté serveur (30 points max — léger)
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const view of daily) {
    const key = view.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  // Fusion des référents par host : plusieurs URLs d'un même domaine
  // (ex : deux pages Google distinctes) doivent compter comme une
  // seule source, sinon les clés React se dupliquent.
  const byHost = new Map<string, number>();
  for (const r of referrers) {
    if (!r.referrer) continue;
    try {
      const host = new URL(r.referrer).host;
      byHost.set(host, (byHost.get(host) ?? 0) + r._count.id);
    } catch {
      // Référent malformé : ignoré volontairement.
    }
  }
  const referrerStats = Array.from(byHost.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="label-mono">Système</p>
        <h1 className="display mt-2 text-3xl">Statistiques de fréquentation</h1>
        <p className="mt-2 text-sm text-muted">
          Analytics first-party : aucune donnée personnelle, aucun cookie tiers.
        </p>
      </header>

      <AnalyticsCharts
        total30d={views30d}
        daily={Array.from(byDay.entries()).map(([date, count]) => ({ date, count }))}
        topPaths={topPaths.map((p) => ({ path: p.path, count: p._count.id }))}
        referrers={referrerStats}
      />
    </div>
  );
}
