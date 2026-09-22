/**
 * Schémas Zod — validation systématique de toutes les entrées
 * (formulaires et API). Chaque API publique ou admin parse ses
 * payloads avec un de ces schémas : rien n'atteint Prisma sans
 * être validé (protection injection / corruption de données).
 */
import { z } from "zod";

// ——— Auth ———
export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1).max(200),
    next: z
      .string()
      .min(10, "Le nouveau mot de passe doit faire au moins 10 caractères")
      .max(200)
      .regex(/[A-Z]/, "Doit contenir une majuscule")
      .regex(/[a-z]/, "Doit contenir une minuscule")
      .regex(/[0-9]/, "Doit contenir un chiffre"),
  });

// ——— Profil ———
export const profileSchema = z.object({
  name: z.string().min(1).max(120),
  headline: z.string().min(1).max(160),
  bio: z.string().max(4000),
  location: z.string().max(120).optional().nullable(),
  emailPublic: z.string().email().max(200).optional().nullable().or(z.literal("")),
  phonePublic: z.string().max(40).optional().nullable().or(z.literal("")),
  avatarUrl: z.string().max(500).optional().nullable().or(z.literal("")),
  resumeUrl: z.string().max(500).optional().nullable().or(z.literal("")),
  availability: z.boolean(),
  githubUrl: z.string().max(300).optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().max(300).optional().nullable().or(z.literal("")),
  websiteUrl: z.string().max(300).optional().nullable().or(z.literal("")),
});

// ——— Projets ———
export const projectSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(160),
  description: z.string().min(1, "La description est requise").max(600),
  content: z.string().max(20000).optional(),
  imageUrl: z.string().max(500).optional().nullable().or(z.literal("")),
  link: z.string().max(500).optional().nullable().or(z.literal("")),
  repoUrl: z.string().max(500).optional().nullable().or(z.literal("")),
  techTags: z.string().max(300).optional(),
  status: z.enum(["draft", "published"]),
});

export const projectUpdateSchema = projectSchema.partial();

// ——— Expériences ———
export const experienceSchema = z.object({
  title: z.string().min(1).max(160),
  company: z.string().min(1).max(160),
  location: z.string().max(160).optional().nullable().or(z.literal("")),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable().or(z.literal("")),
  details: z.string().max(4000).optional(),
});

// ——— Compétences ———
export const skillSchema = z.object({
  name: z.string().min(1).max(80),
  level: z.number().int().min(0).max(100),
  category: z.enum(["Technique", "Outils", "Soft skills"]).default("Technique"),
  order: z.number().int().min(0).max(999).default(0),
});

// ——— Articles ———
export const articleSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(400).optional(),
  content: z.string().min(1, "Le contenu est requis").max(50000),
  published: z.boolean().default(false),
});

// ——— Contact (public) ———
export const contactSchema = z.object({
  name: z.string().min(2, "Nom requis").max(120),
  email: z.string().email("Email invalide").max(200),
  company: z.string().max(160).optional().or(z.literal("")),
  message: z.string().min(10, "Message trop court").max(5000),
  // champ anti-bot invisible (doit rester vide)
  website: z.string().max(0).optional(),
});

// ——— Réservation (public) ———
export const appointmentSchema = z.object({
  serviceId: z.number().int().positive(),
  slot: z.string().datetime({ offset: true }),
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

// ——— Chatbot ———
export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
});

export const chatbotConfigSchema = z.object({
  assistantName: z.string().min(1).max(80),
  greeting: z.string().min(1).max(300),
  tone: z.string().max(120),
  extraContext: z.string().max(8000),
  enabled: z.boolean(),
});

// ——— Admin CRM ———
export const leadStageSchema = z.enum(["new", "contacted", "discussion", "proposal", "won", "lost"]);
export const leadUpdateSchema = z.object({
  stage: leadStageSchema.optional(),
  value: z.number().min(0).max(10_000_000).optional().nullable(),
});
export const leadNoteSchema = z.object({
  content: z.string().min(1).max(2000),
});

// ——— Admin agenda ———
export const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm requis"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm requis"),
  isBlocked: z.boolean().default(false),
});

export const serviceSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).optional().nullable(),
  duration: z.number().int().min(15).max(480),
  price: z.number().min(0).max(100000).optional().nullable(),
  active: z.boolean().default(true),
});

export const dateBlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional().or(z.literal("")),
});

export const appointmentDecisionSchema = z.object({
  id: z.number().int().positive(),
  decision: z.enum(["confirmed", "refused", "cancelled"]),
});

// ——— Messagerie admin ———
export const replySchema = z.object({
  conversationId: z.number().int().positive(),
  content: z.string().min(1).max(5000),
});

// ——— Utilitaires ———
/** Génère un slug URL depuis un titre (accent-insensible). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "sans-titre";
}
