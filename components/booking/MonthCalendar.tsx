"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const WEEKDAYS = ["lu", "ma", "me", "je", "ve", "sa", "di"];

interface SlotsByDay {
  [date: string]: string[];
}

/**
 * Calendrier mensuel : charge les créneaux depuis le serveur
 * (/api/appointments/slots) et laisse choisir un jour puis une heure.
 */
export function MonthCalendar({
  serviceId,
  onSelect,
  onBack,
}: {
  serviceId: number;
  onSelect: (date: string, time: string) => void;
  onBack: () => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState<SlotsByDay>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedDay(null);

    fetch(`/api/appointments/slots?serviceId=${serviceId}&year=${year}&month=${month + 1}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? {});
      })
      .catch(() => {
        if (!cancelled) setSlots({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [serviceId, year, month]);

  /** Grille du mois : cases vides pour aligner le 1er (lundi = 0). */
  const grid = useMemo(() => {
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // lundi=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  }, [year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const canGoBack = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const daySlots = selectedDay ? (slots[selectedDay] ?? []) : [];

  return (
    <div>
      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        {/* Calendrier */}
        <div className="rounded-lg border border-line bg-elevated p-5">
          <div className="flex items-center justify-between">
            <button
              disabled={!canGoBack}
              onClick={() => {
                const m = month - 1;
                if (m < 0) {
                  setMonth(11);
                  setYear(year - 1);
                } else setMonth(m);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-sm text-muted transition hover:border-accent hover:text-accent disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Mois précédent"
            >
              ←
            </button>
            <p className="display text-sm font-semibold capitalize">{monthLabel}</p>
            <button
              onClick={() => {
                const m = month + 1;
                if (m > 11) {
                  setMonth(0);
                  setYear(year + 1);
                } else setMonth(m);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-sm text-muted transition hover:border-accent hover:text-accent"
              aria-label="Mois suivant"
            >
              →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <span key={d} className="label-mono !text-[0.55rem] text-center" aria-hidden>
                {d}
              </span>
            ))}
            {grid.map((date, i) => {
              if (!date) return <span key={`empty-${i}`} />;
              const count = slots[date]?.length ?? 0;
              const isSelected = selectedDay === date;
              return (
                <button
                  key={date}
                  disabled={count === 0}
                  onClick={() => setSelectedDay(date)}
                  className={cn(
                    "flex h-10 flex-col items-center justify-center rounded-md text-sm transition",
                    isSelected
                      ? "bg-accent font-semibold text-bg"
                      : count > 0
                        ? "border border-line text-ink hover:border-accent hover:text-accent"
                        : "text-faint"
                  )}
                  aria-label={`${count} créneau(x) le ${date}`}
                >
                  {Number(date.slice(-2))}
                </button>
              );
            })}
          </div>

          {loading && <p className="mt-4 text-center text-xs text-faint">Chargement des créneaux…</p>}
          {!loading && Object.keys(slots).length === 0 && (
            <p className="mt-4 text-center text-xs text-muted">
              Aucun créneau ce mois-ci — essayez le mois suivant.
            </p>
          )}
        </div>

        {/* Créneaux du jour choisi */}
        <div className="rounded-lg border border-line bg-elevated p-5">
          {!selectedDay ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-muted">
                Sélectionnez un jour disponible<br />
                dans le calendrier.
              </p>
            </div>
          ) : (
            <>
              <p className="label-mono">Créneaux — {selectedDay}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {daySlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => onSelect(selectedDay, time)}
                    className="rounded-md border border-line px-2 py-2.5 font-mono text-xs transition hover:border-accent hover:text-accent"
                  >
                    {time}
                  </button>
                ))}
              </div>
              {daySlots.length === 0 && (
                <p className="mt-4 text-xs text-muted">Plus de créneau disponible ce jour-là.</p>
              )}
            </>
          )}
        </div>
      </div>

      <button onClick={onBack} className="mt-8 text-sm text-muted transition hover:text-accent">
        ← Changer de service
      </button>
    </div>
  );
}
