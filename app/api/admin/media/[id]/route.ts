import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/security/admin";
import { deleteStoredImage } from "@/lib/storage/upload";

/** DELETE /api/admin/media/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const media = await db.media.findFirst({
    where: { id: mediaId, authorId: guard.session.userId },
  });
  if (!media) {
    return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
  }

  // Transaction : suppression DB + fichier (le fichier en dernier,
  // en cas d'échec DB on ne perd pas la référence).
  await db.media.delete({ where: { id: mediaId } });
  await deleteStoredImage(media.path);

  return NextResponse.json({ success: true });
}
