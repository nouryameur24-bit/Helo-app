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

### ✅ Pipeline Safety & Coverage (Lot 17) — SAFETY-CRITICAL
- **17-01** Bannière "Composition (partiellement) inconnue" — finit le faux ✅
- **17-02** Cross-check allergies → bannière ROUGE bloquante (anaphylaxie risk)
- **17-03** Parallel OFF/OBF fetch → latence ÷ 2 (16s → 8s worst case)
- **17-04** Champ `max_dose_mg_per_day` + UI pill dosage + 7 médicaments OTC seedés
- **17-05** Seed 50 plantes médicinales CRAT (curcuma, gingembre, réglisse, sauge…)
- **17-06** Timeout safeguard 10s sur verdict screen — plus de spinner infini
- **17-07** Groupement ingrédients par catégorie (allergènes/additifs/colorants…)
- **17-08** Map client-side alias 150 E-numbers (E951 → Aspartame) dans `lib/eNumberAliases.ts` — **pas de table DB**, lookup en mémoire via `resolveENumber()`
- **17-09** RappelConso recall pour TOUS les users (gate premium retiré)

### 🚧 Platform Leader (Lot 19) — EN COURS (7/34 livrés + 2 PRIO terminés 25/05/2026)
**Enrichissement DB livré via accès Supabase MCP direct :**
- **19-A1** Pack ingrédients critiques (+161 entrées) : 60 huiles essentielles CRAT (Tea Tree danger, Lavande safe T2-T3...) + 68 food (phytoestrogènes, théobromine, tyramine, mercures par espèce, fromages lait cru, etc.) + 30 trendy cosmétiques 2024-2025 (Centella, Mugwort danger, Snail mucin, peptides, Bakuchiol...)
- **19-B3** Top 106 plats restaurants FR (source `helo_restaurant`, barcodes `dish_*`)
- **19-C1** Pre-compute `overall_risk` pour **626 019 produits** : ~31k danger + ~50k caution + ~14k safe + ~531k unknown. Distribution réaliste : 87% unknown pour la longue traîne OFF (composition partielle), 13% qualifiables.
- **19-D1** Tags pregnancy-specific sur ~92 100 aliments — colonne `products.pregnancy_risks JSONB`
- **19-E1** Système alternatives : 1 505 produits risqués (984 cosmetic + 521 food) avec 3 safe alternatives chacun = **4 512 entrées product_alternatives**. Ranking pharmacy brands first (Mustela, Avène, La Roche-Posay...). ⚠️ Schema sans `intended_use` ni `quality_score` → cohérence sous-usage non vérifiée (cf. 19-E1b).
- **19-J3** Schema profiles backend sync : colonnes allergies, dietary_restrictions, cosmetic_sensitivities, medical_conditions + trigger preferences_updated_at
- **19-L** 8 analytics views (v_ingredients_health, v_products_health, v_user_activity, v_top_scanned_products, v_waitlist_growth, v_community_health, v_top_unknown_products, v_pregnancy_tags_stats)

**✅ Fix data hygiene PRIO 0+1 (25/05/2026)** :
- Audit 609k produits `source=NULL` → identifiés comme bulk dump OFF des 22-23 mai (timing confirmé). Backfill `source='openfoodfacts'` pour 615 695 produits + 20 produits curated démo tagués `source='helo'`. **100% des produits ont maintenant une source attribuée.**
- Distribution finale sources : openfoodfacts 615 695, helo_v6 6 348, helo_v5_god_mode 1 616, helo_v4_ultimate 1 316, openbeautyfacts 918, helo_restaurant 106, helo 20.

**Ingredients DB réelle (vérifié MCP)** : 5 313 entrées (medication 1900 / cosmetic 1888 / food 1525). 100% ont source + risk_levels. **1 260 (24%) sans description_fr complète** → cible 19-A2 re-scopé (~$3-5 Claude).

**À suivre (encore ~28 tâches)** : 19-A2 enrichment ciblé 1260 descriptions, 19-E1b schema + intended_use classifier (~$5), OBF import élargi, brands pharmacie, BDPM, pgvector fuzzy, photos pictogrammes, AI visual shelf, affiliate links, sage-femme workflow, etc.

### 💰 Budget Claude API estimé pour finir Lot 19
- **One-shot data layer setup** :
  - 19-A2 Mass Enrichment 5313 ingrédients : ~$10
  - 19-E1b Intended_use 25k curated : ~$25
  - (Optionnel) Étendre 100k populaires : +$100
  - (Optionnel) Refiner 528k unknown : +$300-500
  - **Minimum viable beta : ~$35**
  - **Coverage solide : ~$135**
- **Coûts récurrents par user** (post-setup) :
  - Scan barcode : $0 (cache local)
  - Scan AI fallback : ~$0.001
  - Ghost Capture (Claude Vision) : ~$0.005-0.01
  - Chat IA : ~$0.001 par message
  - 100 users beta = ~$3/mois Claude API
  - 1000 users = ~$25/mois
  - 10 000 users = ~$250/mois (largement couvert par revenue Premium)

