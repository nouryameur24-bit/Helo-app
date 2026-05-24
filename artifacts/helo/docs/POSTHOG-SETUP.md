# PostHog — Setup analytics

Le scaffolding analytics est déjà en place (`lib/analytics.ts`). Tant que la
clé n'est pas fournie, **chaque `track(...)` est un no-op silencieux** : zéro
crash, zéro logs, zéro réseau.

Ce guide explique comment activer l'envoi des events.

---

## 1. Créer le projet PostHog

1. Compte gratuit (1M events/mois) : <https://eu.posthog.com/signup>.
2. Créer un nouveau projet — région **EU** (RGPD-friendly).
3. Récupérer la **Project API key** dans `Project settings → Project API key`.
   Elle commence par `phc_…`.

> Plan gratuit suffit largement pour un usage app mobile en démarrage
> (~1M events/mois = ~30k MAU avec 30 events / utilisateur / mois).

---

## 2. Configurer les variables d'environnement

Deux variables publiques (préfixées `EXPO_PUBLIC_` pour être exposées côté
client) :

```
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Endroits où les ajouter selon l'environnement :

- **Local dev** : `.env` à la racine de `artifacts/helo/` (créer le fichier
  s'il n'existe pas — il est gitignored).
- **Replit** : `Tools → Secrets` → ajouter chaque clé.
- **EAS Build** : `eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value phc_...`
  (idem pour le host). Aussi déclarable dans `eas.json` → `build.production.env`.

> `EXPO_PUBLIC_POSTHOG_HOST` est optionnel (default = `https://eu.i.posthog.com`).
> À renseigner uniquement si vous utilisez l'instance US ou un self-hosted.

---

## 3. Installer la dépendance

La dépendance `posthog-react-native@^3.0.0` est déjà déclarée dans
`package.json`. Pour la résoudre :

```bash
cd artifacts/helo
pnpm install
```

> Le module est importé dynamiquement (`await import('posthog-react-native')`).
> Tant qu'il n'est pas installé, le wrapper retombe gracieusement sur no-op,
> donc la build reste verte même sans `pnpm install`.

---

## 4. Rebuild l'app

```bash
pnpm dev          # dev server local
# ou
pnpm exec eas build --profile preview --platform ios   # build native
```

Les events partent automatiquement vers PostHog dès le premier `app_opened`.

---

## 5. Events trackés

Source de vérité : `lib/analytics.ts` (`AnalyticsEvent` union type).

| Event                       | Where fired                                   | Useful props                            |
|-----------------------------|-----------------------------------------------|-----------------------------------------|
| `app_opened`                | `app/_layout.tsx` — boot                      | —                                       |
| `scan_started`              | `hooks/useScan.ts` — début pipeline           | `phase`, `isOffline`                    |
| `scan_completed`            | `hooks/useScan.ts` — chaque branche success   | `source`, `verdict`, `phase`            |
| `scan_verdict_shown`        | (à brancher dans `app/verdict/[scanId].tsx`)  | —                                       |
| `ghost_capture_initiated`   | (à brancher quand l'utilisateur tape "Photo") | —                                       |
| `ghost_capture_completed`   | `app/ocr-review.tsx` — après `ghostCaptureSave` | `category`, `verdict`, `ingredients_count` |
| `alternative_viewed`        | (à brancher dans `app/alternatives.tsx`)      | —                                       |
| `alternative_swap_tapped`   | (à brancher sur le CTA "Remplacer")           | —                                       |
| `paywall_viewed`            | `app/paywall.tsx` — mount                     | `trigger`                               |
| `paywall_purchased`         | `app/paywall.tsx` — purchase OK               | `plan`, `trigger`                       |
| `paywall_dismissed`         | (à brancher sur le close button)              | `trigger`                               |
| `chat_message_sent`         | `app/(tabs)/chat.tsx` — `handleSend`          | `is_premium`, `message_length`          |
| `onboarding_step_completed` | (à brancher dans `app/onboarding/*`)          | `step`                                  |
| `feature_discovered`        | (à brancher dans `hooks/useFeatureDiscovery`) | `feature_id`                            |

Pour étendre : ajouter l'event dans l'union `AnalyticsEvent` de
`lib/analytics.ts`, puis `track('mon_event', { … })` côté call-site.

---

## 6. Identifier l'utilisateur (optionnel)

Une fois la session anonyme Supabase établie :

```ts
import { identify } from '@/lib/analytics';

await identify(userId, { trimester, role });
```

PostHog liera tous les events précédents (anonymous) à ce `distinctId`.

---

## 7. Désactiver / opt-out

- **Build sans analytics** : ne pas définir `EXPO_PUBLIC_POSTHOG_KEY` →
  wrapper en mode no-op.
- **Opt-out runtime utilisateur** (à implémenter si besoin RGPD) : ajouter un
  toggle dans `app/(tabs)/profile.tsx` qui stocke un flag et l'utilise pour
  court-circuiter `track(...)` côté wrapper.
