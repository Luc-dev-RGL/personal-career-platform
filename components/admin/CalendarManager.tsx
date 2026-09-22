"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface Availability {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isBlocked: boolean;
}

interface Block {
  id: number;
  date: string;
  reason: string | null;
}

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Boutons de décision d'une demande de rendez-vous. */
export function ApptActions({
  id,
  status,
  statusLabel,
}: {
  id: number;
  status: string;
  statusLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(decision: string) {
    setBusy(true);
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    }).catch(() => {});
    router.refresh();
    setBusy(false);
  }

  if (status !== "pending") {
    return (
      <span
        className={cn(
          "label-mono shrink-0 !text-[0.6rem]",
          status === "confirmed" && "text-success",
          status === "refused" && "text-danger",
          status === "cancelled" && "text-faint"
        )}
      >
        {statusLabel}
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="label-mono !text-[0.6rem] text-warning">{statusLabel}</span>
      <Button size="sm" disabled={busy} onClick={() => decide("confirmed")}>
        Accepter
      </Button>
      <Button size="sm" variant="danger" disabled={busy} onClick={() => decide("refused")}>
        Refuser
      </Button>
    </div>
  );
}

/** Gestion des disponibilités hebdo + dates bloquées. */
export function CalendarManager({
  availabilities,
  blocks,
}: {
  availabilities: Availability[];
  blocks: Block[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Disponibilités hebdomadaires */}
      <section className="rounded-lg border border-line bg-elevated p-5">
        <h2 className="display mb-4 text-sm font-semibold">Horaires récurrents</h2>
        <form
          className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void call("/api/admin/calendar/availability", "POST", {
              dayOfWeek: Number(fd.get("dayOfWeek")),
              startTime: fd.get("startTime"),
              endTime: fd.get("endTime"),
              isBlocked: false,
            });
            e.currentTarget.reset();
          }}
        >
          <Field label="Jour" htmlFor="cal-day">
            <select
              id="cal-day"
              name="dayOfWeek"
              className="h-10 w-full rounded-md border border-line bg-surface px-2.5 text-sm focus:border-accent focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <option key={d} value={d}>{DAY_NAMES[d]}</option>
              ))}
            </select>
          </Field>
          <Field label="De" htmlFor="cal-start">
            <Input id="cal-start" name="startTime" type="time" defaultValue="09:00" required className="w-28" />
          </Field>
          <Field label="À" htmlFor="cal-end">
            <Input id="cal-end" name="endTime" type="time" defaultValue="17:00" required className="w-28" />
          </Field>
          <Button type="submit" size="sm" disabled={busy} className="h-10">
            +
          </Button>
        </form>

        <ul className="mt-5 flex flex-col gap-px overflow-hidden rounded-md border border-line">
          {availabilities.length === 0 && (
            <li className="bg-bg px-4 py-6 text-center text-xs text-muted">
              Aucun horaire — les visiteurs ne verront aucun créneau.
            </li>
          )}
          {availabilities.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 bg-bg px-4 py-2.5"
            >
              <span className="text-xs">
                <span className="font-medium">{DAY_NAMES[a.dayOfWeek]}</span>{" "}
                <span className="font-mono text-muted">
                  {a.startTime}–{a.endTime}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  onClick={() => void call("/api/admin/calendar/availability", "PUT", { id: a.id })}
                  disabled={busy}
                  className={cn(
                    "label-mono !text-[0.55rem] rounded-full border px-2 py-0.5 transition",
                    a.isBlocked ? "border-danger/50 text-danger" : "border-line text-muted"
                  )}
                >
                  {a.isBlocked ? "Bloqué" : "Actif"}
                </button>
                <button
                  onClick={() => void call(`/api/admin/calendar/availability?id=${a.id}`, "DELETE")}
                  disabled={busy}
                  className="text-xs text-faint hover:text-danger"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Dates bloquées */}
      <section className="rounded-lg border border-line bg-elevated p-5">
        <h2 className="display mb-4 text-sm font-semibold">Jours bloqués (congés…)</h2>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void call("/api/admin/calendar/blocks", "POST", {
              date: fd.get("date"),
              reason: fd.get("reason"),
            });
            e.currentTarget.reset();
          }}
        >
          <Field label="Date" htmlFor="block-date">
            <Input id="block-date" name="date" type="date" required className="w-36" />
          </Field>
          <Field label="Motif (optionnel)" htmlFor="block-reason">
            <Input id="block-reason" name="reason" maxLength={200} placeholder="Vacances" />
          </Field>
          <Button type="submit" size="sm" disabled={busy} className="h-10">
            Bloquer
          </Button>
        </form>

        <ul className="mt-5 flex flex-col gap-px overflow-hidden rounded-md border border-line">
          {blocks.length === 0 && (
            <li className="bg-bg px-4 py-6 text-center text-xs text-muted">Aucun jour bloqué à venir.</li>
          )}
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between bg-bg px-4 py-2.5">
              <span className="text-xs">
                <span className="font-mono">{b.date}</span>
                {b.reason && <span className="ml-2 text-muted">{b.reason}</span>}
              </span>
              <button
                onClick={() => void call(`/api/admin/calendar/blocks?id=${b.id}`, "DELETE")}
                disabled={busy}
                className="text-xs text-faint hover:text-danger"
                aria-label="Débloquer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="md:col-span-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
