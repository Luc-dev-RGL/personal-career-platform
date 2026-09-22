import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { dateBlockSchema } from "@/lib/validations/schemas";
import { invalidateServices } from "@/lib/public-data";

/** POST /api/admin/calendar/blocks — bloque une date complète. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = dateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const block = await db.dateBlock.create({
    data: {
      date: new Date(parsed.data.date + "T00:00:00"),
      reason: parsed.data.reason || null,
      authorId: guard.session.userId,
    },
  });

  await invalidateServices();
  return NextResponse.json({ success: true, block }, { status: 201 });
}

/** DELETE /api/admin/calendar/blocks?id= */
export async function DELETE(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.dateBlock.deleteMany({
    where: { id, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Blocage introuvable" }, { status: 404 });
  }

  await invalidateServices();
  return NextResponse.json({ success: true });
}
