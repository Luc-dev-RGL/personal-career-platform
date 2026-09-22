# Architecture

## Vue d'ensemble

```
VISITEUR                          CANDIDAT (admin)
   │                                    │
   ▼                                    ▼
Portfolio · Chatbot · Contact      /admin (CMS, CRM, agenda, messages, IA, stats)
   │                                    │
   └──────────────┬─────────────────────┘
                  ▼
           Next.js 16 (App Router)
     Server Components · Route Handlers · Server Actions
                  │
   ┌──────────────┼──────────────────┬─────────────────┐
   ▼              ▼                  ▼                 ▼
PostgreSQL      Redis             Gemini API       Sharp / Blob
(Neon +         (rate limiting,   (chat +          (images → WebP,
Prisma 5)       cache)            embeddings)      stockage médias)
```

## Frontend

- **Server Components par défaut** : toutes les pages publiques et l'admin rendent côté serveur ; le JavaScript client est limité aux îlots interactifs (formulaires, kanban drag & drop, widget chatbot, calendrier, dropdown notifications).
- **Route groups** : `app/(site)` (portfolio public, header/footer partagés, chatbot) distinct de `app/admin` (layout dédié sidebar + cloche) et de `app/connexion`. Le layout racine ne porte que les polices et le design system.
- **Design system** : tokens CSS custom properties (`app/globals.css`) + Tailwind 4 (`@theme inline`) — palette bleu nuit (#141E34) / accent orange unique (#FF6B2C), typographie Space Grotesk (display) / Inter (texte) / JetBrains Mono (labels). Composants UI maison (`components/ui/`) — pas de librairie de composants, contrôle total du style.
- **Composants courts** : aucun composant ne dépasse ~150 lignes ; les écrans complexes sont décomposés (`BookingFlow` → `MonthCalendar` + `BookingForm`, `LeadsBoard`, `CalendarManager` + `ServicesSection`…).
- **Accessibilité** : HTML sémantique, `aria-label`/`aria-live` sur le chat et les notifications, focus visible, `prefers-reduced-motion` respecté, cibles tactiles ≥ 44 px.

## Backend & API

Deux voies d'écriture, toutes deux validées et protégées :

1. **Route Handlers** (`app/api/**`) — endpoints REST utilisés par le front client :
   - publics : `POST /api/contact`, `POST /api/appointments`, `GET /api/appointments/slots`, `POST /api/chat`, `GET|POST /api/messages`, `POST /api/track`
   - admin : `app/api/admin/**` (CRUD contenu, CRM, agenda, chatbot, notifications…)
2. **Server Actions** (`lib/auth/actions.ts`) — login/logout : bénéficient de la vérification d'origine native de Next (anti-CSRF) et de `useActionState` côté client.

Chaque handler suit le même squelette :

```
guard (origin + session admin ou rate limit public)
  → parse/validate (Zod, limite de taille de payload)
  → logique métier (Prisma paramétré, transactions si multi-tables)
  → invalidation de cache + resync RAG si contenu
  → réponse JSON (erreurs propres, jamais de stack trace)
```

Pagination sur toute liste exposée (`/api/admin/media`, commentaires des listes admin limités), contrôle explicite des méthodes HTTP par handler (POST/PUT/GET/DELETE séparés).

## Base de données (Prisma / Neon)

PostgreSQL managé sur Neon, accès exclusivement via Prisma Client (requêtes paramétrées — aucune concaténation SQL). Le schéma détaillé et commenté est dans [DATABASE.md](./DATABASE.md). Points clés :

- 20 modèles couvrant les 5 modules + authentification (sessions serveur) et analytics.
- Index composites sur tous les chemins de requête (listes admin, filtrage par statut, tri chronologique).
- Transactions (`db.$transaction`) pour les opérations multi-tables sensibles : création contact (conversation + message + lead + événement), prise de rendez-vous (vérification anti-conflit sérialisée), changement de mot de passe (rotation hash + purge sessions).

## Infrastructure (Redis, cache, déploiement)

- **Redis (Upstash en prod, ioredis)** : deux usages —
  1. *rate limiting* : compteur `INCR` + `EXPIRE` par clé `action:ip` (login 5/5 min, contact 5/10 min, réservation 8/10 min, chat 12/5 min, slots 60/60 s) ;
  2. *cache de lectures* : données publiques du portfolio (TTL 60 s), invalidation explicite à chaque écriture admin (`lib/cache`, `lib/public-data`).
- **Dégradation gracieuse** : sans `REDIS_URL`, un fallback mémoire offre le même comportement applicatif en dev (portée limitée au process — documenté et assumé).
- **Stockage médias** : local (`public/uploads`) en dev ; **Vercel Blob** en production dès que `BLOB_READ_WRITE_TOKEN` est présent (filesystem Vercel read-only) — abstraction dans `lib/storage/upload.ts`, aucun changement de code au déploiement.
- **Déploiement Vercel** : migrations appliquées via `prisma migrate deploy`, secrets en variables d'environnement, monitoring via logs Vercel (les erreurs applicatives sont loggées côté serveur avec préfixes `[chat]`, `[rag]`, `[booking]`…).

## Intelligence artificielle (RAG, Gemini)

Le chatbot est un vrai pipeline retrieval-augmented generation (`lib/ai/rag.ts`) :

```
Contenu admin ──► SOURCES (profil, projets, expériences, compétences, articles, contexte additionnel)
                     │ chunking ~800 chars, chevauchement 100
                     ▼
                EMBEDDINGS (Gemini text-embedding-004, clé serveur uniquement)
                     │
                     ▼
                KnowledgeChunk (PostgreSQL, vecteur sérialisé + index source)
                     ▲
   question ──► embedding de la question ──► similarité cosinus ──► top-k (seuil 0.55)
                     │
                     ▼
   PROMPT SYSTÈME VERROUILLÉ + contexte ──► Gemini 2.0 Flash ──► réponse
```

- **Synchronisation continue** : chaque création/modification/suppression admin déclenche `syncSource()` — la base de connaissances reflète toujours le contenu publié. Bouton de resynchronisation complète dans `/admin/ai`.
- **Anti-hallucination** : sans passage pertinent au-dessus du seuil, le modèle répond qu'il n'a pas l'information dans les données publiques. Le fallback est explicite — jamais de réponse fabriquée.
- **Protection prompt injection** : le contexte est présenté comme des *données*, jamais comme des instructions ; le prompt système interdit de sortir du rôle, d'inventer et de dévoiler ses instructions.
- **Pourquoi la similarité cosinus côté serveur plutôt que pgvector ?** Le volume de chunks d'un portfolio (quelques centaines) rend le calcul en mémoire instantané sans dépendance d'extension ; `pgvector` est l'évolution naturelle documentée si le corpus croît (cf. Décisions techniques).

## Temps réel (choix justifié : polling incrémental)

Le sujet autorise polling, SSE ou WebSocket. J'ai choisi le **polling intelligent** :

- Le visiteur et l'admin interrogent uniquement les **messages postérieurs à un curseur** (`?after=lastId`) — payload quasi nul quand rien ne change.
- Sur Vercel serverless, une fonction SSE maintient une instance active (coût, cold starts, limite de durée) et WebSocket exige un serveur custom hors serverless. Le polling incrémental est le meilleur compromis fiabilité/coût à cette échelle, avec une fréquence basse (5 s visiteur, 30 s notifications admin).
- Évolution naturelle : bascule vers SSE si le besoin de latence sub-seconde apparaît — l'API est déjà cursor-based.

## Sécurité

Vue d'ensemble dans [SECURITY.md](./SECURITY.md) : auth maison (token opaque + hash SHA-256 en base), RBAC serveur sur chaque route admin, validation Zod systématique, rate limiting Redis, headers CSP/HSTS/nosniff, upload vérifié par magic bytes et re-encodage Sharp, honeypot anti-bot, échappement React (pas de `dangerouslySetInnerHTML` dans tout le projet).

## Performance

Détail dans [PERFORMANCE.md](./PERFORMANCE.md) : Server Components, cache Redis, index PostgreSQL, pagination, images Sharp → WebP via `next/image` (AVIF/WebP responsive), polices `next/font` (self-hosted, `display: swap`), JS client minimal.

## Décisions techniques

| Décision | Alternatives écartées | Justification |
|---|---|---|
| Auth maison (sessions DB) | NextAuth/Auth.js | Dépendance minimale, révocation immédiate, logique entièrement maîtrisée et défendable ligne par ligne ; pattern standard token opaque + hash |
| Polling incrémental cursor-based | SSE, WebSocket | Vercel serverless : pas de connexion persistante ; payload minimal ; évolution SSE triviale si besoin |
| Similarité cosinus en TypeScript | pgvector | Corpus portfolio = quelques centaines de chunks ; latence < 1 ms sans extension ; pgvector documenté comme évolution |
| Embeddings stockés en JSON (texte) | colonne float[] | Portabilité SQLite/PostgreSQL du schéma de dev ; parsing négligeable à ce volume ; float[] avec pgvector à l'étape suivante |
| Fallback mémoire Redis en dev | Redis obligatoire partout | Même code applicatif, zéro friction d'installation en dev ; la portée par instance est documentée |
| Stockage médias abstrait (local/Blob) | S3/R2 | Vercel Blob natif du runtime de déploiement ; l'interface `storeImage`/`deleteStoredImage` rend le changement de driver trivial |
| Composants UI maison | shadcn/ui, MUI | Identité visuelle 100 % maîtrisée (exigence de direction artistique du sujet) ; surface CSS réduite |
| Slugs uniques projet/article | IDs numériques dans les URLs | URLs lisibles et stables ; collision gérée par suffixe ; rendu public échappé par React |

### Avec 24 h supplémentaires, j'améliorerais

1. **pgvector + pagination vectorielle** : migration des embeddings vers `vector(768)` avec index HNSW pour une recherche à l'échelle.
2. **Streaming des réponses du chatbot** : `sendMessageStream` côté serveur + rendu progressif côté client pour un ressenti d'instantanéité.
3. **Tests automatisés** : suite Vitest sur `lib/booking/slots.ts` et le pipeline RAG (chunking/similarité), plus tests E2E Playwright sur les flows critique (login, réservation, contact).
