import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const { title, description, imageUrl, link, status } = await request.json();

    if (!title) return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 });

    const projet = await db.project.update({
      where: {
        id: parseInt(id),
        authorId: session.userId,
      },
      data: { title, description, imageUrl, link, status },
    });

    return NextResponse.json({ success: true, projet });
  } catch (error) {
    console.error("Erreur modification :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;

    await db.project.delete({
      where: {
        id: parseInt(id),
        authorId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}