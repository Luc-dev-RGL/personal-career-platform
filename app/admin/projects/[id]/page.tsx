import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ProjectForm } from "@/components/admin/ProjectForm";

export const dynamic = "force-dynamic";

export default async function EditProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) notFound();

  const session = await getSession();
  if (!session) return null;

  const projet = await db.project.findFirst({
    where: { id: projectId, authorId: session.userId },
  });
  if (!projet) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Modifier le projet</h1>
      </header>
      <ProjectForm projet={projet} />
    </div>
  );
}