### ✅ Ghost Capture & Le Moat Claude Vision (Lot 18) — DIFFÉRENCIATEUR vs YUKA
- **18-01** Bug fix : corrections OCR user préservées (ocr-review envoie `ocrText` brut, pas `cleaned`)
- **18-02** Threshold auto-verify community 3 → 5 scans (safety)
- **18-03** Rate limit per-user 1/barcode/24h via `p_user_id` argument RPC
- **18-04** Blur detection heuristique base64 (< 50KB → Alert "photo floue")
- **18-05** OCR confidence Google Vision affichée (badge si <85%)
- **18-06** Badge 💛 "X mamas ont contribué" sur verdict community (lit `metadata.scan_count`)
- **18-07** Empty state explicite quand 0 ingrédient détecté (CTA reprendre/saisir)
- **18-09** Tooltip explicatif sur category picker
- **18-10** **Claude Vision direct (LE MOAT)** : nouvelle route `/api/analyze-ingredients-image` côté api-server + `analyzeIngredientsWithClaudeVision()` côté mobile. Essai Claude Vision en 1er, fallback Google Vision OCR si timeout. Différenciation tech vs Yuka.

⏳ Pas livrés Lot 18 (effort > 1 jour) : 18-08 Autocomplete ingrédients, 18-11 Multi-photo capture, 18-12 Offline OCR fallback Tesseract.js

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
| `UnknownCompositionBanner` | `components/verdict/UnknownCompositionBanner.tsx` | Bannière ⚠️ "composition (partiellement) inconnue" |
| `AllergyWarningBanner` | `components/verdict/AllergyWarningBanner.tsx` | Bannière ROUGE allergène détecté (haptic Error) |
| `eNumberAliases` (lib) | `lib/eNumberAliases.ts` | Map E-number → nom ingrédient (150 entrées) |
| `categorizeIngredient` (lib) | `components/verdict/categorizeIngredient.ts` | Catégoriser ingrédient (allergène/additif/colorant/…) |
| `analyzeIngredientsWithClaudeVision` (lib) | `lib/api.ts` | Lot 18-10 — Appel à `/api/analyze-ingredients-image` (Claude Vision direct) |
| Route `analyze-ingredients-image` (backend) | `artifacts/api-server/src/routes/analyze-ingredients-image.ts` | Claude Haiku Vision + prompt JSON structuré |
| `PregnancyRisksBanner` | `components/verdict/PregnancyRisksBanner.tsx` | Lot 19-D1 — Bannière chips contextuels (listeria, toxo, mercure, alcool, caféine...) |
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

9. **SQL migration Lot 17 à appliquer** : `artifacts/helo/supabase/migration-lot17-dose-and-herbs.sql`. **Sans exécuter ça sur Supabase**, les champs `max_dose_mg_per_day` + les 50 plantes médicinales ne sont pas dans la DB. La migration est idempotente (ON CONFLICT DO NOTHING + ADD COLUMN IF NOT EXISTS). À exécuter dans Supabase Dashboard → SQL Editor.

10. **Le `getVerdict` (Lot 17-01) renvoie 3 nouveaux champs** : `totalCount`, `allIngredientsUnknown`, `unknownRatio`. Tout consommateur de `VerdictResult` doit les fournir (cf. `hooks/useScan.ts` ligne 113 pour le pattern). Si tu crées une nouvelle source de verdict (backend), n'oublie pas ces champs.

11. **`matchedAllergies` sur MatchResult** (Lot 17-02) : tableau de labels d'allergies déclarées qui matchent l'ingrédient (ex: `['Arachide']`). Rempli par `applyPersonalPreferences()`. Consommé par `getVerdict()` qui agrège en `allergyWarnings` au niveau verdict.

12. **E-number fallback dans `findMatchingRow`** (Lot 17-08) : si match direct échoue ET l'ingrédient est un E-number, lookup via `resolveENumber()` puis re-match. Si tu changes le matcher, conserve ce fallback sinon les additifs notés "E951" perdront leur risk_level.

13. **SQL migration Lot 18 à appliquer** : `artifacts/helo/supabase/migration-lot18-ghost-capture-safety.sql`. **DROP FUNCTION + CREATE FUNCTION** (signature change). Idempotent. Sans ça, le RPC `ghost_capture_upsert` garde l'ancien comportement (threshold 3, pas de rate limit per-user).

14. **Claude Vision (Lot 18-10) nécessite `ANTHROPIC_API_KEY`** côté api-server Replit. Si l'OCR cleanup actuel marche, Vision marche aussi (même clé). Vision rame 2-5s, fallback automatique OCR si timeout/error. Pas de Premium gate pour le moment — c'est la valeur de l'app, libre pour tous.

15. **`processOCRImage` retourne maintenant `{ text, confidence }`** (Lot 18-05) au lieu de `string`. Si tu ajoutes un consommateur, destructure. Confidence est `undefined` si Google Vision ne la fournit pas pour cette image.

16. **`ProductData.communityContributionCount`** (Lot 18-06) est exposé UNIQUEMENT pour `source === 'community'`. Lu depuis `metadata.scan_count`. Sert au badge "X mamas ont contribué" sur verdict screen.

