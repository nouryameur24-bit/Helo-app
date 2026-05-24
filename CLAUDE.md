# Hēlo — Project Memory for Claude

> **Tu lis ce fichier en premier à chaque nouvelle session.** Il contient le contexte
> projet, les décisions architecturales et l'état d'avancement. Si tu suis ces
> conventions, tu peux travailler sans re-explorer le code à chaque fois.

---

## 🎯 Projet en 30 secondes

**Hēlo** = Yuka-équivalent pour mamans enceintes. Marché FR, beta launch imminent.

- **Scan** : code-barres / ingrédients (OCR) / menu resto / ordonnance / photo
- **Verdict** : safe / caution / danger contextualisé par trimestre + allergies
- **Placard** : produits sauvegardés organisés par catégorie + Glow Score
- **Chat IA** : Sage-Femme IA (Claude Haiku) pour questions grossesse
- **Mode Partenaire** : pairing QR, vue read-only du placard de la maman

**Personas** :
- 👶 **Maman enceinte** (Sophie) — primary user
- 💛 **Accompagnant** (Thomas) — secondary, viral loop

---

## 🏗 Stack

| Couche | Tech |
|---|---|
| **Mobile** | React Native 0.81.5 + Expo SDK 54 + Expo Router 6 + TypeScript 5.9 strict |
| **State** | TanStack Query + React Context + AsyncStorage local |
| **Backend** | Express 5 + Anthropic SDK (Claude Haiku 4.5) + Supabase (Postgres) |
| **Auth/DB** | Supabase + Row-Level Security |
| **Analytics** | PostHog (`posthog-react-native ^3.0.0`) |
| **Crash reporting** | Sentry |
| **Paiement** | RevenueCat (`react-native-purchases`) |
| **Animations** | Reanimated 4.1 |
| **QR** | `react-native-qrcode-svg ^6.3.15` |
| **Build/Deploy** | EAS Build (iOS + Android) + Replit Autoscale (api-server) |
| **CI** | GitHub Actions (typecheck × 2 + 207 tests, 10min timeout) |

---

## 📂 Monorepo structure

