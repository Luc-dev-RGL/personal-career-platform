# Base de données

PostgreSQL (Neon) via Prisma 5. Schéma : [`prisma/schema.prisma`](./prisma/schema.prisma). Deux migrations : la fondation initiale puis `20260922190000_v2_sessions_profil_crm_ia_analytics` (sessions, profil, CRM enrichi, config chatbot, analytics).

## Vue d'ensemble des relations

```
User (1)
 ├─(1)─ Profile                    profil public du CMS
 ├─(N)─ Session                    sessions d'authentification (hash du token)
 ├─(N)─ Project ──(N)─ Media       projets + médias liés
 ├─(N)─ Experience                 parcours
 ├─(N)─ Skill                      compétences (catégorie + ordre)
 ├─(N)─ Article ──(N)─ Media       articles + médias liés
 ├─(N)─ Service ──(N)─ Appointment réservation
 ├─(N)─ Availability               créneaux récurrents (dayOfWeek 0-6)
 ├─(N)─ DateBlock                  jours entièrement bloqués
 ├─(N)─ Lead ─(N)─ LeadNote        mini-CRM
 │        └─(N)─ LeadEvent         journal d'événements du pipeline
 ├─(N)─ Conversation ─(N)─ Message messagerie (token de suivi visiteur)
 ├─(N)─ Notification               notifications dashboard
 ├─(N)─ KnowledgeChunk             base de connaissances RAG (embeddings)
 ├─(1)─ ChatbotConfig              configuration du chatbot
 └─(N)─ PageView                   analytics first-party
```

Toutes les relations pointent vers `User` en `onDelete: Cascade` (la suppression du compte efface proprement ses données) ; les liens `Media → Project/Article` sont en `SetNull` (supprimer un projet ne supprime pas ses fichiers).

## Choix de modélisation, modèle par modèle

### User & Session — authentification

```prisma
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  password String // hash bcrypt (cost 12) — jamais de mot de passe en clair
  role     String @default("admin") // "admin" | "visitor" (RBAC)
  ...
}
```

- Le **rôle est une chaîne stockée côté serveur** : la source de vérité du RBAC est la base, jamais le cookie. Un token volé ou forgé ne confère pas un rôle.
- `Session.tokenHash` est un **hash SHA-256 du token opaque** porté par le cookie : la table peut fuiter sans que les sessions soient réutilisables. `expiresAt` + index permettent aussi un nettoyage périodique.
- `Session.id` est un UUID (identifiant non prédictif d'une ligne de sécurité).

### Profile — le CMS du profil

Table séparée de `User` plutôt que colonnes ajoutées : les informations publiques éditoriales (nom, headline, bio, réseaux) n'ont rien à voir avec les données d'authentification. `availability` alimente le badge "Disponible" et le contexte du chatbot.

### Project & Article — contenu public

- `slug` **unique** : URLs lisibles (`/projets/slug`, `/articles/slug`), collision gérée applicativement par suffixe temporel.
- `Project.status` (`draft|published`) et `Article.published` : le brouillon n'apparaît jamais côté public ; les requêtes publiques filtrent `status = "published"`.
- `Project.techTags` en chaîne "a, b, c" : volontairement simple pour un délimiteur display-only ; une table `ProjectTag` serait la normalisation suivante si le filtrage par tag devenait une fonctionnalité (tri, recherche).
- `Article.excerpt` séparé du `content` : l'accroche des listes ne devrait pas dépendre d'un calcul sur le contenu.

### Booking : Service / Availability / DateBlock / Appointment

- `Availability` modélise la **récurrence hebdomadaire** (ex. tous les lundis 9h-12h). `isBlocked` permet de suspendre une plage sans la supprimer.
- `DateBlock` couvre les **exceptions ponctuelles** (congés) que la récurrence ne peut pas exprimer.
- `Appointment.dateTime` **et `endTime`** : la fin est matérialisée en colonne (calculée depuis la durée du service à la création) pour que la détection de chevauchement soit une simple comparaison d'intervalles indexés — pas de recalcul de durée à chaque vérification.
- `status` (`pending|confirmed|refused|cancelled`) : la demande de rendez-vous est un workflow, pas un simple enregistrement.
- La **cohérence anti double-réservation** est applicative : transaction au niveau d'isolation sérialisé re-vérifiant les chevauchements + les jours bloqués avant insertion (voir `app/api/appointments/route.ts`). Deux requêtes concurrentes ne peuvent pas prendre le même créneau.

### CRM : Lead / LeadNote / LeadEvent

- `Lead.stage` (`new|contacted|discussion|proposal|won|lost`) reflète le pipeline demandé par le sujet ; les valeurs sont validées par un enum Zod côté API.
- `LeadEvent` est le **journal d'audit** du prospect (création, changement d'étape, note) : on sait toujours quand et comment le prospect a évolué — séparation nette entre la donnée d'état (`Lead.stage`) et son historique (`LeadEvent`).
- `source` (contact_form, booking, manual) relie le lead à son canal d'acquisition.
- `value` (montant estimé) permet l'agrégation d'affaires gagnées sur le dashboard.

