import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/security/admin";
import { invalidateSkills } from "@/lib/public-data";
import { syncSkillList } from "@/lib/ai/rag";

/** DELETE /api/admin/skills/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const skillId = Number(id);
  if (!Number.isInteger(skillId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.skill.deleteMany({
    where: { id: skillId, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Compétence introuvable" }, { status: 404 });
  }

  await invalidateSkills();
  await syncSkillList(guard.session.userId).catch(() => {});
  return NextResponse.json({ success: true });
}