```
Helo-app/                                # repo root
├── CLAUDE.md                            # ← ce fichier
├── artifacts/
│   ├── helo/                            # Mobile app (Expo)
│   │   ├── app/                         # Routes Expo Router
│   │   │   ├── _layout.tsx              # Root + PostHog + WhatsNewModal
│   │   │   ├── (tabs)/                  # 5 tabs (index, scan, shelf, chat, profile)
│   │   │   ├── onboarding/              # 9 écrans (role, profile, prefs, first-scan, partner-*)
│   │   │   ├── verdict/[scanId].tsx     # 788L — écran central post-scan
│   │   │   ├── paywall.tsx              # Premium gating
│   │   │   ├── partner-scan.tsx         # QR scanner
│   │   │   ├── partner-share.tsx        # QR display
│   │   │   ├── basket-{scan,results}    # Scan panier multi-produits
│   │   │   ├── shelf-scan.tsx           # Scan d'étagère (premium)
│   │   │   ├── {circle,community,pact,memories,voice,ar-mirror,scan-party}
│   │   │   │                            # Routes feature-flagged off → Coming Soon
│   │   │   └── legal/{terms,privacy}
│   │   ├── components/
│   │   │   ├── ui/                      # EmptyState, Button, Card, ThemedText, Badge
│   │   │   ├── home/                    # PartnerHomeScreen, GlowScoreSection,
│   │   │   │                            # MoreToolsSheet, GlowScoreDeltaToast
│   │   │   ├── shelf/                   # MonPlacardView, MaListeView, ShelfCard,
│   │   │   │                            # ShelfExplainerModal, LongPressHint
│   │   │   ├── partner/                 # PartnerHeroBadge, PartnerModeBadge, PartnerQRCard
│   │   │   ├── verdict/                 # VerdictBottomBar, IngredientsSection,
│   │   │   │                            # AcceptOverrideSheet, GhostCaptureModal, etc.
│   │   │   ├── chat/                    # RichChatContent (citations CRAT/ANSM/EFSA)
│   │   │   ├── onboarding/              # OnboardingCompleteModal, OnboardingProgress
│   │   │   ├── profile/                 # FeedbackSection, AccountActions (GDPR)
│   │   │   ├── scan/                    # MoreScanModesSheet, ScanControls
│   │   │   ├── ComingSoonScreen.tsx     # Feature-flagged fallback
│   │   │   └── WhatsNewModal.tsx        # Modal après update
│   │   ├── hooks/                       # 18 custom hooks
│   │   │   ├── useProfile, useScan, useShelfData
│   │   │   ├── usePremium, useTrimester, useBreastfeeding
│   │   │   ├── usePartnerRealtime, usePartnerNotifications, usePartnerStats
│   │   │   ├── useSafeBack (Lot 15B1)
│   │   │   ├── useChatUnread (Lot 16-10)
│   │   │   └── useNotifications, useOffline, useRecallAlerts
│   │   ├── lib/                         # ~40 utilitaires
│   │   │   ├── anthropic.ts             # Claude chat + detectEmergencySymptom
│   │   │   ├── productLookup.ts         # Matcher Belt & Bretelles
│   │   │   ├── glowscore.ts             # Algo Glow Score
│   │   │   ├── trimester.ts             # Phase enceinte (T1/T2/T3/breastfeeding)
│   │   │   ├── preferenceMatcher.ts     # Bump risk_level selon allergies
│   │   │   ├── userOverrides.ts         # "J'achète quand même"
│   │   │   ├── userPreferences.ts       # Allergies/dietary/cosmetic
│   │   │   ├── partnerStats.ts, partnerUtils.ts
│   │   │   ├── storageKeys.ts           # ⚠️ JAMAIS renommer une valeur RHS (production data)
│   │   │   ├── analytics.ts             # Wrapper PostHog typé
│   │   │   ├── posthog.ts               # Singleton PostHog
│   │   │   └── supabase.ts              # Client Supabase
│   │   ├── constants/
│   │   │   ├── theme.ts                 # Colors, Radius, Spacing, Shadows, Typography
│   │   │   ├── featureFlags.ts          # FEATURES const (tout false en v1.0)
│   │   │   ├── partnerTips.ts           # 254L tips co-parent par semaine
│   │   │   └── whatsNew.ts              # Changelog versionné (Lot 16-11)
│   │   ├── types/routes.ts              # ROUTES const + types
│   │   ├── __tests__/                   # 20 suites, 207 cas (110+ matcher)
│   │   ├── app.json                     # Expo config (version: 1.0.0)
│   │   ├── eas.json                     # dev/preview/production profiles
│   │   └── package.json
│   ├── api-server/                      # Express + Anthropic + Supabase
│   │   ├── src/routes/                  # scan, alternatives, ocr-cleanup, health
│   │   ├── src/lib/                     # Anthropic chat, ingredient parsing
│   │   └── src/middlewares/             # Auth, logging, rate limits
│   └── mockup-sandbox/
├── lib/                                 # Workspace shared (api-zod, db schemas)
├── scripts/
├── .github/workflows/ci.yml             # Typecheck + tests (10min timeout)
└── package.json                         # pnpm workspace root
```

---

## 📊 État d'avancement (Lots 1-16)

### ✅ Foundations (Lots 1-7)
- **Lots 1-3** — Quick wins, hardening, architecture (atomic RPCs, security)
- **Lots 4-5** — Tests fortress (35 → 110+ matcher cases) + CI GitHub Actions
- **Lots 6-7** — Pipeline insert hardening, dead code audit + feature flags (8 features gated)

### ✅ Quality polish (Lots 8-10)
- **Lot 8** — Design signature : Glow Score, mesh gradient paywall, dark mode infra
- **Lot 9** — Coverage observability + seed gaps + benchmark
- **Lot 10** — Ghost Capture polish : AI OCR cleanup + camera guidance + rewards

