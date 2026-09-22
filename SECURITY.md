# Sécurité

L'application gère une base de données, une authentification et un espace d'administration : la sécurité est traitée comme un ensemble de couches indépendantes (défense en profondeur). Chaque couche ci-dessous indique où elle est implémentée.

## Authentification (auth maison, sessions serveur)

Implémentation : `lib/auth/session.ts`, `lib/auth/password.ts`, `lib/auth/actions.ts`.

- **Login** : email + mot de passe → vérification **bcrypt (cost 12)** en base. Message d'erreur générique ("Identifiants incorrects") : impossible de distinguer un compte inexistant d'un mot de passe faux (pas d'énumération de comptes).
- **Session** : au login, un **token opaque de 32 octets** (`crypto.randomBytes`, 256 bits d'entropie) est généré côté serveur.
  - Le navigateur ne reçoit que le token, dans un cookie `httpOnly` (inaccessible au JavaScript → vol par XSS impossible), `SameSite=Lax` (non envoyé sur les requêtes cross-site) et `Secure` en production.
  - La base ne stocke que le **hash SHA-256 du token** : une fuite de la table `sessions` ne permet pas de rejouer les sessions (même logique que pour les mots de passe).
- **Vérification** : chaque requête protégée résout le token → hash → ligne de session → utilisateur en base, avec contrôle d'expiration. La révocation est **immédiate** (logout, changement de mot de passe, suppression en base).
- **Changement de mot de passe** (`/api/admin/password`) : vérifie l'ancien, exige une politique minimale (10+ caractères, majuscule, minuscule, chiffre), et **révoque toutes les autres sessions** de l'utilisateur dans la même transaction.
- **Zéro secret en dur** : le script de création admin lit `ADMIN_EMAIL`/`ADMIN_PASSWORD` depuis l'environnement ou génère un mot de passe fort affiché une seule fois. Le dépôt ne contient aucun identifiant (aucun `.env` versionné — `.gitignore` couvre `.env*`).

### Pourquoi pas NextAuth/Auth.js ?

Le sujet autorisait les deux. L'auth maison a été choisie pour : zéro dépendance, un flux de 60 lignes entièrement maîtrisé et défendable, et des sessions en base native (révocation réelle — les JWT de NextAuth, même en strategy database, restent autoportants côté client). La contrepartie assumée : réinventer les roues de NextAuth — réduit ici à un login unique admin.

## RBAC (contrôle d'accès)

- Le **middleware Edge** (`proxy.ts`) est un premier filtre : sans cookie de session, toute route `/admin/**` est redirigée vers `/connexion` et toute route `/api/admin/**` reçoit un `401` JSON. Il n'a **pas** accès à la base (Edge) — il ne fait que réduire la surface d'attaque.
- L'**autorité de sécurité** est la vérification serveur complète dans chaque page et chaque handler : `requireAdmin()` résout la session en base et exige `role === "admin"`.
- **Scoping propriétaire** : toutes les requêtes admin filtrent `where: { ..., authorId: session.userId }` — un admin ne peut lire/modifier/supprimer que ses propres données, y compris si l'application compte plusieurs comptes.

## Protection des API

Chaque handler applique la chaîne complète (voir `lib/security/admin.ts`, `lib/security/request.ts`) :

1. **Origine** (`checkOrigin`) : les POST/PUT/DELETE dont l'`Origin` ne correspond pas au `Host` sont rejetés (403) — les navigateurs envoient Origin sur les requêtes cross-site, ce qui neutralise un POST forgé (CSRF). Les Server Actions bénéficient en plus de la vérification native de Next.
2. **Validation Zod systématique** : aucun payload n'atteint Prisma sans être passé par un schéma strict (`lib/validations/schemas.ts`) — types, longueurs, formats (dates, heures HH:mm, UUID), énumérations (étapes CRM, statuts).
3. **Taille de payload limitée** : lecture du corps avec plafond (32–512 Ko selon l'endpoint, 8 Mo pour les uploads) — `readJsonWithLimit`.
4. **Méthodes HTTP explicites** : un handler n'exporte que les méthodes qu'il supporte.
5. **Erreurs propres** : les réponses d'erreur ne contiennent jamais de stack trace ; les détails techniques vont dans les logs serveur.
6. **Rate limiting Redis** (voir plus bas).

## Rate limiting (anti brute-force et anti-spam)

Implémentation : `lib/security/rate-limit.ts` (compteur `INCR` + `EXPIRE` Redis, clé `action:ip`, fallback mémoire en dev).

| Endpoint | Limite | Fenêtre | Risque couvert |
|---|---|---|---|
| `/connexion` (login) | 5 | 5 min | brute-force mot de passe |
| `POST /api/contact` | 5 | 10 min | spam de leads |
| `POST /api/appointments` | 8 | 10 min | spam de réservations |
| `GET /api/appointments/slots` | 60 | 60 s | scraping massif |
| `POST /api/chat` | 12 | 5 min | abus du coût Gemini |
| `POST /api/messages` | 10 | 5 min | spam de réponse visiteur |

L'IP client est extraite des headers proxy standards Vercel (`x-real-ip`, `x-forwarded-for`).

## XSS (cross-site scripting)

- **Aucun `dangerouslySetInnerHTML`** dans tout le projet : tout contenu utilisateur ou admin (description, article, message, note) est rendu par React, qui échappe automatiquement.
- Les articles/projects rendus "paragraphe par paragraphe" (`split("\n\n")`) : le texte reste du texte — pas de HTML arbitraire interprété.
- Le CSP (ci-dessous) limite les dégâts d'une éventuelle injection résiduelle.

## CSRF (cross-site request forgery)

- Cookies `SameSite=Lax` : le cookie de session n'est pas envoyé sur les POST cross-site.
- Vérification `Origin === Host` sur tous les endpoints mutatifs (origin check applicatif en plus de la protection native des Server Actions).
- Les endpoints publics (contact, réservation, messages, chat) sont donc doublement protégés tout en restant appelables par des clients non navigateurs (tests).

## Upload de fichiers sécurisé

Implémentation : `lib/storage/upload.ts` — cinq couches :

1. **Liste blanche de MIME types** (JPEG, PNG, WebP, AVIF).
2. **Vérification des magic bytes** du contenu réel — le `Content-Type` déclaré par le client est falsifiable, la signature binaire ne l'est pas. Un fichier renommé `.jpg` qui est un PDF/script est rejeté.
3. **Limite de taille** : 8 Mo.
4. **Re-encodage complet via Sharp** : l'image livrée est régénérée par le pipeline (resize max 1600 px, WebP q82) — tout payload malveillant embarqué (metadata piègées, buffer overflow) est détruit car l'octet de sortie provient de Sharp.
5. **Nom de fichier généré côté serveur** (UUID) : jamais le nom client (path traversal, collisions).

## Headers HTTP de sécurité

Configurés dans `next.config.ts` sur toutes les routes :

| Header | Valeur | Effet |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'` ; scripts/styles restreints ; `frame-ancestors 'none'` ; `form-action 'self'` | bloque les scripts externes, le framing (clickjacking) et les soumissions croisées |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS forcé 2 ans, sous-domaines inclus |
| `X-Content-Type-Options` | `nosniff` | empêche la réinterprétation des MIME types |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ne fuit pas les URLs internes vers les sites tiers |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | désactive les API sensibles du navigateur |
| `X-Frame-Options` | `DENY` | anti-framing redondant avec CSP |

## Gemini / IA

- La clé `GEMINI_API_KEY` est lue **uniquement côté serveur** (`lib/ai/gemini.ts` importé `server-only`, jamais dans un composant client) — elle n'apparaît jamais dans le bundle navigateur.
- Rate limiting dédié sur `/api/chat` (12 req/5 min/IP) : le coût de l'API Gemini ne peut pas être épuisé par un tiers.
- **Prompt système verrouillé** : le modèle ne répond qu'à partir du contexte récupéré en base ; le contexte est présenté comme des données (jamais des instructions) ; toute tentative d'injection dans la question du visiteur ne peut pas redéfinir le rôle du modèle ni dévoiler les instructions.
- Le chatbot répond en l'absence d'information qu'il n'a pas l'information — pas de hallucination par défaut.

## Gestion des secrets

- `.env` ignoré par Git (`.gitignore` couvre `.env*`) ; `.env.example` documente chaque variable **sans valeur réelle**.
- Aucun identifiant dans le code : le commit historique contenant un mot de passe en dur a été corrigé — le script `scripts/create-admin.ts` n'embarque plus aucun secret et génère un mot de passe fort si `ADMIN_PASSWORD` est vide.
- Secrets déployés uniquement via les variables d'environnement Vercel.

## Anti-automatisation

- **Honeypot** sur le formulaire de contact : champ `website` invisible des humains ; s'il est rempli, la requête reçoit une réponse neutre et rien n'est enregistré.
- Rate limiting (tableau ci-dessus) sur tous les endpoints publics.
- Analytics (`/api/track`) : validation stricte (path relatif + UUID), aucune donnée personnelle stockée.
