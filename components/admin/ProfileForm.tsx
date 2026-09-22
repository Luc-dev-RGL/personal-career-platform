"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";

type Profile = {
  name: string;
  headline: string;
  bio: string;
  location: string | null;
  emailPublic: string | null;
  phonePublic: string | null;
  avatarUrl: string | null;
  resumeUrl: string | null;
  availability: boolean;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
} | null;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      headline: fd.get("headline"),
      bio: fd.get("bio"),
      location: fd.get("location"),
      emailPublic: fd.get("emailPublic"),
      phonePublic: fd.get("phonePublic"),
      avatarUrl: fd.get("avatarUrl"),
      resumeUrl: fd.get("resumeUrl"),
      availability: fd.get("availability") === "on",
      githubUrl: fd.get("githubUrl"),
      linkedinUrl: fd.get("linkedinUrl"),
      websiteUrl: fd.get("websiteUrl"),
    };

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      setMessage({ type: "ok", text: "Profil enregistré — site public et base du chatbot mis à jour." });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="rounded-lg border border-line bg-elevated p-6">
        <h2 className="display mb-5 text-sm font-semibold">Informations principales</h2>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom affiché *" htmlFor="p-name">
              <Input id="p-name" name="name" defaultValue={profile?.name ?? ""} required maxLength={120} />
            </Field>
            <Field label="Titre / headline *" htmlFor="p-headline">
              <Input id="p-headline" name="headline" defaultValue={profile?.headline ?? ""} required maxLength={160} />
            </Field>
          </div>
          <Field label="Bio" htmlFor="p-bio" hint="Affichée sur l'accueil et injectée dans la base de connaissances du chatbot.">
            <Textarea id="p-bio" name="bio" defaultValue={profile?.bio ?? ""} rows={4} maxLength={4000} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Localisation" htmlFor="p-location">
              <Input id="p-location" name="location" defaultValue={profile?.location ?? ""} maxLength={120} />
            </Field>
            <Field label="Disponibilité" htmlFor="p-availability">
              <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface px-3">
                <input
                  id="p-availability"
                  name="availability"
                  type="checkbox"
                  defaultChecked={profile?.availability ?? true}
                  className="h-4 w-4 accent-[#ff6b2c]"
                />
                <span className="text-sm">Disponible pour opportunités</span>
              </label>
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-elevated p-6">
        <h2 className="display mb-5 text-sm font-semibold">Coordonnées publiques</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email public" htmlFor="p-email">
            <Input id="p-email" name="emailPublic" type="email" defaultValue={profile?.emailPublic ?? ""} />
          </Field>
          <Field label="Téléphone public" htmlFor="p-phone">
            <Input id="p-phone" name="phonePublic" defaultValue={profile?.phonePublic ?? ""} maxLength={40} />
          </Field>
          <Field label="GitHub" htmlFor="p-github">
            <Input id="p-github" name="githubUrl" defaultValue={profile?.githubUrl ?? ""} placeholder="https://github.com/…" />
          </Field>
          <Field label="LinkedIn" htmlFor="p-linkedin">
            <Input id="p-linkedin" name="linkedinUrl" defaultValue={profile?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/…" />
          </Field>
          <Field label="Site web" htmlFor="p-website">
            <Input id="p-website" name="websiteUrl" defaultValue={profile?.websiteUrl ?? ""} />
          </Field>
          <Field label="CV (URL)" htmlFor="p-resume">
            <Input id="p-resume" name="resumeUrl" defaultValue={profile?.resumeUrl ?? ""} />
          </Field>
        </div>
      </section>

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

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}