### ✅ Personalisation + Premium (Lots 11-12)
- **Lot 11** — Préférences (allergies/dietary/cosmetic) + PostHog Wizard + Partner realtime
- **Lot 12** — preferenceMatcher + detectEmergencySymptom + citations CRAT/ANSM/EFSA + Override "j'achète quand même"

### ✅ Mode Partenaire (Lot 13)
- QR pairing (`partner-scan` + `partner-share`)
- Push notifs (`usePartnerNotifications`)
- UX héros (`PartnerHeroBadge`)
- Placard partagé + badge "added_by_partner" 💛

### ✅ Onboarding magic moment (Lot 14)
- 5 slides killer features : moment → promise → restaurant → AI sage-femme → partner

### ✅ Navigation + IA simplification (Lot 15)
- **15A** : Modal onboarding-complete, Header "Mode accompagnant", Scan modes hiérarchisés (5 → primary+drop), Placard/Liste explainer
- **15B** : `useSafeBack`, verdict sticky header, modal headers, partner progress, router.back → replace (8 sites), Coming Soon (9 routes)
- **15C** : Home refonte 12 → 6 sections + MoreToolsSheet

### ✅ Beta-Ready Polish (Lot 16)
- Empty states + EmptyState component
- Pull-to-refresh (shelf)
- FeedbackSection (bug/idée/rate App Store)
- Skeleton loaders enrichis
- Copy "tu" partout
- Haptic success "add to shelf"
- Tab badge unread (`useChatUnread`)
- WhatsNewModal + changelog versionné
- Animation +N ✨ Glow Score change
- LongPressHint discoverability

---

## 🎨 Conventions à respecter (NE PAS DÉVIER)

### Code
- **TypeScript strict** — pas de `any`, utiliser `unknown` + type guards
- **`useSafeBack(fallback)`** au lieu de `router.back()` (Lot 15B1)
- **`router.replace()`** au lieu de `router.push()` pour les flows onboarding/notif (anti-pollution stack)
- **Storage keys via `STORAGE_KEYS`** (jamais string literal) — RHS jamais renommable
- **Analytics typed** : nouveaux events à ajouter dans `lib/analytics.ts` `AnalyticsEvent` type
- **`swallow()`** pour les erreurs non-critiques (analytics, haptics)
- **Pas de side-effects** dans `useMemo` / `useCallback`

### UX
- **Tu** (pas vous) côté user-facing — app intime grossesse
- **Haptics** sur actions clés (scan success, add to shelf, share, navigation)
- **Empty states** via `<EmptyState>` réutilisable (pas de View custom)
- **Feature-flagged screens** → toujours `<ComingSoonScreen>` (jamais `<Redirect>`)
- **Modals** : X en haut à droite + handle 4px barré en haut
- **Stacks** : chevron retour à gauche + titre centré
- **Partner mode** : `PartnerModeBadge variant="compact"` sur toutes les vues partager

### Architecture
- **Belt & Bretelles** matcher : déterministe → AI → indeterminate
- **3 RPC Supabase atomiques** : `merge_analysis_cache`, `upsert_product_keep_cache`, `ghost_capture_upsert`
- **Phase-aware cache** : `scanCacheKey(barcode, phase)` — versionné `v2`
- **Feature flags** : tout sous `isFeatureEnabled('feature')` — défault false en v1.0

---

## 🆕 Composants/hooks créés (référencer dans le code) 

