import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { ProfileForm } from "@/components/admin/ProfileForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await requireAdmin();
  const profile = await db.profile.findUnique({ where: { userId: session!.userId } });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Profil public</h1>
        <p className="mt-2 text-sm text-muted">
          Ces informations alimentent la page d&apos;accueil, le chatbot et la page contact.
        </p>
      </header>
      <ProfileForm profile={profile} />
    </div>
  );
}
