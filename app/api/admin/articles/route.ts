import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { articleSchema, slugify } from "@/lib/validations/schemas";
import { invalidateArticles } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/** POST /api/admin/articles */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  let slug = slugify(data.title);
  const collision = await db.article.findUnique({ where: { slug } });
  if (collision) slug = `${slug}-${Date.now().toString(36)}`;

  const article = await db.article.create({
    data: {
      slug,
      title: data.title,
      excerpt: data.excerpt ?? "",
      content: data.content,
      published: data.published,
      authorId: guard.session.userId,
    },
  });

  await invalidateArticles();
  await syncSource(guard.session.userId, "article", article.id).catch(() => {});
  return NextResponse.json({ success: true, article }, { status: 201 });
}
