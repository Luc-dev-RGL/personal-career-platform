"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

type Media = {
  id: number;
  filename: string;
  path: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
};

export function MediaManager({ media }: { media: Media[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/media", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Upload impossible : ${file.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'upload");
      }
    }
    router.refresh();
    setUploading(false);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer ce média ?")) return;
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Zone d'upload (drag & drop + sélection) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition ${
          dragOver ? "border-accent bg-accent-dim" : "border-line bg-elevated"
        }`}
      >
        <p className="text-sm text-muted">
          {uploading ? "Traitement & optimisation en cours…" : "Glissez vos images ici, ou"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => void upload(e.target.files)}
        />
        <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
          Choisir des fichiers
        </Button>
        <p className="label-mono !text-[0.58rem]">JPEG · PNG · WebP · AVIF — max 8 Mo — re-encodé en WebP</p>
      </div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Grille des médias */}
      {media.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Aucun média pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <div key={item.id} className="group overflow-hidden rounded-lg border border-line bg-elevated">
              <div className="relative h-32 w-full overflow-hidden bg-surface">
                <Image
                  src={item.path}
                  alt={item.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-xs font-medium" title={item.filename}>
                  {item.filename}
                </p>
                <p className="label-mono mt-0.5 !text-[0.52rem]">
                  {item.width ?? "?"}×{item.height ?? "?"} · {(item.size / 1024).toFixed(0)} Ko
                </p>
                <p className="label-mono !text-[0.52rem]">{formatDateTime(item.createdAt)}</p>
                <button
                  onClick={() => remove(item.id)}
                  className="mt-2 text-xs text-danger hover:underline"
                  aria-label={`Supprimer ${item.filename}`}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
