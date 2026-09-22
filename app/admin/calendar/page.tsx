import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { CalendarManager, ApptActions } from "@/components/admin/CalendarManager";
import { ServicesSection } from "@/components/admin/ServicesSection";
import { APPOINTMENT_STATUS_LABELS, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const session = await requireAdmin();
  const ownerId = session!.userId;

  const [appointments, availabilities, blocks, services] = await Promise.all([
    db.appointment.findMany({
      where: { authorId: ownerId },
      orderBy: { dateTime: "asc" },
      include: { service: { select: { name: true } } },
    }),
    db.availability.findMany({
      where: { authorId: ownerId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    db.dateBlock.findMany({
      where: { authorId: ownerId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
    }),
    db.service.findMany({
      where: { authorId: ownerId },
      orderBy: { duration: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="label-mono">Business</p>
        <h1 className="display mt-2 text-3xl">Agenda & réservations</h1>
      </header>

      {/* Services */}
      <ServicesSection services={services} />

      {/* Demandes de rendez-vous */}
      <section className="mb-10">
        <h2 className="display mb-4 text-sm font-semibold">
          Demandes ({appointments.filter((a) => a.status === "pending").length} en attente)
        </h2>
        <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
          {appointments.length === 0 && (
            <p className="bg-bg px-5 py-10 text-center text-sm text-muted">Aucun rendez-vous.</p>
          )}
          {appointments.map((appt) => (
            <div key={appt.id} className="flex flex-wrap items-center justify-between gap-3 bg-bg px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {appt.visitorName} <span className="text-accent">· {appt.service.name}</span>
                </p>
                <p className="label-mono mt-1 !text-[0.58rem]">
                  {formatDateTime(appt.dateTime)} — {appt.email}
                  {appt.phone ? ` · ${appt.phone}` : ""}
                </p>
                {appt.notes && <p className="mt-1 line-clamp-1 text-xs text-muted">{appt.notes}</p>}
              </div>
              <ApptActions
                id={appt.id}
                status={appt.status}
                statusLabel={APPOINTMENT_STATUS_LABELS[appt.status]}
              />
            </div>
          ))}
        </div>
      </section>

      <CalendarManager
        availabilities={availabilities.map((a) => ({
          id: a.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isBlocked: a.isBlocked,
        }))}
        blocks={blocks.map((b) => ({
          id: b.id,
          date: b.date.toISOString().slice(0, 10),
          reason: b.reason,
        }))}
      />
    </div>
  );
}
