import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { projectSchema, slugify } from "@/lib/validations/schemas";
import { invalidateProjects } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/**
 * POST /api/admin/projects — création d'un projet.
 * Chaîne de sécurité : origin → session admin (RBAC) → Zod → Prisma.
 */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Slug unique (suffixe en cas de collision)
  let slug = slugify(data.title);
  const collision = await db.project.findUnique({ where: { slug } });
  if (collision) slug = `${slug}-${Date.now().toString(36)}`;

  const project = await db.project.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      content: data.content ?? "",
      imageUrl: data.imageUrl || null,
      link: data.link || null,
      repoUrl: data.repoUrl || null,
      techTags: data.techTags ?? "",
      status: data.status,
      authorId: guard.session.userId,
    },
  });

  // Mise à jour asynchrone de la base de connaissances du chatbot (RAG)
  await syncSource(guard.session.userId, "project", project.id).catch((err) =>
    console.error("[rag] sync projet:", err.message)
  );

  await invalidateProjects();
  return NextResponse.json({ success: true, project }, { status: 201 });
}
