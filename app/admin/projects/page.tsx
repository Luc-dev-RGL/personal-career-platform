import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function ProjetsAdmin() {
  const session = await getSession();
  if (!session) return null;

  const projets = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    where: { authorId: session.userId },
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes Projets</h1>
        <Link
          href="/admin/projets/nouveau"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouveau projet
        </Link>
      </div>

      {projets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">Tu n'as pas encore créé de projet</p>
          <Link
            href="/admin/projets/nouveau"
            className="text-blue-600 hover:underline"
          >
            Créer mon premier projet →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projets.map((projet) => (
            <div
              key={projet.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-bold text-lg">{projet.title}</h3>
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                {projet.description}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  projet.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {projet.status === "published" ? "Publié" : "Brouillon"}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/projects/${projet.id}`}
                    className="text-sm text-blue-600 hover:underline"
                    >
                    Modifier
                </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}