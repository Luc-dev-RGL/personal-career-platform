"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

/** Changement de mot de passe + purge des autres sessions. */
export function SettingsForms({ sessionsActive }: { sessionsActive: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: fd.get("current"), next: fd.get("next") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage({ type: "ok", text: "Mot de passe mis à jour. Vos autres sessions ont été révoquées." });
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-elevated p-6">
      <h2 className="display mb-1.5 text-sm font-semibold">Sécurité du compte</h2>
      <p className="mb-5 text-xs text-muted">
        Le nouveau mot de passe doit contenir au moins 10 caractères, une majuscule,
        une minuscule et un chiffre. Hash bcrypt (cost 12) en base.
      </p>
      <div className="flex flex-col gap-5">
        <Field label="Mot de passe actuel" htmlFor="pwd-current">
          <Input id="pwd-current" name="current" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="pwd-next">
          <Input id="pwd-next" name="next" type="password" required minLength={10} autoComplete="new-password" />
        </Field>

        {message && (
          <p
            className={`rounded-md border px-4 py-2.5 text-sm ${
              message.type === "ok" ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"
            }`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="label-mono !text-[0.6rem]">{sessionsActive} session(s) active(s)</span>
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "Changer le mot de passe"}
          </Button>
        </div>
      </div>
    </form>
  );
}
