"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { PublicService } from "./BookingFlow";

interface Slot {
  date: string;
  time: string;
}

/** Étape finale : coordonnées + envoi. La disponibilité est re-vérifiée serveur. */
export function BookingForm({
  service,
  slot,
  onBack,
  onDone,
}: {
  service: PublicService;
  slot: Slot;
  onBack: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      serviceId: service.id,
      slot: new Date(`${slot.date}T${slot.time}:00`).toISOString(),
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      notes: fd.get("notes"),
    };

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Réservation impossible");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réservation impossible");
    } finally {
      setSending(false);
    }
  }

  const dateLabel = new Date(slot.date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md">
      <div className="mb-8 rounded-lg border border-accent/40 bg-accent-dim px-5 py-4">
        <p className="label-mono !text-[0.6rem]">Récapitulatif</p>
        <p className="display mt-1.5 font-semibold">{service.name}</p>
        <p className="mt-1 text-sm text-muted capitalize">
          {dateLabel} à {slot.time} · {formatDuration(service.duration)} ·{" "}
          {formatPrice(service.price)}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Field label="Nom complet *" htmlFor="booking-name">
          <Input id="booking-name" name="name" required minLength={2} maxLength={120} autoComplete="name" />
        </Field>
        <Field label="Email *" htmlFor="booking-email">
          <Input id="booking-email" name="email" type="email" required maxLength={200} autoComplete="email" />
        </Field>
        <Field label="Téléphone (optionnel)" htmlFor="booking-phone">
          <Input id="booking-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </Field>
        <Field label="Contexte (optionnel)" htmlFor="booking-notes">
          <Textarea
            id="booking-notes"
            name="notes"
            maxLength={2000}
            rows={4}
            placeholder="Ce que vous aimeriez aborder…"
          />
        </Field>

        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onBack}>
            ← Créneaux
          </Button>
          <Button type="submit" disabled={sending} className="flex-1">
            {sending ? "Envoi…" : "Confirmer la demande"}
          </Button>
        </div>
      </div>
    </form>
  );
}
