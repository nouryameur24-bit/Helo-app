# Hēlo

> Le Yuka de la grossesse — scanner de cosmétiques, aliments et médicaments
> avec verdict trimestre-spécifique.

## Stack

- **Frontend** : Expo 54 / React Native 0.81 / React 19 / Expo Router 6 / TypeScript strict
- **Backend** : Supabase (Postgres + RLS + Edge Functions Deno)
- **AI** : Anthropic Claude (chat assistant) + Google Vision (OCR)
- **Subscription** : RevenueCat
- **Monitoring** : Sentry

## Démarrage

Ce paquet vit dans un monorepo pnpm. Depuis la racine du monorepo :

```bash
pnpm install
# Renseigner les variables ci-dessous dans artifacts/helo/.env
pnpm --filter @workspace/helo run dev
```

Depuis `artifacts/helo/` directement :

```bash
pnpm dev
```

## Variables d'environnement

À placer dans `artifacts/helo/.env` (jamais commit).

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key (protégée par RLS) |
| `EXPO_PUBLIC_RC_KEY_IOS` | RevenueCat iOS (optionnel) |
| `EXPO_PUBLIC_RC_KEY_ANDROID` | RevenueCat Android (optionnel) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (optionnel) |

Secrets serveur (Supabase Edge Functions, jamais dans le bundle client) :

- `ANTHROPIC_API_KEY` — utilisé par l'Edge Function `chat`
- `GOOGLE_VISION_KEY` — utilisé par l'Edge Function `ocr`
- `SUPABASE_SERVICE_ROLE_KEY`

Configurés via :

```bash
supabase secrets set ANTHROPIC_API_KEY=… GOOGLE_VISION_KEY=… SUPABASE_SERVICE_ROLE_KEY=…
```

## Architecture

Voir `docs/ARCHITECTURE.md` et `docs/SECURITY.md`.

```
app/              # Routes Expo Router (59 écrans)
components/       # Composants UI (94 fichiers)
lib/              # Logique métier (34 modules)
hooks/            # Hooks React (14 modules)
constants/        # Constants & theme (couleurs, typo, disclaimers)
supabase/         # Schémas SQL + Edge Functions (chat, ocr)
__tests__/        # Tests Jest (15 suites, 191 tests)
```

## Commandes

Depuis `artifacts/helo/` :

| Commande | Effet |
|---|---|
| `pnpm dev` | Démarre Expo dev server |
| `pnpm typecheck` | Vérifie les types TS (`tsc --noEmit`) |
| `pnpm test` | Lance Jest |
| `npx jest --silent` | Exécute la suite complète sans logs |

Depuis la racine du monorepo, préfixer par `pnpm --filter @workspace/helo run …`.

## Déploiement

- **App iOS** : `eas build --platform ios --profile production`
- **App Android** : `eas build --platform android --profile production`
- **Edge Functions** : `supabase functions deploy chat && supabase functions deploy ocr`
  (sans `--no-verify-jwt` — les fonctions exigent un JWT Supabase valide)
- **Migrations SQL** : `supabase db push`

## Sécurité

- Toutes les tables Supabase ont RLS activée.
- Authentification anonyme Supabase (`supabase.auth.signInAnonymously`) — chaque
  utilisateur reçoit un `auth.uid()` persisté côté client via AsyncStorage.
- Les clés API Anthropic et Google Vision vivent uniquement côté serveur
  (Edge Functions Deno). Le client appelle `lib/anthropic.ts` / `lib/visionScan.ts`
  qui invoquent les fonctions avec le JWT utilisateur.
- Rate limiting atomique : 50 chat/jour, 100 ocr/jour par utilisateur, via la
  RPC `consume_api_quota` (verrou `pg_advisory_xact_lock`).
- Inputs utilisateur validés (taille image, nombre de messages, longueur texte)
  avant d'atteindre les API externes.
- Crash reporting Sentry actif uniquement en production (`__DEV__` exclu).
