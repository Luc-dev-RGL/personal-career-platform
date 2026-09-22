import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import EditForm from "./EditForm";
import Link from "next/link";

export default async function ModifierProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const projet = await db.project.findUnique({
    where: { id: parseInt(id), authorId: session.userId },
  });

  if (!projet) notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/projects" className="text-blue-600 hover:underline text-sm">
          ← Retour à la liste
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Modifier le projet</h1>
      <EditForm projet={projet} />
    </div>
  );
}