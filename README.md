# Personal Career Platform

Bien plus qu'un portfolio : une véritable application SaaS personnelle construite dans le cadre du challenge technique 24 h. Le site public est la vitrine ; derrière, un espace d'administration complet pilote le contenu, les prospects, les rendez-vous, la messagerie et un assistant IA branché sur une architecture RAG.

![Stack](https://img.shields.io/badge/Next.js_16-App_Router-black) ![Prisma](https://img.shields.io/badge/Prisma_5-PostgreSQL_(Neon)-blue) ![IA](https://img.shields.io/badge/Gemini-RAG-orange)

---

## Démarrage rapide

### Prérequis

- Node.js 20+ et npm
- Une base PostgreSQL managée — [Neon](https://neon.tech) (gratuit) recommandée
- (Optionnel en dev) Redis — [Upstash](https://upstash.com) ; sans `REDIS_URL`, un fallback mémoire équivalent est utilisé automatiquement
- (Optionnel en dev) une clé [Gemini](https://aistudio.google.com/apikey) pour le chatbot

### Installation

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env
#    → renseigner DATABASE_URL (Neon) et AUTH_SECRET (openssl rand -base64 48)
#    → GEMINI_API_KEY et REDIS_URL peuvent rester vides en dev

# 3. Schéma de base de données
npx prisma migrate deploy      # applique les migrations
# ou, pour initialiser une base neuve en dev :
npx prisma migrate dev

# 4. Compte administrateur
npm run admin:create
#    → ADMIN_EMAIL/ADMIN_PASSWORD depuis .env, ou mot de passe fort
#      généré et affiché une seule fois

# 5. Données de démonstration (optionnel)
npm run seed

# 6. Lancer
npm run dev                    # http://localhost:3000
```

Espace d'administration : `/admin` (connexion via `/connexion`).

## Fonctionnalités

| Module | Public | Admin |
|---|---|---|
| **CMS portfolio** | Accueil narratif, projets, articles | Profil, projets, expériences, compétences, articles, médiathèque (upload Sharp/WebP) |
| **Réservation** | Service → calendrier → créneau → confirmation | Services, horaires récurrents, jours bloqués, accepter/refuser |
| **Mini-CRM** | Formulaire de contact → création automatique d'un lead | Pipeline kanban (6 étapes, drag & drop), notes, historique d'événements |
| **Chatbot IA (RAG)** | Widget flottant | Configuration (nom, ton, accueil), resynchronisation de la base de connaissances |
| **Messagerie** | Suivi public de conversation par token privé | Fil de discussion, réponse, notifications |
| **Analytics** | — | Visites 30 jours, pages top, sources de trafic (first-party, RGPD-friendly) |

## Scripts

```bash
npm run dev           # serveur de développement
npm run build         # build de production
npm run start         # serveur de production
npm run lint          # ESLint
npm run admin:create  # création/réinitialisation du compte admin (aucun secret en dur)
npm run seed          # données de démonstration idempotentes
npm run db:deploy     # prisma migrate deploy
npm run db:studio     # explorateur Prisma Studio
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — architecture globale, décisions techniques, pipeline RAG, temps réel
- [DATABASE.md](./DATABASE.md) — schéma Prisma commenté, choix de modélisation, index
- [SECURITY.md](./SECURITY.md) — authentification, RBAC, rate limiting, XSS/CSRF, upload sécurisé, headers
- [PERFORMANCE.md](./PERFORMANCE.md) — cache Redis, images, Server Components, index, pagination

## Déploiement Vercel

1. Pousser le dépôt sur GitHub, importer dans Vercel.
2. Renseigner les variables d'environnement (cf. `.env.example`) : `DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, `REDIS_URL`, `NEXT_PUBLIC_SITE_URL`, `BLOB_READ_WRITE_TOKEN`.
3. Appliquer les migrations sur la base de production : `npx prisma migrate deploy` (en local, pointé sur Neon).
4. Créer le compte admin : `npm run admin:create` (en local, pointé sur Neon).
5. Déployer — les images uploadées passent automatiquement sur Vercel Blob dès que `BLOB_READ_WRITE_TOKEN` est défini (le filesystem Vercel est read-only).

## Choix notables

- **Authentification maison** : token opaque 256 bits en cookie httpOnly, hash SHA-256 en base — révocation immédiate, zéro dépendance externe (justification complète dans SECURITY.md).
- **Temps réel par polling incrémental** : fiable et économique sur Vercel serverless (comparaison avec SSE/WebSocket dans ARCHITECTURE.md).
- **RAG synchronisé au contenu** : chaque écriture admin resynchronise les embeddings de la source concernée — le chatbot ne répond qu'à partir des données publiées réelles.
- **Dégradation gracieuse** : sans Redis ni clé Gemini, l'application reste pleinement fonctionnelle en développement (fallback mémoire, message explicite sur le chatbot) — le code produit n'emprunte jamais de raccourci.
