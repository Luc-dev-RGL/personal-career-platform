import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { articleSchema } from "@/lib/validations/schemas";
import { invalidateArticles } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/** PUT /api/admin/articles/[id] */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = articleSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.article.findFirst({
    where: { id: articleId, authorId: guard.session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const data = parsed.data;
  const article = await db.article.update({
    where: { id: articleId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.excerpt !== undefined && { excerpt: data.excerpt ?? "" }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.published !== undefined && { published: data.published }),
    },
  });

  await invalidateArticles();
  await syncSource(guard.session.userId, "article", articleId).catch(() => {});
  return NextResponse.json({ success: true, article });
}

/** DELETE /api/admin/articles/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const deleted = await db.article.deleteMany({
    where: { id: articleId, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  await invalidateArticles();
  await syncSource(guard.session.userId, "article", articleId).catch(() => {});
  return NextResponse.json({ success: true });
}
