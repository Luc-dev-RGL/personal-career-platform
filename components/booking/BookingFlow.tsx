"use client";

import { useState } from "react";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import { MonthCalendar } from "./MonthCalendar";
import { BookingForm } from "./BookingForm";

export interface PublicService {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
}

type Step = "service" | "slot" | "details" | "done";

/**
 * Flow de réservation en 3 étapes + confirmation.
 * Les créneaux sont TOUJOURS recalculés côté serveur
 * (/api/appointments/slots) : le client ne décide rien.
 */
export function BookingFlow({ services }: { services: PublicService[] }) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<PublicService | null>(null);
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);

  function reset() {
    setStep("service");
    setService(null);
    setSlot(null);
  }

  return (
    <div>
      {/* Fil d'étapes */}
      <ol className="mb-10 flex items-center justify-center gap-2" aria-label="Étapes de réservation">
        {["Service", "Créneau", "Détails"].map((label, i) => {
          const stepNames: Step[] = ["service", "slot", "details"];
          const current = stepNames.indexOf(step);
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[0.65rem]",
                  state === "done" && "bg-accent text-bg",
                  state === "active" && "border border-accent text-accent",
                  state === "todo" && "border border-line text-faint"
                )}
                aria-current={state === "active" ? "step" : undefined}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "label-mono !text-[0.6rem]",
                  state === "todo" && "text-faint"
                )}
              >
                {label}
              </span>
              {i < 2 && <span className="mx-2 h-px w-8 bg-line" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {/* Étape 1 : choix du service */}
      {step === "service" && (
        <div className="grid gap-4 md:grid-cols-2">
          {services.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
              Aucun service de réservation n&apos;est ouvert pour le moment.
            </p>
          )}
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setService(s);
                setStep("slot");
              }}
              className="group rounded-lg border border-line bg-elevated px-6 py-6 text-left transition hover:border-accent"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="display text-lg font-semibold transition group-hover:text-accent">
                  {s.name}
                </h3>
                <span className="label-mono shrink-0 !text-[0.6rem] text-accent">
                  {formatPrice(s.price)}
                </span>
              </div>
              {s.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
              )}
              <p className="label-mono mt-4 !text-[0.6rem]">
                Durée : {formatDuration(s.duration)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Étape 2 : calendrier + créneaux */}
      {step === "slot" && service && (
        <MonthCalendar
          serviceId={service.id}
          onSelect={(date, time) => {
            setSlot({ date, time });
            setStep("details");
          }}
          onBack={() => setStep("service")}
        />
      )}

      {/* Étape 3 : informations + confirmation */}
      {step === "details" && service && slot && (
        <BookingForm
          service={service}
          slot={slot}
          onBack={() => setStep("slot")}
          onDone={() => setStep("done")}
        />
      )}

      {/* Confirmation */}
      {step === "done" && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-accent/40 bg-accent-dim px-8 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl text-bg">
            ✓
          </span>
          <h2 className="display text-2xl font-semibold">Demande envoyée</h2>
          <p className="text-sm leading-relaxed text-muted">
            Votre demande pour <strong className="text-ink">{service?.name}</strong>
            {slot && (
              <>
                {" "}le{" "}
                <strong className="text-ink">
                  {new Date(slot.date + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </strong>{" "}
                à <strong className="text-ink">{slot.time}</strong>
              </>
            )}{" "}
            a été transmise. Elle sera confirmée sous peu — gardez un œil sur
            votre boîte mail.
          </p>
          <button
            onClick={reset}
            className="mt-2 text-sm text-accent hover:underline"
          >
            Prendre un autre rendez-vous
          </button>
        </div>
      )}
    </div>
  );
}
