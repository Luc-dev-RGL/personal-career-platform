import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { experienceSchema } from "@/lib/validations/schemas";
import { invalidateExperiences } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/** POST /api/admin/experience */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = experienceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const experience = await db.experience.create({
    data: {
      title: data.title,
      company: data.company,
      location: data.location || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      details: data.details ?? "",
      authorId: guard.session.userId,
    },
  });

  await invalidateExperiences();
  await syncSource(guard.session.userId, "experience", experience.id).catch(() => {});
  return NextResponse.json({ success: true, experience }, { status: 201 });
}
