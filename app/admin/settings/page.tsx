import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { SettingsForms } from "@/components/admin/SettingsForms";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const createdAt = await db.user.findUnique({
    where: { id: session!.userId },
    select: { createdAt: true, _count: { select: { sessions: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <p className="label-mono">Système</p>
        <h1 className="display mt-2 text-3xl">Réglages</h1>
      </header>

      <SettingsForms sessionsActive={createdAt?._count.sessions ?? 0} />

      <p className="mt-8 text-center text-xs text-faint">
        Compte créé le {createdAt?.createdAt.toLocaleDateString("fr-FR")} · {createdAt?._count.sessions ?? 0} session(s) active(s)
      </p>
    </div>
  );
}
