import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { skillSchema } from "@/lib/validations/schemas";
import { invalidateSkills } from "@/lib/public-data";
import { syncSkillList } from "@/lib/ai/rag";

/** POST /api/admin/skills */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = skillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const skill = await db.skill.create({
    data: { ...parsed.data, authorId: guard.session.userId },
  });

  await invalidateSkills();
  await syncSkillList(guard.session.userId).catch(() => {});
  return NextResponse.json({ success: true, skill }, { status: 201 });
}
