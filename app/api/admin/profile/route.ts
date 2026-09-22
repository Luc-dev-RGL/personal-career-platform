import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardAdmin, readAdminJson } from "@/lib/security/admin";
import { profileSchema } from "@/lib/validations/schemas";
import { invalidateProfile } from "@/lib/public-data";
import { syncSource } from "@/lib/ai/rag";

/** PUT /api/admin/profile — mise à jour du profil public. */
export async function PUT(request: Request) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const body = await readAdminJson(request);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const profile = await db.profile.upsert({
    where: { userId: guard.session.userId },
    update: {
      name: data.name,
      headline: data.headline,
      bio: data.bio,
      location: data.location || null,
      emailPublic: data.emailPublic || null,
      phonePublic: data.phonePublic || null,
      avatarUrl: data.avatarUrl || null,
      resumeUrl: data.resumeUrl || null,
      availability: data.availability,
      githubUrl: data.githubUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      websiteUrl: data.websiteUrl || null,
    },
    create: {
      userId: guard.session.userId,
      name: data.name,
      headline: data.headline,
      bio: data.bio,
      location: data.location || null,
      emailPublic: data.emailPublic || null,
      phonePublic: data.phonePublic || null,
      avatarUrl: data.avatarUrl || null,
      resumeUrl: data.resumeUrl || null,
      availability: data.availability,
      githubUrl: data.githubUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      websiteUrl: data.websiteUrl || null,
    },
  });

  await invalidateProfile();
  await syncSource(guard.session.userId, "profile", profile.id).catch(() => {});

  return NextResponse.json({ success: true, profile });
}
