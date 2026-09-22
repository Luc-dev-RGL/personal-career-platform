import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { SkillsManager } from "@/components/admin/SkillsManager";

export const dynamic = "force-dynamic";

export default async function AdminSkillsPage() {
  const session = await requireAdmin();
  const skills = await db.skill.findMany({
    where: { authorId: session!.userId },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Compétences</h1>
      </header>
      <SkillsManager skills={skills} />
    </div>
  );
}