17. **MCPs Claude Code configurés (4)** : `~/.claude.json` scope `/Users/nouryameur/Documents/Helo-app` contient `supabase`, `github`, `sentry`. PostHog non-MCP (OAuth flow PostHog bugué) — utiliser REST API directe avec `EXPO_PUBLIC_POSTHOG_KEY=phc_qbr2WamQwtNPCZfrzgZUyJaa6Dy5BP5WNFubDAszdP6U` côté Helo. Tokens dans `.claude.json` (à régénérer si fuite). Sentry token a scopes limités (peut faire whoami/orgs/teams mais pas project:read ni event:read) — pour analytics Sentry full il faut générer un token avec scopes `project:read event:read member:read` sur https://helo-54.sentry.io/settings/account/api/auth-tokens/.

18. **Sentry DSN production** : projet `helo-54/react-native` créé le 25/05/2026 (Issue ID prefix `REACT-NATIVE-*`). DSN `https://770f44a3be648c6dec7e000e59762326@o4511434162110464.ingest.de.sentry.io/4511450951450704` dans `artifacts/helo/.env` sous `EXPO_PUBLIC_SENTRY_DSN`. Plugin Expo dans `app.json` configuré avec `organization=helo-54`, `project=react-native`. Fallback DSN aussi hardcodé dans `lib/sentry.ts` pour safety (au cas où env var pas chargée — ne pas supprimer). Vérifier wiring depuis l'app via Profile → DEV → "Send Sentry test event" (function `sendSentryTestEvent()`). MCP Sentry peut maintenant lire events via `mcp__sentry__search_events` avec `projectSlug=react-native`.

---

## 🎯 Décisions UX clés (le WHY)

- **"Tu" partout** : app grossesse intime, "vous" était trop formel
- **5 scan modes → 1 primary + drop** : 95% des scans sont code-barres, pas besoin d'égaliser
- **"Mon placard" vs "À acheter"** : ancien "Ma liste" trop ambigu (wishlist ? courses ?)
- **Coming Soon vs Redirect** : redirect = sentiment "app cassée", Coming Soon = "fonctionnalité future"
- **Modal célébration 1er scan** : sans ça l'onboarding s'arrêtait silencieusement
- **Sticky header verdict** : verdict screen le plus visité, perdre le bouton retour = désorientation
- **Glow Score animation +N** : feedback tactile/visuel sur ajout au placard (avant : silence)
- **Lot 17 — "Better uncertain than wrong falsely safe"** : principe gravé dans le pipeline scan. Avant Lot 17, un verdict "safe" pouvait masquer une vraie incertitude (0 ingrédient matché → safe par défaut). Pour une app grossesse, c'est inacceptable. La bannière "composition (partiellement) inconnue" garantit qu'on n'affiche plus de faux ✅.
- **Lot 17 — Allergies = priorité TOP** : bannière rouge avant TOUT le reste (avant même le recall). Risque vital > risque conformité.
- **Lot 17 — Recall gratuit pour tous** : les rappels RappelConso (DGCCRF) sont safety-critical, jamais Premium-only. Apple Review aurait pu reject sur ce point.
- **Lot 18 — Claude Vision = LE MOAT vs Yuka** : Yuka utilise Google Vision OCR classique (transcrit pixels → texte). Hēlo utilise Claude Vision (LLM multimodal qui RAISONNE sur l'image). Yuka ne peut pas suivre car économiquement non-viable à 40M users (~$2M/mois coûts AI). Hēlo peut car niche premium grossesse (25% conversion, 60€/an). Fenêtre stratégique 18-36 mois avant que Yuka rattrape. *cf. conversation conversation strategy session — innovator's dilemma classique.*
- **Lot 18 — "Better uncertain than wrong" appliqué à Ghost Capture** : threshold 5 scans (vs 3), rate limit per-user, badge confidence Google Vision affiché, "X mamas contribué" pour transparence. Le verdict community devient un signal social, pas une boîte noire.

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
- Supabase project : `loshefmumtkunvddrnpy` (EU, accessed via MCP)
- PostHog project : `186387` (Default project, EU `eu.i.posthog.com`)
- Sentry project : `helo-54/react-native` (EU `de.sentry.io`)
- Apple Developer enrollment : pending ($99/an)
- App Store Connect ASC App ID : `FILL_AFTER_CREATING_APP` (eas.json)

---

*Last updated 25/05/2026 : MCPs setup complet (Supabase + GitHub + Sentry + PostHog via REST), Sentry projet helo-54/react-native wiré (REACT-NATIVE-1 vérifié). DB audit: 626 019 produits, 100% sourcés (fix backfill 609k OFF dump), 5 313 ingredients réels (pas 5152). PRIOs 0+1 DB hygiene complétées. À faire: 19-A2 (1260 descriptions, ~$3-5) puis 19-E1b (alternatives intended_use, ~$5).*
*Maintenu par : Claude — mets à jour ce fichier à la fin de chaque Lot majeur.*
