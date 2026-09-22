import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { ExperienceManager } from "@/components/admin/ExperienceManager";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminExperiencePage() {
  const session = await requireAdmin();
  const experiences = await db.experience.findMany({
    where: { authorId: session!.userId },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="label-mono">Contenu</p>
        <h1 className="display mt-2 text-3xl">Expériences professionnelles</h1>
      </header>
      <ExperienceManager
        experiences={experiences.map((e) => ({
          id: e.id,
          title: e.title,
          company: e.company,
          location: e.location,
          startDate: e.startDate.toISOString().slice(0, 10),
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : "",
          details: e.details ?? "",
          label: `${formatDate(e.startDate, { month: "short", year: "numeric" })} → ${
            e.endDate ? formatDate(e.endDate, { month: "short", year: "numeric" }) : "aujourd'hui"
          }`,
        }))}
      />
    </div>
  );
}
