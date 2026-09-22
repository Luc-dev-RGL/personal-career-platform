import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { leadUpdateSchema, leadNoteSchema } from "@/lib/validations/schemas";

/**
 * PATCH /api/admin/leads/[id] — changement d'étape (pipeline) ou valeur.
 * Chaque changement est journalisé dans lead_events (audit trail).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, authorId: guard.session.userId },
  });
  if (!lead) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.lead.update({
      where: { id: leadId },
      data: {
        ...(parsed.data.stage !== undefined && { stage: parsed.data.stage }),
        ...(parsed.data.value !== undefined && { value: parsed.data.value }),
        updatedAt: new Date(),
      },
    });

    if (parsed.data.stage !== undefined && parsed.data.stage !== lead.stage) {
      await tx.leadEvent.create({
        data: {
          leadId,
          type: "stage_changed",
          content: `Étape : ${lead.stage} → ${parsed.data.stage}`,
        },
      });
    }
    return result;
  });

  return NextResponse.json({ success: true, lead: updated });
}

/** POST /api/admin/leads/[id] — ajout d'une note. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = leadNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Note invalide" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, authorId: guard.session.userId },
  });
  if (!lead) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  const [note] = await db.$transaction([
    db.leadNote.create({ data: { leadId, content: parsed.data.content } }),
    db.leadEvent.create({
      data: { leadId, type: "note_added", content: "Note ajoutée" },
    }),
  ]);

  return NextResponse.json({ success: true, note }, { status: 201 });
}

/** DELETE /api/admin/leads/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.lead.deleteMany({
    where: { id: leadId, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
