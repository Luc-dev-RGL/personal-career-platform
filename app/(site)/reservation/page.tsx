import type { Metadata } from "next";
import { getActiveServices } from "@/lib/public-data";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = { title: "Réserver un appel" };
export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const services = await getActiveServices().catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <header className="text-center">
        <p className="label-mono">Réservation</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">
          Choisissez un créneau<span className="text-accent">.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          Service → date → créneau → confirmation. Quatre étapes, deux minutes.
        </p>
      </header>

      <div className="mt-14">
        <BookingFlow services={services} />
      </div>
    </div>
  );
}
