import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { appointmentDecisionSchema } from "@/lib/validations/schemas";

/**
 * PATCH /api/admin/appointments/[id] — accepter / refuser / annuler.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const apptId = Number(id);
  if (!Number.isInteger(apptId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = appointmentDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const existing = await db.appointment.findFirst({
    where: { id: apptId, authorId: guard.session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  const appointment = await db.appointment.update({
    where: { id: apptId },
    data: { status: parsed.data.decision },
  });

  return NextResponse.json({ success: true, appointment });
}
