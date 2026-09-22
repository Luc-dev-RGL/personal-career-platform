# Performance

La richesse fonctionnelle (CMS, CRM, réservation, chatbot, messagerie) ne doit pas dégrader l'expérience : la performance est traitée à chaque étage — rendu, réseau, base de données, images.

## Rendu : Server Components par défaut

- **Toutes** les pages (public et admin) sont des Server Components ; le JavaScript client est confiné aux îlots interactifs : formulaires, kanban drag & drop, calendrier de réservation, widget chatbot, dropdown notifications, tracker analytics.
- Conséquences : bundle JS client réduit, hydratation minimale, rendu des listes et du contenu éditorial entièrement serveur.
- Les pages qui lisent la base sont explicitement dynamiques (`force-dynamic`) — contenu personnel cohérent avec les mutations admin ; les lectures passent par le cache Redis pour éviter de rejouer les requêtes à chaque visite (voir Cache).

## Cache Redis (cache-aside)

Implémentation : `lib/cache/index.ts`, invalidation via `lib/public-data.ts`.

- Toutes les lectures publiques (profil, projets, articles, compétences, expériences, services) passent par un cache Redis **TTL 60 s**.
- Toute écriture admin **invalide explicitement** les groupes de clés concernés (pattern `cache:projects:*`, etc.) : le contenu publié apparaît immédiatement, sans stalence au-delà du TTL.
- Effet : les visites répétées ne rejouent aucune requête PostgreSQL — le coût serveur par visiteur est quasi nul, la latence est celle d'un GET Redis (ou d'une Map mémoire en dev).

## Base de données : index & requêtes

- **Index composites** sur chaque chemin de requête réel (détail et justifications dans [DATABASE.md](./DATABASE.md)) :
  - `Project(authorId, status, createdAt)` — liste publique et admin ;
  - `Article(authorId, published, createdAt)` — liste publique ;
  - `Appointment(authorId, status, dateTime)` — agenda et détection de conflits ;
  - `Message(conversationId, createdAt)` — fil de discussion ;
  - `Notification(authorId, isRead, createdAt)` — compteur de non-lues ;
  - `PageView(authorId, createdAt)` + `PageView(path)` — analytics.
- **Requêtes sélectives** : `select` explicite sur les colonnes lues (pas de `SELECT *` implicite), `include` ciblés.
- **Pagination** sur les listes exposées (`/api/admin/media` : 24/page avec métadonnées de pagination) ; les listes du dashboard sont bornées (`take: 4`).
- Le moteur de slots de réservation (`lib/booking/slots.ts`) est borné (fenêtre max 92 jours) et les rendez-vous chargés sont restreints au mois demandé.

## Images : pipeline maîtrisé

Flux : upload → validation (magic bytes) → **Sharp** (rotation EXIF, resize max 1600 px) → **WebP qualité 82** → stockage → `next/image`.

- `next/image` génère les variantes **AVIF/WebP responsives** avec `sizes` adaptées au layout (ex. médiathèque : `(max-width: 640px) 50vw, 25vw`), lazy loading par défaut et anti-layout-shift (dimensions connues).
- Poids typique d'une capture 1600 px : ~150-250 Ko en WebP contre 800 Ko+ en JPEG source.
- `remotePatterns` restreint les images distantes aux domaines de stockage autorisés (Vercel Blob).

## Front-end

- **Polices** : `next/font/google` (Space Grotesk, Inter, JetBrains Mono) — self-hosted, préchargées, `display: swap` (zéro FOIT, pas de requête Google à l'exécution).
- **Animations sobres** : transitions CSS (hover, focus) + un IntersectionObserver partagé pour le reveal au scroll — pas de librairie d'animation, pas de scroll-jacking ; `prefers-reduced-motion` désactive tout.
- **Aucune librairie UI externe** : le design system maison réduit le CSS livré (Tailwind JIT + tokens custom properties).
- **Analytics first-party** : un ping par page (dédupliqué 30 s), `keepalive` — pas de script tiers (aucun tracker externe à charger, privacy friendly).

## IA : coût et latence maîtrisés

- Le pipeline RAG n'appelle Gemini qu'au strict nécessaire : un embedding de question par requête chat + un appel de génération ; les embeddings du corpus sont **précalculés à l'écriture admin** (pas de vectorisation à chaud).
- Recherche vectorielle en mémoire : quelques centaines de comparaisons cosinus (< 1 ms) — pas d'aller-retour supplémentaire.
- Réponses bornées (`maxOutputTokens: 600`, température 0.4) : réponses courtes et factuelles, coût par requête maîtrisé.
- Rate limiting `/api/chat` (12/5 min/IP) : le budget API ne peut pas être épuisé par un seul visiteur.

## Mesure

- Audit Lighthouse à l'issue du développement (cibles : Performance/Accessibilité/Bonnes pratiques/SEO ≥ 90 sur les pages publiques).
- Points de vigilance couverts : LCP (hero textuel léger + images optimisées `priority` éventuelle), CLS (dimensions d'images connues, polices `swap`), TBT (JS client minimal).
- Monitoring : logs serveur préfixés par module (`[chat]`, `[rag]`, `[booking]`, `[redis]`) — observables dans les logs Vercel ; chaque dégradation gracieuse (Redis absent, Gemini non configuré) est loggée explicitement.
