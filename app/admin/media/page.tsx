import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { MediaManager } from "@/components/admin/MediaManager";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const session = await requireAdmin();
  const media = await db.media.findMany({
    where: { authorId: session!.userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Médiathèque</h1>
        <p className="mt-2 text-sm text-muted">
          Upload sécurisé : formats image vérifiés par signature binaire, re-encodage
          Sharp, export WebP optimisé (≤ 8 Mo).
        </p>
      </header>
      <MediaManager media={media} />
    </div>
  );
}
