import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardPublicEndpoint, parseAndValidate } from "@/lib/security/request";
import { appointmentSchema } from "@/lib/validations/schemas";
import { getOwnerId } from "@/lib/public-data";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/appointments — prise de rendez-vous (endpoint public).
 *
 * Anti double-réservation : transaction sérialisée — le créneau est
 * re-vérifié dans la transaction (chevauchement avec pending/confirmed)
 * avant insertion. Deux requêtes concurrentes ne peuvent pas réserver
 * le même créneau.
 */
export async function POST(request: Request) {
  const guard = await guardPublicEndpoint(request, "booking", 8, 600);
  if (guard) return guard;

  const data = await parseAndValidate(request, appointmentSchema, 16 * 1024);
  if (!data) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const ownerId = await getOwnerId();
  const slotStart = new Date(data.slot);

  if (slotStart <= new Date()) {
    return NextResponse.json({ error: "Le créneau est déjà passé" }, { status: 400 });
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const service = await tx.service.findFirst({
          where: { id: data.serviceId, authorId: ownerId, active: true },
        });
        if (!service) throw new Error("SERVICE_NOT_FOUND");

        const slotEnd = new Date(slotStart.getTime() + service.duration * 60_000);

        // Re-vérification des conflits DANS la transaction
        const sameDay = await tx.appointment.findMany({
          where: {
            authorId: ownerId,
            status: { in: ["pending", "confirmed"] },
            dateTime: { gte: new Date(slotStart.getTime() - 24 * 3_600_000), lte: slotEnd },
          },
          select: { dateTime: true, endTime: true },
        });

        const conflict = sameDay.some(
          (a) =>
            slotStart < (a.endTime ?? new Date(a.dateTime.getTime() + service.duration * 60_000)) &&
            slotEnd > a.dateTime
        );
        if (conflict) throw new Error("SLOT_TAKEN");

        // Bloqué explicitement ce jour-là ?
        const blocked = await tx.dateBlock.findFirst({
          where: {
            authorId: ownerId,
            date: {
              gte: new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate()),
              lt: new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate() + 1),
            },
          },
        });
        if (blocked) throw new Error("SLOT_TAKEN");

        return tx.appointment.create({
          data: {
            visitorName: data.name.trim(),
            email: data.email,
            phone: data.phone || null,
            dateTime: slotStart,
            endTime: slotEnd,
            notes: data.notes || null,
            status: "pending",
            serviceId: service.id,
            authorId: ownerId,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    await createNotification(
      ownerId,
      "appointment",
      `Nouvelle demande de rendez-vous : ${data.name} (en attente de confirmation)`,
      "/admin/calendar"
    );

    return NextResponse.json({ success: true, appointmentId: result.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "Ce créneau vient d'être pris. Choisissez-en un autre." },
        { status: 409 }
      );
    }
    if (message === "SERVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Service indisponible" }, { status: 404 });
    }
    console.error("[booking] erreur:", err);
    return NextResponse.json({ error: "Réservation impossible pour le moment" }, { status: 500 });
  }
}
