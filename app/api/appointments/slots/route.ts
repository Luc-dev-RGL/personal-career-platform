import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardPublicEndpoint } from "@/lib/security/request";
import { generateSlots, dateKey } from "@/lib/booking/slots";
import { getOwnerId } from "@/lib/public-data";

/**
 * GET /api/appointments/slots?serviceId=&year=&month=
 * Endpoint public : calcule les créneaux libres du mois pour un service.
 * Le calcul se fait TOUJOURS côté serveur — le client ne décide rien.
 */
export async function GET(request: Request) {
  const guard = await guardPublicEndpoint(request, "slots", 60, 60);
  if (guard) return guard;

  const url = new URL(request.url);
  const serviceId = Number(url.searchParams.get("serviceId"));
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month")); // 1-12

  if (!Number.isInteger(serviceId) || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const ownerId = await getOwnerId();

  const service = await db.service.findFirst({
    where: { id: serviceId, authorId: ownerId, active: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }

  // Période : du jour courant jusqu'à la fin du mois demandé (si futur)
  const now = new Date();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  if (monthEnd < now) {
    return NextResponse.json({ slots: {} });
  }
  const fromDate = monthStart < now ? now : monthStart;
  const days = Math.ceil((monthEnd.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  const window = Math.min(days, 92); // borne de sécurité (3 mois)

  const [availabilities, blocks, appointments] = await Promise.all([
    db.availability.findMany({ where: { authorId: ownerId } }),
    db.dateBlock.findMany({
      where: { authorId: ownerId, date: { gte: new Date(fromDate.setHours(0, 0, 0, 0)) } },
      select: { date: true },
    }),
    db.appointment.findMany({
      where: {
        authorId: ownerId,
        status: { in: ["pending", "confirmed"] },
        dateTime: { gte: monthStart, lte: monthEnd },
      },
      select: { dateTime: true, endTime: true },
    }),
  ]);

  const slots = generateSlots({
    fromDate: new Date(year, month - 1, fromDate.getDate(), fromDate.getHours(), fromDate.getMinutes()),
    days: window,
    durationMin: service.duration,
    availabilities: availabilities.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
      isBlocked: a.isBlocked,
    })),
    blockedDates: blocks.map((b) => dateKey(b.date)),
    busy: appointments.map((a) => ({
      start: a.dateTime,
      end: a.endTime ?? new Date(a.dateTime.getTime() + service.duration * 60_000),
    })),
  });

  return NextResponse.json({ slots });
}
