/**
 * Pipeline d'upload sécurisé des médias.
 *
 * Sécurité (défense en profondeur) :
 * 1. Liste blanche de MIME types (jpeg, png, webp, avif uniquement)
 * 2. Vérification des "magic bytes" du fichier réel — pas seulement
 *    du nom ou du Content-Type déclaré par le client (qui est falsifiable)
 * 3. Limite de taille stricte (8 Mo)
 * 4. Re-encodage complet via Sharp : tout payload malveillant est
 *    détruit car l'image livrée est générée par le pipeline
 * 5. Nom de fichier généré côté serveur (uuid) — jamais le nom client
 *
 * Performance : resize max 1600px + export WebP (qualité 82) —
 * consommé ensuite par next/image (AVIF/WebP responsives).
 */
import "server-only";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Signatures binaires (magic bytes) des formats autorisés. */
function detectMagicBytes(header: Buffer): string | null {
  if (header.length < 12) return null;

  // JPEG : FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e &&
    header[3] === 0x47 && header[4] === 0x0d && header[5] === 0x0a &&
    header[6] === 0x1a && header[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP : "RIFF"...."WEBP"
  if (
    header.subarray(0, 4).toString("ascii") === "RIFF" &&
    header.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  // AVIF :...."ftypavif"
  if (header.subarray(4, 8).toString("ascii") === "ftyp" &&
      header.subarray(8, 12).toString("ascii").startsWith("avif")) {
    return "image/avif";
  }
  return null;
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  mime: string; // image/webp après re-encodage
}

/**
 * Valide et re-encode une image uploadée.
 * Lève une Error avec un message français si invalide.
 */
export async function processImageUpload(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Fichier trop volumineux (maximum : 8 Mo)");
  }

  const declaredType = file.type;
  if (!ALLOWED_MIME.has(declaredType)) {
    throw new Error("Format non autorisé (JPEG, PNG, WebP ou AVIF uniquement)");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Vérification du contenu réel (magic bytes)
  const detected = detectMagicBytes(inputBuffer);
  if (!detected || detected !== declaredType) {
    throw new Error("Le contenu du fichier ne correspond pas à son format déclaré");
  }

  // Re-encodage Sharp (détruit tout payload embarqué)
  const webp = await sharp(inputBuffer)
    .rotate() // respecte l'orientation EXIF
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: webp.data,
    width: webp.info.width,
    height: webp.info.height,
    size: webp.data.length,
    mime: "image/webp",
  };
}

/**
 * Stocke l'image traitée. Local (./public/uploads) en dev ;
 * Vercel Blob en production si BLOB_READ_WRITE_TOKEN est défini
 * (filesystem Vercel read-only — documenté dans ARCHITECTURE.md).
 */
export async function storeImage(image: ProcessedImage): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${randomUUID()}.webp`, image.buffer, {
      access: "public",
      contentType: image.mime,
      token: blobToken,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, filename), image.buffer);
  return `/uploads/${filename}`;
}

/** Supprime un fichier local (ne fait rien pour les URLs blob). */
export async function deleteStoredImage(publicPath: string): Promise<void> {
  if (publicPath.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", publicPath);
    await unlink(filePath).catch(() => {});
  }
}
