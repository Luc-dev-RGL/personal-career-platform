import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { title, description, imageUrl, link, status } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 });
    }

    const projet = await db.project.create({
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        link: link || null,
        status: status || "draft",
        authorId: session.userId,
      },
    });

    return NextResponse.json({ success: true, projet });
  } catch (error) {
    console.error("Erreur création projet :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}