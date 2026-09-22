import type { Metadata } from "next";
import { getProfile } from "@/lib/public-data";
import { ContactForm } from "@/components/public/ContactForm";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const profile = await getProfile().catch(() => null);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-14 md:grid-cols-[1fr_1.2fr]">
        <header>
          <p className="label-mono">Contact</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">
            Parlons de votre projet<span className="text-accent">.</span>
          </h1>
          <p className="mt-5 leading-relaxed text-muted">
            Décrivez votre besoin en quelques lignes : je réponds généralement
            sous 24 heures ouvrées. Pour une discussion immédiate, préférez la
            réservation d&apos;un appel.
          </p>

          <dl className="mt-10 flex flex-col gap-5 border-t border-line pt-8">
            {profile?.emailPublic && (
              <div>
                <dt className="label-mono !text-[0.6rem]">Email direct</dt>
                <dd className="mt-1 text-sm">{profile.emailPublic}</dd>
              </div>
            )}
            {profile?.githubUrl && (
              <div>
                <dt className="label-mono !text-[0.6rem]">GitHub</dt>
                <dd className="mt-1">
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    {profile.githubUrl.replace("https://", "")} ↗
                  </a>
                </dd>
              </div>
            )}
            {profile?.linkedinUrl && (
              <div>
                <dt className="label-mono !text-[0.6rem]">LinkedIn</dt>
                <dd className="mt-1">
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    {profile.linkedinUrl.replace("https://", "")} ↗
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </header>

        <ContactForm />
      </div>
    </div>
  );
}