### Messagerie : Conversation / Message

- `Conversation.visitorToken` (UUID unique) : le **suivi public** de la conversation par le visiteur, sans compte ni mot de passe. Le token est opaque, communiqué une fois après le premier message ; il identifie la conversation sans exposer d'identifiant interne prédictif.
- `Message.isFromVisitor` oriente le rendu du fil (gauche/droite) ; `readByAdmin` alimente le compteur de messages non lus.
- `Conversation.authorId` nullable : prêt pour un multi-candidat, l'admin actuel étant le propriétaire de toutes les conversations.

### RAG : KnowledgeChunk & ChatbotConfig

```prisma
model KnowledgeChunk {
  source    String // project | experience | article | profile | skill | custom
  sourceId  Int    // identifiant de la source (0 pour les sources collectives)
  content   String // passage ~800 chars
  embedding String // vecteur JSON (text-embedding-004, 768 dims)
  ...
  @@index([authorId, source, sourceId])
}
```

- Une ligne = un **passage** (pas un document) : le retrieval renvoie des fragments ciblés plutôt que des documents entiers.
- `(source, sourceId)` identifie la source d'origine → la **resynchronisation incrémentale** supprime et régénère uniquement les chunks de la source modifiée (`syncSource`).
- `embedding` en `String` (JSON sérialisé) : choix pragmatique documenté dans ARCHITECTURE.md — portabilité du schéma de dev, parsing négligeable à ce volume ; `pgvector` (colonne `vector(768)` + index HNSW) est l'évolution prévue.
- `ChatbotConfig` (1-1 avec User) : nom de l'assistant, message d'accueil, ton et contexte additionnel — injectés dans le prompt système côté serveur.

### Analytics : PageView

- Événement brut minimal : `path`, `referrer`, `visitorId` (UUID anonyme stocké côté navigateur, **aucune donnée personnelle**), `createdAt`.
- Les agrégations (par jour, par page, par référent) sont des `groupBy` exécutés à la volée sur 30 jours — suffisant à cette échelle ; une table d'agrégats précalculés serait l'étape suivante si le trafic croît.

## Index & intégrité

- Index composites sur chaque chemin de requête réel : listes admin (`authorId, createdAt`), filtres de statut (`authorId, status, createdAt` — Project/Lead/Appointment), recherche publique (`authorId, published, createdAt` — Article), fil de messages (`conversationId, createdAt`), notification badge (`authorId, isRead, createdAt`).
- Unicité fonctionnelle : `User.email`, `Project.slug`, `Article.slug`, `Session.tokenHash`, `Conversation.visitorToken`, `Profile.userId`, `ChatbotConfig.userId`.
- Migrations idempotentes : les colonnes `NOT NULL` ajoutées en v2 portent des `DEFAULT` et un backfill (slugs, tokens) — la migration reste sûre sur une base déjà peuplée.
