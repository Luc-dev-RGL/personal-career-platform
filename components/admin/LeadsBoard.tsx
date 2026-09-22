"use client";

import Link from "next/link";
import { useState } from "react";
import { cn, LEAD_STAGE_LABELS } from "@/lib/utils";

type Lead = {
  id: number;
  name: string;
  company: string | null;
  email: string;
  stage: string;
  source: string | null;
  value: number | null;
  createdAt: string;
};

const STAGES = ["new", "contacted", "discussion", "proposal", "won", "lost"] as const;

const STAGE_STYLES: Record<string, string> = {
  new: "border-info/60",
  contacted: "border-line",
  discussion: "border-warning/50",
  proposal: "border-accent/60",
  won: "border-success/60",
  lost: "border-danger/50",
};

/** Couleur sémantique de chaque étape : point de colonne + compteur. */
const STAGE_DOTS: Record<string, string> = {
  new: "bg-info",
  contacted: "bg-line-strong",
  discussion: "bg-warning",
  proposal: "bg-accent",
  won: "bg-success",
  lost: "bg-danger",
};

/**
 * Kanban CRM avec drag & drop HTML5 natif.
 * Chaque déplacement déclenche PATCH /api/admin/leads/[id] (validé
 * + journalisé serveur). Boutons ← → en secours (accessibilité).
 */
export function LeadsBoard({ leads }: { leads: Lead[] }) {
  const [items, setItems] = useState(leads);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  async function moveStage(leadId: number, stage: string) {
    const lead = items.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;

    // Optimiste
    setItems((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // rollback
      setItems((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: lead.stage } : l)));
    }
  }

  function shiftStage(lead: Lead, direction: -1 | 1) {
    const idx = STAGES.indexOf(lead.stage as (typeof STAGES)[number]);
    const next = STAGES[Math.min(Math.max(idx + direction, 0), STAGES.length - 1)];
    void moveStage(lead.id, next);
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: "min-content" }}>
        {STAGES.map((stage) => {
          const stageLeads = items.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                if (dragging !== null) void moveStage(dragging, stage);
                setDragging(null);
              }}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-lg border bg-elevated/60 transition",
                dragOverStage === stage ? "border-accent" : "border-line"
              )}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="label-mono flex items-center gap-1.5 !text-[0.6rem]">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_DOTS[stage])} aria-hidden />
                  {LEAD_STAGE_LABELS[stage]}
                </p>
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[0.6rem]",
                    stage === "won" && "bg-success/20 text-success",
                    stage === "lost" && "bg-danger/20 text-danger",
                    stage === "new" && "bg-info-dim text-info",
                    stage === "discussion" && "bg-warning/15 text-warning",
                    stage === "proposal" && "bg-accent-dim text-accent",
                    stage === "contacted" && "bg-surface text-muted"
                  )}
                >
                  {stageLeads.length}
                </span>
              </div>

              <div className="flex min-h-24 flex-col gap-2 p-2.5">
                {stageLeads.length === 0 && (
                  <p className="px-2 py-4 text-center text-[0.7rem] text-faint">—</p>
                )}
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "cursor-grab rounded-md border bg-bg px-3 py-2.5 transition active:cursor-grabbing",
                      STAGE_STYLES[lead.stage],
                      dragging === lead.id && "opacity-40"
                    )}
                  >
                    <Link href={`/admin/leads/${lead.id}`} className="block">
                      <p className="text-xs font-semibold">{lead.name}</p>
                      {lead.company && <p className="mt-0.5 truncate text-[0.7rem] text-muted">{lead.company}</p>}
                      <p className="mt-1 truncate text-[0.68rem] text-faint">{lead.email}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="label-mono !text-[0.5rem]">{lead.source ?? "—"}</span>
                        {lead.value != null && lead.value > 0 && (
                          <span className="font-mono text-[0.6rem] text-accent">{lead.value} €</span>
                        )}
                      </div>
                    </Link>
                    <div className="mt-2 flex justify-between border-t border-line pt-1.5">
                      <button
                        onClick={() => shiftStage(lead, -1)}
                        className="text-[0.7rem] text-faint hover:text-accent"
                        aria-label="Étape précédente"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => shiftStage(lead, 1)}
                        className="text-[0.7rem] text-faint hover:text-accent"
                        aria-label="Étape suivante"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
