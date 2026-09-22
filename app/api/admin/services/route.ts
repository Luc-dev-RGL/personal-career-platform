import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { serviceSchema } from "@/lib/validations/schemas";
import { invalidateServices } from "@/lib/public-data";

/** POST /api/admin/services — crée un service réservable. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const service = await db.service.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      duration: parsed.data.duration,
      price: parsed.data.price ?? null,
      active: parsed.data.active,
      authorId: guard.session.userId,
    },
  });

  await invalidateServices();
  return NextResponse.json({ success: true, service }, { status: 201 });
}

/** PUT /api/admin/services?id= — bascule actif/inactif. */
export async function PUT(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const existing = await db.service.findFirst({
    where: { id, authorId: guard.session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }

  const service = await db.service.update({
    where: { id },
    data: { active: !existing.active },
  });

  await invalidateServices();
  return NextResponse.json({ success: true, service });
}

/** DELETE /api/admin/services?id= */
export async function DELETE(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.service.deleteMany({
    where: { id, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }

  await invalidateServices();
  return NextResponse.json({ success: true });
}
