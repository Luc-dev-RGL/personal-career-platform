import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { LeadsBoard } from "@/components/admin/LeadsBoard";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const session = await requireAdmin();
  const leads = await db.lead.findMany({
    where: { authorId: session!.userId },
    orderBy: { createdAt: "desc" },
  });

  const totalValue = leads
    .filter((l) => l.stage === "won" && l.value)
    .reduce((sum, l) => sum + (l.value ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="label-mono">Business</p>
        <h1 className="display mt-2 text-3xl">Pipeline de prospects</h1>
        <p className="mt-2 text-sm text-muted">
          {leads.length} prospect(s) — {totalValue > 0 ? `affaires gagnées : ${totalValue} €` : "glissez un prospect pour changer son étape."}
        </p>
      </header>
      <LeadsBoard
        leads={leads.map((l) => ({
          id: l.id,
          name: l.name,
          company: l.company,
          email: l.email,
          stage: l.stage,
          source: l.source,
          value: l.value,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
