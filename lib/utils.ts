/** Concatène des classes conditionnelles (alternative légère à clsx). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Formate une date en français. */
export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(date)
  );
}

/** Formate un prix (0 → "Gratuit"). */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || price === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);
}

/** Formate une durée en minutes → "30 min" / "1 h 30". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** Échappe les caractères HTML (défense XSS en profondeur avant rendu brut). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Tronque un texte proprement. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Libellés français des statuts. */
export const LEAD_STAGE_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  discussion: "Discussion",
  proposal: "Proposition",
  won: "Gagné",
  lost: "Perdu",
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  refused: "Refusé",
  cancelled: "Annulé",
};

export const STATUS_COLORS: Record<string, "neutral" | "accent" | "success" | "danger" | "warning"> = {
  pending: "warning",
  confirmed: "success",
  refused: "danger",
  cancelled: "neutral",
  draft: "neutral",
  published: "success",
  new: "accent",
  contacted: "neutral",
  discussion: "warning",
  proposal: "accent",
  won: "success",
  lost: "danger",
};
