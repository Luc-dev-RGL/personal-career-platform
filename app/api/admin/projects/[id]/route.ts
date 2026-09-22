import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { projectUpdateSchema } from "@/lib/validations/schemas";
import { invalidateProjects } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/**
 * PUT /api/admin/projects/[id] — modification d'un projet.
 * WHERE double : id + authorId → un admin ne peut modifier que SES projets.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const body = await readAdminJson(request);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const existing = await db.project.findFirst({
    where: { id: projectId, authorId: guard.session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.link !== undefined && { link: data.link || null }),
      ...(data.repoUrl !== undefined && { repoUrl: data.repoUrl || null }),
      ...(data.techTags !== undefined && { techTags: data.techTags }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  await syncSource(guard.session.userId, "project", project.id).catch((err) =>
    console.error("[rag] sync projet:", err.message)
  );

  await invalidateProjects();
  return NextResponse.json({ success: true, project });
}

/** DELETE /api/admin/projects/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  // Suppression propriétaire (vérifie que le projet appartient à l'admin)
  const deleted = await db.project.deleteMany({
    where: { id: projectId, authorId: guard.session.userId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  await syncSource(guard.session.userId, "project", projectId).catch(() => {});
  await invalidateProjects();
  return NextResponse.json({ success: true });
}