| Composant | Path | Rôle |
|---|---|---|
| `EmptyState` | `components/ui/EmptyState.tsx` | Empty states partout (emoji + title + sub + CTA + suggestions) |
| `ComingSoonScreen` | `components/ComingSoonScreen.tsx` | Fallback feature-flagged routes |
| `OnboardingCompleteModal` | `components/onboarding/OnboardingCompleteModal.tsx` | Célébration "🎉 Setup terminé" après 1er scan |
| `OnboardingProgress` | `components/onboarding/OnboardingProgress.tsx` | Step X/Y pour partner onboarding |
| `PartnerModeBadge` | `components/partner/PartnerModeBadge.tsx` | Pastille "Accompagnant · {momName}" |
| `MoreScanModesSheet` | `components/scan/MoreScanModesSheet.tsx` | BottomSheet des modes scan secondaires |
| `ShelfExplainerModal` | `components/shelf/ShelfExplainerModal.tsx` | Modal Placard vs À acheter (1er visit) |
| `LongPressHint` | `components/shelf/LongPressHint.tsx` | Hint discoverability long-press |
| `MoreToolsSheet` | `components/home/MoreToolsSheet.tsx` | Outils secondaires home (Voyage, Timeline, etc.) |
| `GlowScoreDeltaToast` | `components/home/GlowScoreDeltaToast.tsx` | Animation +N ✨ quand score change |
| `WhatsNewModal` | `components/WhatsNewModal.tsx` | Modal après update version |
| `FeedbackSection` | `components/profile/FeedbackSection.tsx` | Aide & Feedback dans Profil |
| `useSafeBack` | `hooks/useSafeBack.ts` | Back centralisé avec fallback |
| `useChatUnread` | `hooks/useChatUnread.ts` | Compteur unread chat (singleton) |

---

## 📝 Storage keys récents (Lot 15-16)

```ts
pendingFirstScan: '@helo_pending_first_scan'        // Lot 15A1
firstScanCompleted: '@helo_first_scan_completed'    // Lot 15A1
shelfExplainerSeen: '@helo_shelf_explainer_seen'    // Lot 15A4
lastSeenVersion: '@helo_last_seen_version'          // Lot 16-11
shelfLongPressHintSeen: '@helo_shelf_long_press_hint_seen'  // Lot 16-13
```

---

## 🔜 Pending (P3 long terme)

| Tâche | Effort | Bloqueur |
|---|---|---|
| Task #15 PostHog test local + setup EAS secrets | 1h | API key EAS |
| **TestFlight upload** premier build | 2h | EAS secrets + Apple Developer ($99/an) |
| App Store assets (6 screenshots, description FR, keywords, privacy URL) | 4h | Maman designer ? |
| Dark mode complet | ~10h | Audit screen-by-screen sur device |
| Audit accessibilité VoiceOver | ~6h | iPhone physique + lecture humaine |
| iPad layout | ~8h | iPad physique |
| i18n EN/ES | ~20h+ | Traducteur humain (≈3000 strings) |
| Animations Lottie | variable | Designer pour .json files |
| Table Supabase `partner_shelf_events` (dédiée vs fallback `community_submissions`) | 2h | TODO `hooks/usePartnerRealtime.ts:108-120` |
| BDPM CSV import (~18k médicaments FR) | ~6h | Aucun |
| Affiliate IDs (Monoprix, Amazon, Bébé9) | variable | Inscription programmes affiliés |

---

## 🛠 Commandes utiles

```bash
# Typecheck mobile (TOUJOURS run après edits)
cd artifacts/helo && npx tsc --noEmit

# Tests
pnpm --filter helo test
# ou en CI : pnpm test  (root)

# Dev avec cache vidé (si Metro stale)
cd artifacts/helo && npx expo start --tunnel --clear

# Install deps (Replit + local)
cd artifacts/helo && pnpm install --ignore-scripts

# Git
git log --oneline -20         # voir les commits récents
git status --short            # voir modifs en attente

# Backend api-server (Replit Autoscale)
curl https://<replit-url>/api/healthz  # → "ok"
```

---

## ⚠️ Gotchas connus

1. **Tests Supabase warns** : 3 suites failent à cause d'env vars manquantes (`@supabase/supabase-js` validation URL). **Non bloquant** — 206/207 tests passent réellement.

2. **5 E-numbers critiques** ont été ajoutés via INSERT direct Supabase (pas dans le seed JSON) :
   - E951 (aspartame), E955 (sucralose), E621 (MSG), E950 (acésulfame K), E150d (caramel Coca)
   - Si tu re-seed la DB, vérifie qu'ils sont toujours là.

3. **PostHog Wizard** a généré des typos qu'on a corrigées :
   - `captureNativeAppLifecycleEvents` (pas `captureAppLifecycleEvents`)
   - `debug: false` retiré (option inexistante)

