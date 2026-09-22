import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { experienceSchema } from "@/lib/validations/schemas";
import { invalidateExperiences } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/** PUT /api/admin/experience/[id] */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const expId = Number(id);
  if (!Number.isInteger(expId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = experienceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const existing = await db.experience.findFirst({
    where: { id: expId, authorId: guard.session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Expérience introuvable" }, { status: 404 });
  }

  const experience = await db.experience.update({
    where: { id: expId },
    data: {
      title: data.title,
      company: data.company,
      location: data.location || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      details: data.details ?? "",
    },
  });

  await invalidateExperiences();
  await syncSource(guard.session.userId, "experience", expId).catch(() => {});
  return NextResponse.json({ success: true, experience });
}

/** DELETE /api/admin/experience/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const expId = Number(id);
  if (!Number.isInteger(expId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.experience.deleteMany({
    where: { id: expId, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Expérience introuvable" }, { status: 404 });
  }

  await invalidateExperiences();
  await syncSource(guard.session.userId, "experience", expId).catch(() => {});
  return NextResponse.json({ success: true });
}
