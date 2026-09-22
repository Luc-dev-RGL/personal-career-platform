import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/security/admin";
import { processImageUpload, storeImage } from "@/lib/storage/upload";

/**
 * POST /api/admin/media — upload d'un média (multipart/form-data).
 * Le fichier est validé (magic bytes), re-encodé via Sharp puis stocké.
 */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête multipart invalide" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  try {
    const processed = await processImageUpload(file);
    const path = await storeImage(processed);

    const media = await db.media.create({
      data: {
        filename: file.name.slice(0, 200) || "image.webp",
        path,
        type: processed.mime,
        size: processed.size,
        width: processed.width,
        height: processed.height,
        authorId: guard.session.userId,
      },
    });

    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Traitement du fichier impossible" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/admin/media?page=1 — liste paginée de la médiathèque.
 * (Pagination exigée sur toute liste exposée.)
 */
export async function GET(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = 24;

  const [items, total] = await Promise.all([
    db.media.findMany({
      where: { authorId: guard.session.userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.media.count({ where: { authorId: guard.session.userId } }),
  ]);

  return NextResponse.json({
    media: items,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  });
}
