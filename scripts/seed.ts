/**
 * Seed de démonstration — peuple la base avec un contenu réaliste
 * (projets, expériences, compétences, articles, services, agenda).
 * Usage : npm run seed
 * Idempotent : ne duplique pas les données si déjà présentes.
 */
import { db } from "../lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function main() {
  const admin = await db.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("Créez d'abord un admin : npm run admin:create");

  const existing = await db.project.count({ where: { authorId: admin.id } });
  if (existing > 0) {
    console.log("ℹ️  Données de démo déjà présentes — seed ignoré.");
    return;
  }

  // ——— Profil ———
  await db.profile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      name: "Luc",
      headline: "Développeur Full-Stack — Next.js · TypeScript · Prisma",
      bio: "Je conçois et développe des applications web complètes : architecture, base de données, API, interface et déploiement. J'aime les produits simples en surface et solides sous le capot.",
      location: "France · remote",
      availability: true,
      githubUrl: "https://github.com/Luc-dev-RGL",
    },
  });

  // ——— Projets ———
  const projects = [
    {
      slug: slugify("Portail de gestion bancaire"),
      title: "Portail de gestion bancaire",
      description:
        "Tableau de bord interne pour le suivi des dossiers de crédit : authentification SSO, rôles, journalisation complète et exports réglementaires.",
      content:
        "Application React + Node déployée en interne pour une équipe de 60 conseillers. J'ai conçu le schéma PostgreSQL (15 tables), l'API REST avec validation systématique et un moteur de permissions par rôle. Résultat : temps de traitement d'un dossier réduit de 40 %.",
      techTags: "React, Node.js, PostgreSQL, Docker",
      status: "published",
      domain: "bancaire",
    },
    {
      slug: slugify("Plateforme de suivi patient"),
      title: "Plateforme de suivi patient",
      description:
        "Application de suivi post-opératoire : questionnaires quotidiens, alertes aux soignants et statistiques de récupération, conformité RGPD santé.",
      content:
        "Front Next.js, backend NestJS, données hébergées en France. Le cœur du projet : un moteur de règles d'alerte configurable par les soignants, sans ligne de code.",
      techTags: "Next.js, NestJS, MySQL, Redis",
      status: "published",
      domain: "santé",
    },
    {
      slug: slugify("Marketplace artisanale"),
      title: "Marketplace artisanale",
      description:
        "Place de marché pour artisans français : catalogue, panier, paiements Stripe, tableau de bord vendeur et suivi logistique.",
      content:
        "Projet freelance de bout en bout : maquette, design system, développement, déploiement Vercel + Neon. 120 vendeurs actifs la première année.",
      techTags: "Next.js, Prisma, Stripe, Neon, Vercel",
      status: "published",
      domain: "e-commerce",
    },
  ];
  for (const { domain: _domain, ...p } of projects) {
    await db.project.create({ data: { ...p, authorId: admin.id } });
  }

  // ——— Expériences ———
  const experiences = [
    {
      title: "Développeur Full-Stack",
      company: "Studio numérique — Paris",
      location: "Paris",
      startDate: new Date("2023-09-01"),
      endDate: null,
      details:
        "Conception d'applications SaaS pour des clients bancaires et santé. Responsable de l'architecture technique et du déploiement.",
    },
    {
      title: "Développeur Backend",
      company: "Agence web — Lyon",
      location: "Lyon",
      startDate: new Date("2022-03-01"),
      endDate: new Date("2023-08-31"),
      details:
        "API REST, intégrations paiement, optimisation des performances et mise en place du CI/CD.",
    },
    {
      title: "Développeur Junior",
      company: "ESN — Nantes",
      location: "Nantes",
      startDate: new Date("2020-10-01"),
      endDate: new Date("2022-02-28"),
      details: "Développement d'applications métier et maintenance évolutive.",
    },
  ];
  for (const e of experiences) {
    await db.experience.create({ data: { ...e, authorId: admin.id } });
  }

  // ——— Compétences ———
  const skills = [
    { name: "TypeScript", level: 90, category: "Technique", order: 1 },
    { name: "Next.js / React", level: 90, category: "Technique", order: 2 },
    { name: "Node.js", level: 85, category: "Technique", order: 3 },
    { name: "PostgreSQL / Prisma", level: 85, category: "Technique", order: 4 },
    { name: "Redis", level: 75, category: "Technique", order: 5 },
    { name: "Docker", level: 70, category: "Outils", order: 1 },
    { name: "Git / CI-CD", level: 85, category: "Outils", order: 2 },
    { name: "Figma", level: 65, category: "Outils", order: 3 },
    { name: "Communication client", level: 80, category: "Soft skills", order: 1 },
    { name: "Rédaction technique", level: 75, category: "Soft skills", order: 2 },
  ];
  for (const s of skills) {
    await db.skill.create({ data: { ...s, authorId: admin.id } });
  }

  // ——— Articles ———
  const articles = [
    {
      slug: slugify("Structurer une API Next.js sans se noyer"),
      title: "Structurer une API Next.js sans se noyer",
      excerpt:
        "Routes API, server actions, validation : une organisation simple qui tient la charge et se défend en revue de code.",
      content:
        "Quand une application Next.js grandit, le premier réflexe est de tout mettre dans les route handlers. Mauvaise idée.\n\nMa règle : les route handlers reçoivent, valident (Zod) et délèguent. La logique métier vit dans des modules testables (lib/), la base est toujours interrogée via Prisma avec des requêtes paramétrées. Résultat : des fichiers courts, une logique réutilisable côté server actions ou cron, et une surface de test claire.\n\nLes garde-fous non négociables : validation systématique des entrées, pagination sur toute liste exposée, gestion d'erreurs centralisée sans fuite de stack trace.",
      published: true,
    },
    {
      slug: slugify("Redis en trois usages concrets"),
      title: "Redis en trois usages concrets",
      excerpt:
        "Cache de lectures, rate limiting et file d'attente légère : comment Redis simplifie la vie d'une application pleine de visiteurs.",
      content:
        "Trois usages couvrent 90 % des besoins :\n\n1. Le cache de lectures : les données du portfolio changent rarement, un TTL de 60 secondes suffit à absorber les pics.\n\n2. Le rate limiting : un compteur INCR avec expiration protège login et chatbot du brute-force à moindre coût.\n\n3. La coordination : compteurs de notifications non lues, flags de traitement… de petites clés évitent des requêtes SQL inutiles.\n\nLe piège classique : invalider le cache quand les données changent. Ma règle : toute écriture admin invalide explicitement les clés de lecture associées.",
      published: true,
    },
  ];
  for (const a of articles) {
    await db.article.create({ data: { ...a, authorId: admin.id } });
  }

  // ——— Services de réservation ———
  const services = [
    {
      name: "Appel de présentation",
      description: "30 minutes pour discuter de votre besoin et voir si nous pouvons travailler ensemble.",
      duration: 30,
      price: 0,
      active: true,
    },
    {
      name: "Consultation technique",
      description: "Une heure d'audit ou de conseil technique : architecture, revue de code, choix de stack.",
      duration: 60,
      price: 80,
      active: true,
    },
  ];
  for (const s of services) {
    await db.service.create({ data: { ...s, authorId: admin.id } });
  }

  // ——— Disponibilités : lun-ven, 9h-12h et 14h-17h30 ———
  for (const day of [1, 2, 3, 4, 5]) {
    await db.availability.createMany({
      data: [
        { dayOfWeek: day, startTime: "09:00", endTime: "12:00", isBlocked: false, authorId: admin.id },
        { dayOfWeek: day, startTime: "14:00", endTime: "17:30", isBlocked: false, authorId: admin.id },
      ],
    });
  }

  console.log("✅ Seed terminé : profil, 3 projets, 3 expériences, 10 compétences, 2 articles, 2 services, disponibilités.");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed:", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
