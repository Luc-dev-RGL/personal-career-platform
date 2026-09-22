import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { availabilitySchema } from "@/lib/validations/schemas";
import { invalidateServices } from "@/lib/public-data";

/** POST /api/admin/calendar/availability — ajoute une plage hebdomadaire. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (data.startTime >= data.endTime) {
    return NextResponse.json({ error: "L'heure de fin doit suivre l'heure de début" }, { status: 400 });
  }

  const availability = await db.availability.create({
    data: { ...data, authorId: guard.session.userId },
  });

  await invalidateServices();
  return NextResponse.json({ success: true, availability }, { status: 201 });
}

/** PUT /api/admin/calendar/availability — bascule (dé)bloque une plage. */
export async function PUT(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const id = Number((body as { id?: unknown })?.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await db.availability.findFirst({
    where: { id, authorId: guard.session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Disponibilité introuvable" }, { status: 404 });
  }

  const availability = await db.availability.update({
    where: { id },
    data: { isBlocked: !existing.isBlocked },
  });

  await invalidateServices();
  return NextResponse.json({ success: true, availability });
}

/** DELETE /api/admin/calendar/availability?id= */
export async function DELETE(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.availability.deleteMany({
    where: { id, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Disponibilité introuvable" }, { status: 404 });
  }

  await invalidateServices();
  return NextResponse.json({ success: true });
}
