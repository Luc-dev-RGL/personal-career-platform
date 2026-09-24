import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime, APPOINTMENT_STATUS_LABELS, LEAD_STAGE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await requireAdmin();
  const ownerId = session!.userId;

  const [projects, articles, unreadMessages, pendingAppointments, newLeads, unreadNotifications] =
    await Promise.all([
      db.project.count({ where: { authorId: ownerId } }),
      db.article.count({ where: { authorId: ownerId } }),
      db.message.count({ where: { conversation: { authorId: ownerId }, isFromVisitor: true, readByAdmin: false } }),
      db.appointment.count({ where: { authorId: ownerId, status: "pending" } }),
      db.lead.count({ where: { authorId: ownerId, stage: "new" } }),
      db.notification.count({ where: { authorId: ownerId, isRead: false } }),
    ]);

  const [lastLeads, lastAppointments] = await Promise.all([
    db.lead.findMany({ where: { authorId: ownerId }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.appointment.findMany({
      where: { authorId: ownerId },
      orderBy: { dateTime: "desc" },
      take: 4,
      include: { service: { select: { name: true } } },
    }),
  ]);

  const stats = [
    { label: "Projets", value: projects, href: "/admin/projects" },
    { label: "Articles", value: articles, href: "/admin/articles" },
    { label: "Messages non lus", value: unreadMessages, href: "/admin/messages", alert: unreadMessages > 0 },
    { label: "Demandes en attente", value: pendingAppointments, href: "/admin/calendar", alert: pendingAppointments > 0 },
    { label: "Nouveaux prospects", value: newLeads, href: "/admin/leads", alert: newLeads > 0 },
    { label: "Notifications", value: unreadNotifications, href: "/admin", alert: unreadNotifications > 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <p className="label-mono">Bienvenue dans les coulisses</p>
        <h1 className="display mt-2 text-3xl">Le Foyer</h1>
      </header>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`group rounded-lg border px-5 py-5 transition ${
              stat.alert ? "border-accent/50 bg-accent-dim" : "border-line bg-elevated hover:border-line-strong"
            }`}
          >
            <p className="label-mono !text-[0.58rem]">{stat.label}</p>
            <p className={`display mt-2 text-3xl font-semibold ${stat.alert ? "text-accent" : ""}`}>
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Derniers prospects */}
        <section className="rounded-lg border border-line bg-elevated">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="display text-sm font-semibold">Derniers prospects</h2>
            <Link href="/admin/leads" className="text-xs text-muted hover:text-accent">
              CRM complet →
            </Link>
          </div>
          <ul>
            {lastLeads.length === 0 && (
              <li className="px-5 py-6 text-center text-xs text-faint">Aucun prospect pour l&apos;instant.</li>
            )}
            {lastLeads.map((lead) => (
              <li key={lead.id} className="border-b border-line px-5 py-3.5 last:border-0">
                <Link href={`/admin/leads/${lead.id}`} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted">{lead.email}</p>
                  </div>
                  <span className="label-mono shrink-0 !text-[0.58rem] text-accent">
                    {LEAD_STAGE_LABELS[lead.stage]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Derniers rendez-vous */}
        <section className="rounded-lg border border-line bg-elevated">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="display text-sm font-semibold">Derniers rendez-vous</h2>
            <Link href="/admin/calendar" className="text-xs text-muted hover:text-accent">
              Agenda →
            </Link>
          </div>
          <ul>
            {lastAppointments.length === 0 && (
              <li className="px-5 py-6 text-center text-xs text-faint">
                Aucun rendez-vous pour l&apos;instant.
              </li>
            )}
            {lastAppointments.map((appt) => (
              <li key={appt.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{appt.visitorName}</p>
                  <p className="truncate text-xs text-muted">
                    {appt.service.name} · {formatDateTime(appt.dateTime)}
                  </p>
                </div>
                <span className="label-mono shrink-0 !text-[0.58rem]">
                  {APPOINTMENT_STATUS_LABELS[appt.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