4. **Replit vs Local node_modules** : si tu ajoutes une dep, il faut faire `pnpm install` **DEUX FOIS** :
   - sur ton Mac local (`./artifacts/helo/`)
   - sur Replit (Shell : `cd artifacts/helo && pnpm install --ignore-scripts`)

5. **`router.back()` polluant** : 8 sites ont été fixés en Lot 15B5, mais le pattern peut réapparaître. Reflex : utiliser `useSafeBack(fallback)` neuf.

6. **Partner realtime** utilise actuellement la table `community_submissions` comme proxy en attendant que `partner_shelf_events` soit créée (TODO `hooks/usePartnerRealtime.ts:108`). Marche, mais à refacto post-beta.

7. **Onboarding partner skip** : `app/onboarding/role.tsx` ligne 156 route directement `/onboarding/partner-code` pour `role === 'partner'`. Skip profile + preferences (volontaire — Lot 16-07).

8. **Verdict screen header sticky** (Lot 15B2) utilise `BlurView` avec `intensity={Platform.OS === 'ios' ? 60 : 80}`. Le padding-top du hero doit compenser : `(insets.top) + 64`.

---

## 🎯 Décisions UX clés (le WHY)

- **"Tu" partout** : app grossesse intime, "vous" était trop formel
- **5 scan modes → 1 primary + drop** : 95% des scans sont code-barres, pas besoin d'égaliser
- **"Mon placard" vs "À acheter"** : ancien "Ma liste" trop ambigu (wishlist ? courses ?)
- **Coming Soon vs Redirect** : redirect = sentiment "app cassée", Coming Soon = "fonctionnalité future"
- **Modal célébration 1er scan** : sans ça l'onboarding s'arrêtait silencieusement
- **Sticky header verdict** : verdict screen le plus visité, perdre le bouton retour = désorientation
- **Glow Score animation +N** : feedback tactile/visuel sur ajout au placard (avant : silence)

---

## 🚀 Maintenance de ce fichier

### ⚠️ RÈGLE D'OR : commit CLAUDE.md à chaque update

À chaque fois que ce fichier est modifié, il **DOIT être committé immédiatement**
sous forme de `docs: update CLAUDE.md — <résumé>`. Sinon la mémoire projet diverge
entre les sessions Claude et le dépôt git.

### Quand updater CLAUDE.md

À la fin de chaque Lot majeur ou décision architecturale importante :

1. Ajouter le nouveau Lot dans **État d'avancement**
2. Lister les nouveaux composants/hooks créés (table **Composants/hooks créés**)
3. Ajouter les nouvelles storage keys (section **Storage keys récents**)
4. Noter les nouveaux **gotchas** si découverts
5. Documenter la **décision UX** (le WHY) si non triviale
6. Bump la date "Last updated"
7. **Commit immédiatement** :
   ```bash
   git add CLAUDE.md && git commit -m "docs: update CLAUDE.md — <Lot X>"
   ```

Comme ça la mémoire reste toujours fraîche et alignée avec le code.

---

## 📞 Quand tu démarres une session

1. **Lis ce fichier** (tu es en train de le faire ✓)
2. **Check `TaskList`** pour voir l'état des tâches
3. **`git status`** pour voir les modifs non commitées
4. **`git log --oneline -10`** pour voir l'historique récent
5. **Demande à l'user ce qu'il veut faire** — ne présume rien

Si l'user dit "on continue où on s'est arrêté" : check les tâches `in_progress` puis `pending`.

---

## 📚 Références

- Repo GitHub : (à compléter par l'user)
- Replit deployment : api-server live sur Autoscale
- Supabase project : (à compléter)
- PostHog project : (à compléter)
- Sentry project : (à compléter)
- Apple Developer enrollment : pending ($99/an)
- App Store Connect ASC App ID : `FILL_AFTER_CREATING_APP` (eas.json)

---

*Last updated : Lot 16 livré (43 tâches, 16 nouveaux composants, 0 erreur TS, 206/207 tests).*
*Maintenu par : Claude — mets à jour ce fichier à la fin de chaque Lot majeur.*
