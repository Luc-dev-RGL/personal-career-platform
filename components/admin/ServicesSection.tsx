"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Card";
import { formatDuration, formatPrice } from "@/lib/utils";

type Service = {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  active: boolean;
};

/** Section de gestion des services réservables (agenda). */
export function ServicesSection({ services }: { services: Service[] }) {
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
    <section className="mb-10">
      <h2 className="display mb-4 text-sm font-semibold">Services proposés</h2>

      <form
        className="grid gap-3 rounded-lg border border-line bg-elevated p-5 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void call("/api/admin/services", "POST", {
            name: fd.get("name"),
            description: fd.get("description"),
            duration: Number(fd.get("duration")),
            price: fd.get("price") ? Number(fd.get("price")) : null,
            active: true,
          });
          e.currentTarget.reset();
        }}
      >
        <Field label="Nom du service *" htmlFor="svc-name">
          <Input id="svc-name" name="name" required maxLength={120} placeholder="Appel de présentation" />
        </Field>
        <Field label="Durée (min) *" htmlFor="svc-duration">
          <Input id="svc-duration" name="duration" type="number" min={15} max={480} step={15} defaultValue={30} required />
        </Field>
        <Field label="Prix (€)" htmlFor="svc-price" hint="0 ou vide = gratuit">
          <Input id="svc-price" name="price" type="number" min={0} defaultValue={0} />
        </Field>
        <Field label="Description" htmlFor="svc-desc">
          <Textarea id="svc-desc" name="description" rows={1} maxLength={600} className="!min-h-10" />
        </Field>
        <Button type="submit" disabled={busy} className="h-10">
          +
        </Button>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-px overflow-hidden rounded-lg border border-line">
        {services.length === 0 && (
          <li className="bg-bg px-5 py-8 text-center text-xs text-muted">
            Aucun service — ajoutez-en un pour ouvrir la réservation.
          </li>
        )}
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 bg-bg px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{s.name}</p>
              {s.description && <p className="truncate text-xs text-muted">{s.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="label-mono !text-[0.58rem]">
                {formatDuration(s.duration)} · {formatPrice(s.price)}
              </span>
              <button
                onClick={() => void call(`/api/admin/services?id=${s.id}`, "PUT")}
                disabled={busy}
              >
                <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Actif" : "Inactif"}</Badge>
              </button>
              <button
                onClick={() => void call(`/api/admin/services?id=${s.id}`, "DELETE")}
                disabled={busy}
                className="text-xs text-faint hover:text-danger"
                aria-label={`Supprimer ${s.name}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
