import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { LeadDetail } from "@/components/admin/LeadDetail";
import { formatDateTime, LEAD_STAGE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) notFound();

  const session = await requireAdmin();
  const lead = await db.lead.findFirst({
    where: { id: leadId, authorId: session!.userId },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/leads" className="text-sm text-muted transition hover:text-accent">
        ← Pipeline
      </Link>

      <header className="mt-5 border-b border-line pb-6">
        <p className="label-mono">{LEAD_STAGE_LABELS[lead.stage]} · {formatDateTime(lead.createdAt)}</p>
        <h1 className="display mt-2 text-3xl">{lead.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span>{lead.email}</span>
          {lead.company && <span>{lead.company}</span>}
          {lead.phone && <span>{lead.phone}</span>}
          {lead.source && <span className="label-mono !text-[0.58rem]">Source : {lead.source}</span>}
        </div>
      </header>

      {lead.message && (
        <div className="mt-6 rounded-lg border border-line bg-elevated px-5 py-4">
          <p className="label-mono !text-[0.6rem]">Message initial</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{lead.message}</p>
        </div>
      )}

      <LeadDetail
        lead={{ id: lead.id, stage: lead.stage, value: lead.value }}
        notes={lead.notes.map((n) => ({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
        }))}
        events={lead.events.map((e) => ({
          id: e.id,
          type: e.type,
          content: e.content,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
