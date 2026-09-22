/**
 * Moteur de calcul des créneaux de réservation.
 *
 * Principe : à partir des disponibilités hebdomadaires (Availability),
 * des jours bloqués (DateBlock) et des rendez-vous existants, on
 * génère tous les créneaux libres d'une période pour un service donné.
 * Logique pure (aucun accès DB ici) → testable unitairement.
 */

export interface AvailabilitySlot {
  dayOfWeek: number; // 0 (dim) → 6 (samedi)
  startTime: string; // "09:00"
  endTime: string; // "17:30"
  isBlocked: boolean;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface SlotOptions {
  fromDate: Date; // début de période (généralement maintenant)
  days: number; // nombre de jours à couvrir
  durationMin: number; // durée du service
  availabilities: AvailabilitySlot[];
  blockedDates: string[]; // "2026-10-14"
  busy: BusyInterval[]; // rendez-vous existants
  stepMin?: number; // pas entre deux créneaux (défaut : durée)
}

/** Convertit "09:30" en minutes depuis minuit. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convertit minutes depuis minuit → "09:30". */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Clé locale "YYYY-MM-DD" (sans piège de timezone UTC). */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Génère les créneaux disponibles groupés par jour.
 * Retour : { "2026-10-05": ["09:00", "09:30"], ... }
 */
export function generateSlots(options: SlotOptions): Record<string, string[]> {
  const {
    fromDate,
    days,
    durationMin,
    availabilities,
    blockedDates,
    busy,
    stepMin = durationMin,
  } = options;

  const activeByDay = new Map<number, AvailabilitySlot[]>();
  for (const av of availabilities) {
    if (av.isBlocked) continue;
    const list = activeByDay.get(av.dayOfWeek) ?? [];
    list.push(av);
    activeByDay.set(av.dayOfWeek, list);
  }

  const blocked = new Set(blockedDates);
  const result: Record<string, string[]> = {};

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const day = new Date(fromDate);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    const key = dateKey(day);
    if (blocked.has(key)) continue;

    const windows = activeByDay.get(day.getDay());
    if (!windows) continue;

    const daySlots: string[] = [];

    for (const window of windows) {
      const startMin = timeToMinutes(window.startTime);
      const endMin = timeToMinutes(window.endTime);

      for (let m = startMin; m + durationMin <= endMin; m += stepMin) {
        const slotStart = new Date(day);
        slotStart.setMinutes(m);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMin);

        // créneau déjà passé ?
        if (slotStart <= fromDate) continue;

        // chevauche un rendez-vous existant ?
        const conflict = busy.some(
          (b) => slotStart < b.end && slotEnd > b.start
        );
        if (conflict) continue;

        daySlots.push(minutesToTime(m));
      }
    }

    if (daySlots.length > 0) result[key] = daySlots;
  }

  return result;
}
