import { getSession } from "@/lib/auth/session";
import Link from "next/link";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Tableau de bord</h1>
      
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <p className="text-lg">✅ Connecté en tant que :</p>
        <p className="font-bold text-xl mt-2">{session.email}</p>
        <p className="text-gray-600 mt-1">Rôle : {session.role}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/projects"
          className="p-6 border rounded-lg hover:shadow-md transition-shadow"
        >
          <h3 className="font-bold text-lg">📁 Projets</h3>
          <p className="text-gray-500 text-sm mt-1">Gérer tes réalisations</p>
        </Link>
        
        <div className="p-6 border rounded-lg opacity-50">
          <h3 className="font-bold text-lg">👤 Expériences</h3>
          <p className="text-gray-500 text-sm mt-1">À venir</p>
        </div>
        
        <div className="p-6 border rounded-lg opacity-50">
          <h3 className="font-bold text-lg">⚡ Compétences</h3>
          <p className="text-gray-500 text-sm mt-1">À venir</p>
        </div>
        
        <div className="p-6 border rounded-lg opacity-50">
          <h3 className="font-bold text-lg">📝 Articles</h3>
          <p className="text-gray-500 text-sm mt-1">À venir</p>
        </div>
      </div>
    </div>
  );
}