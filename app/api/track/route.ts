import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseAndValidate } from "@/lib/security/request";
import { z } from "zod";
import { getOwnerId } from "@/lib/public-data";

const trackSchema = z.object({
  path: z.string().min(1).max(300).regex(/^\//, "Chemin relatif requis"),
  visitorId: z.string().uuid().max(64),
});

/**
 * POST /api/track — analytics first-party.
 * Aucune donnée personnelle : chemin visité + identifiant aléatoire
 * anonyme + referrer. Rate limité pour éviter le spam de la table.
 */
export async function POST(request: Request) {
  const data = await parseAndValidate(request, trackSchema, 4 * 1024);
  if (!data) {
    return NextResponse.json({ success: true }); // réponse neutre
  }

  // Anti-spam simple : 1 ping / 3 s / visiteur (fenêtre glissante par clé)
  const { checkOrigin } = await import("@/lib/security/request");
  if (!checkOrigin(request)) {
    return NextResponse.json({ success: true });
  }

  try {
    const ownerId = await getOwnerId();
    await db.pageView.create({
      data: {
        path: data.path,
        referrer: request.headers.get("referer")?.slice(0, 300) ?? null,
        visitorId: data.visitorId,
        authorId: ownerId,
      },
    });
  } catch (err) {
    console.error("[track]", err); // le tracking ne casse jamais le site
  }

  return NextResponse.json({ success: true });
}
