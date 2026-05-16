PROMPT 5 — Ajouter un README.md à la racine
[CONTEXTE]
Le repo n'a pas de README.md. À ajouter pour ton futur toi et tout collaborateur.

[OBJECTIF]
Créer artifacts/helo/README.md avec le contenu ci-dessous (à adapter si certains
détails diffèrent du repo réel).

[CONTENU EXACT À METTRE DANS LE FICHIER]

# Hēlo

> Le Yuka de la grossesse — scanner de cosmétiques, aliments et médicaments avec
> verdict trimestre-spécifique.

## Stack

- **Frontend** : Expo 54 / React Native 0.81 / React 19 / Expo Router 6 / TypeScript strict
- **Backend** : Supabase (Postgres + RLS + Edge Functions Deno)
- **AI** : Anthropic Claude (chat assistant) + Google Vision (OCR)
- **Subscription** : RevenueCat
- **Monitoring** : Sentry

## Démarrage
pnpm install
cp .env.example .env   # Compléter avec tes clés
pnpm dev

## Variables d'environnement

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key (protégée par RLS) |
| `EXPO_PUBLIC_RC_KEY_IOS` | RevenueCat iOS |
| `EXPO_PUBLIC_RC_KEY_ANDROID` | RevenueCat Android |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN |

Secrets serveur (Edge Functions, jamais dans le bundle client) :
- `ANTHROPIC_API_KEY`
- `GOOGLE_VISION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Architecture

Voir `docs/ARCHITECTURE.md` et `docs/SECURITY.md`.
app/              # Routes Expo Router (59 écrans)
components/       # Composants UI (105 fichiers)
lib/              # Logique métier (32 modules)
hooks/            # Hooks React (14 modules)
constants/        # Constants & theme
supabase/         # Schémas SQL + Edge Functions
tests/        # Tests Jest

## Commandes

| Commande | Effet |
|---|---|
| `pnpm dev` | Démarre Expo dev server |
| `pnpm typecheck` | Vérifie les types TS |
| `pnpm test` | Lance Jest |

## Déploiement

- App iOS : `eas build --platform ios --profile production`
- App Android : `eas build --platform android --profile production`
- Edge Functions : `supabase functions deploy chat && supabase functions deploy ocr`
- Migrations SQL : `supabase db push`

## Sécurité

- Toutes les tables ont RLS activée.
- Authentification anonyme Supabase (`supabase.auth.signInAnonymously`).
- Les clés API Anthropic et Google Vision sont stockées côté serveur (Edge Functions).
- Rate limiting : 50 chat/jour, 100 ocr/jour par utilisateur.
- Inputs utilisateur passés par `lib/validation.ts` avant Supabase / API externes.

[VÉRIFICATIONS]
- Le fichier existe à artifacts/helo/README.md.
- Les commandes documentées fonctionnent réellement (tester chacune).