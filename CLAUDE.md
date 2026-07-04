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
- **19-E1** Système alternatives v1 : 4 512 paires générées mais avec un BUG MAJEUR (cf. 19-E1b ci-dessous).
- **19-E1b** ✅ 25/05/2026 — Fix cohérence alternatives via `intended_use`. Audit révèle que les 4 512 paires étaient à 97% incohérentes : l'algo recyclait 6 produits "safe" universels (Bioderma SPF, Mustela Spray, Weleda Skin Food, Häagen-Dazs Salted Caramel, Weleda Tisane, Doritos paprika) en alternatives pour TOUT produit risqué, peu importe le type. Solution : (1) ADD COLUMN `intended_use` + `quality_score` sur products + product_alternatives, (2) Classification regex multi-langue de 1 520 produits impliqués, (3) DELETE des 4 377 paires incohérentes. État après E1b : **135 paires valides** (98 sunscreen + 37 body_lotion) couvrant 86 risky/1 505.
- **19-E1c** ✅ 25/05/2026 — Curation +27 produits pharmacie FR couvrant 9 nouveaux `intended_use` (shampoo Klorane/Ducray/Mustela, deodorant Sanex/Etiaxil/Mustela, foundation Avène/La Roche-Posay/Bioderma, makeup_remover, mascara, hair_oil, face_serum, hair_styling, hand_cream Mustela/Avène/Weleda). Bulk INSERT product_alternatives via ROW_NUMBER ranked by quality_score. État final : **957 paires** (×7 vs E1b), couvrant **367 risky sur 1 505 (24%)**. Wire mobile (lib/alternatives.ts) : `getAlternativesByBarcode` consomme désormais `product_alternatives` en LAYER 0 (instant, $0, 100% intended_use match) avant le fuzzy fallback. Backend api-server (Sniper Claude runtime) reste primary — future task : wirer product_alternatives en warm cache.
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
| `heloPoints` (lib) | `lib/heloPoints.ts` | Hēlo Points wrapper TS : awardPoints, getUserPoints, getRewardsCatalog, redeemReward, getUserRewardFlags + tier helpers |
| `PointsToast` | `components/points/PointsToast.tsx` | Animation "+N ⭐" avec queue imperative (forwardRef + handle.show) |
| `HeloPointsSection` | `components/profile/HeloPointsSection.tsx` | Carte balance + tier + badge Founder + Premium actif sur Profile |
| `PointsScreen` | `app/points.tsx` | Écran complet : hero balance + catalogue récompenses + historique transactions |
| `apiCostTracker` (lib, api-server) | `artifacts/api-server/src/lib/apiCostTracker.ts` | logClaudeApiCall() FinOps tracking + pricing constants Anthropic |

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

### 🔴 Bloquants beta launch
| Tâche | Effort | Bloqueur |
|---|---|---|
| **TestFlight upload** premier build | 2h | EAS secrets + Apple Developer ($99/an) |
| App Store assets (6 screenshots, description FR, keywords, privacy URL) | 4h | Maman designer ? |
| Task #15 PostHog test local + setup EAS secrets | 1h | API key EAS |
| Republish Replit Autoscale pour activer recalls-poll + partial_metadata + apiCostTracker | 1 clic | Toi |

### 🟡 Activation infra (codée, à lancer)
| Tâche | État code | Pour activer |
|---|---|---|
| **Scraping via Firecrawl** (Pharma GDD + Carrefour + brands) | 🔄 pivot en cours | Toi : compte firecrawl.dev (free tier 500 pages) + API key + me la filer |
| ~~Scraping Pharma GDD direct HTTP~~ | ⚠️ déprécié au profit Firecrawl | Rate limit Anthropic Tier 1 bloquant si direct |
| **BDPM 18k médicaments FR** | ✅ script prêt | Toi : télécharger ZIP data.gouv.fr → `.bdpm-cache/` → `pnpm import:bdpm` |
| **pgvector embeddings ingrédients** | ✅ script prêt | Toi : `OPENAI_API_KEY` env → `pnpm embeddings:populate` (~5min, $0.005) |
| **Push recall RappelConso cron** | ✅ endpoint prêt `/api/recalls/poll` | Toi : env `HELO_CRON_SECRET` + cron externe (GitHub Actions hourly) |
| **Affiliate links** | ✅ AffiliateButton wiré + DB tracking | Toi : inscription Amazon Associates FR, Monoprix, Bébé9 + filler `purchase_links` JSONB |
| **DrugInteractionBanner** | ✅ composant prêt | À wirer dans verdict screen + seed `drug_interactions` table (BDPM/Theriaque) |
| **Expo push registration** | ✅ hook prêt | À appeler depuis onboarding step "Activer alertes rappel" |

### 🟢 Polish post-launch
| Tâche | Effort | Bloqueur |
|---|---|---|
| Dark mode complet | ~10h | Audit screen-by-screen sur device |
| Audit accessibilité VoiceOver | ~6h | iPhone physique + lecture humaine |
| iPad layout | ~8h | iPad physique |
| i18n EN/ES | ~20h+ | Traducteur humain (≈3000 strings) |
| Animations Lottie | variable | Designer pour .json files |
| Migration `hooks/usePartnerRealtime.ts` proxy `community_submissions` → table `partner_shelf_events` (déjà créée) | 2h | Aucun |

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

9. **SQL migrations Lot 17/18** : ranges `artifacts/helo/supabase/migrations/20260525001611_lot17_dose_and_herbs.sql` + `20260525005813_lot18_ghost_capture_safety.sql`. Idempotentes (ON CONFLICT DO NOTHING + ADD COLUMN IF NOT EXISTS). Déjà appliquées en prod. Cleanup task #111 : tout est dans `supabase/migrations/YYYYMMDDHHMMSS_*.sql` désormais (plus de `migration-*.sql` legacy).

10. **Le `getVerdict` (Lot 17-01) renvoie 3 nouveaux champs** : `totalCount`, `allIngredientsUnknown`, `unknownRatio`. Tout consommateur de `VerdictResult` doit les fournir (cf. `hooks/useScan.ts` ligne 113 pour le pattern). Si tu crées une nouvelle source de verdict (backend), n'oublie pas ces champs.

11. **`matchedAllergies` sur MatchResult** (Lot 17-02) : tableau de labels d'allergies déclarées qui matchent l'ingrédient (ex: `['Arachide']`). Rempli par `applyPersonalPreferences()`. Consommé par `getVerdict()` qui agrège en `allergyWarnings` au niveau verdict.

12. **E-number fallback dans `findMatchingRow`** (Lot 17-08) : si match direct échoue ET l'ingrédient est un E-number, lookup via `resolveENumber()` puis re-match. Si tu changes le matcher, conserve ce fallback sinon les additifs notés "E951" perdront leur risk_level.

13. **Migration Lot 18 (DROP+CREATE pattern)** : `supabase/migrations/20260525005813_lot18_ghost_capture_safety.sql` utilise `DROP FUNCTION + CREATE FUNCTION` (signature change). Pattern à reproduire si jamais tu changes la signature d'un RPC existant — PostgreSQL refuse `ALTER FUNCTION` pour les RETURNS TABLE.

14. **Claude Vision (Lot 18-10) nécessite `ANTHROPIC_API_KEY`** côté api-server Replit. Si l'OCR cleanup actuel marche, Vision marche aussi (même clé). Vision rame 2-5s, fallback automatique OCR si timeout/error. Pas de Premium gate pour le moment — c'est la valeur de l'app, libre pour tous.

15. **`processOCRImage` retourne maintenant `{ text, confidence }`** (Lot 18-05) au lieu de `string`. Si tu ajoutes un consommateur, destructure. Confidence est `undefined` si Google Vision ne la fournit pas pour cette image.

16. **`ProductData.communityContributionCount`** (Lot 18-06) est exposé UNIQUEMENT pour `source === 'community'`. Lu depuis `metadata.scan_count`. Sert au badge "X mamas ont contribué" sur verdict screen.

17. **MCPs Claude Code configurés (4)** : `~/.claude.json` scope `/Users/nouryameur/Documents/Helo-app` contient `supabase`, `github`, `sentry`. PostHog non-MCP (OAuth flow PostHog bugué) — utiliser REST API directe avec `EXPO_PUBLIC_POSTHOG_KEY=phc_qbr2WamQwtNPCZfrzgZUyJaa6Dy5BP5WNFubDAszdP6U` côté Helo. Tokens dans `.claude.json` (à régénérer si fuite). Sentry token a scopes limités (peut faire whoami/orgs/teams mais pas project:read ni event:read) — pour analytics Sentry full il faut générer un token avec scopes `project:read event:read member:read` sur https://helo-54.sentry.io/settings/account/api/auth-tokens/.

19. **Tracking coût Claude API** (25/05/2026) : table `api_usage` upgradée avec colonnes `model/input_tokens/output_tokens/estimated_cost_usd/request_id/duration_ms` + view `v_api_costs_daily`. Helper `artifacts/api-server/src/lib/apiCostTracker.ts` avec `logClaudeApiCall()` (fire-and-forget, non-fatal). Wiré dans `lib/anthropic.ts` (analyze + sniper alternatives) et routes `ocr-cleanup` + `analyze-ingredients-image`. Pricing constants embarqués : Haiku 4.5 = $1/$5 par MTok, Sonnet 4.5 = $3/$15, Opus 4.5 = $15/$75. **Source de vérité = https://console.anthropic.com/usage** (Anthropic Console), la view Supabase est juste un complément SQL pour requêtes ad-hoc. Dashboard : `SELECT * FROM v_api_costs_daily ORDER BY day DESC, cost_usd DESC;`

20. **Backend prod connecté** (25/05/2026) : api-server déployé via Replit Autoscale → URL stable `https://asset-manager-leilaameurpro.replit.app` (2 vCPU/4 GiB/3 max, ~$25-50/mois — downsize possible). Mobile `.env` wiré : `EXPO_PUBLIC_HELO_API_URL` + `EXPO_PUBLIC_HELO_APP_SECRET=<dans .env, gitignored>` + `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Header requis : `x-helo-app-secret` (pas `x-app-secret`). ⚠️ **Audit #6** : l'ancienne valeur du secret était committée ici en clair → **à ROTATIONNER** (Replit env + .env mobile) avant launch public. Ne jamais re-committer la valeur. Healthz vérifié 318ms, scan Nutella vérifié 3.45s (verdict safe + glow 72 + source `ai`). ⚠️ Au moindre push sur `main`, **republish Autoscale** depuis l'UI Replit Publishing — l'auto-deploy ne se déclenche pas automatiquement sur git push.

21. **Bulk import OBF cosmétiques** (25/05/2026 soir, 19-B1) : 4 rounds via PostgREST API (catégories EN + FR + brands FR) → 918 → 1 858 OBF cosmétiques (+940 uniques). Total cosmetic DB : **13 472**. Scripts dans `/tmp/obf_*.py` (à porter dans `scripts/` si à rejouer). Service role key utilisé pour POST batched `Prefer: resolution=ignore-duplicates` avec `?on_conflict=barcode`. ⚠️ Plafond OBF atteint : test beta sur 3 barcodes user (3600541232525/8718951798977/3178041346061) → INTROUVABLES sur OBF world+fr+uk car Yuka a sa propre DB propriétaire (10 ans + 50M users). Conclusion stratégique : pour combler le gap niche, **mass photo-OCR via Claude Vision** (le moat) est la vraie réponse, pas la course à la couverture barcode. Voir 19-B2 (curation manuelle Garnier/L'Oréal/Mixa lignes complètes — high value pour 1500 produits FR populaires).

22. **Backend partial_metadata fallback** (commit `6ecfff5`) : Quand `product_not_found`, le scan endpoint retourne désormais le nom/marque/photo OBF si dispo + `suggestion:"scan_ingredients_photo"`. Permet UI mobile d'afficher "On a trouvé ton produit mais sa composition est incomplète — prends une photo" au lieu d'un dead-end. Côté mobile, à wirer dans `productLookup.ts` pour basculer auto vers Ghost Capture quand cette response arrive.

23. **Hēlo Points Phase 1 MVP + Phase 1.5 fulfillment** (commits `f68c4ec` → `d9751a6`, tasks #107 + #108) : Système de récompenses gamifié pour incentiver Ghost Capture et combler gap couverture vs Yuka.

   **Schema DB** :
   - `user_points` (balance/lifetime/tier/streak/contributions_count)
   - `point_transactions` (ledger RLS self-read)
   - `rewards_catalog` (5 récompenses actives)
   - `point_redemptions` (historique avec status pending/fulfilled)
   - `profiles` enrichi avec `bonus_premium_until`, `is_founder`, `founder_unlocked_at`
   - RPCs atomiques SECURITY DEFINER (bypass RLS, contrôlés par auth.uid()) :
     * `award_points` (cap 300/jour, 1 barcode = 1 award/reason)
     * `redeem_reward` (FOR UPDATE lock + fulfillment auto-applied pour `auto_premium` et `unlock_feature/badge_founder`)
   - Trigger `on_auth_user_created_ensure_profile` sur `auth.users` → INSERT profile auto à signup (anti-drift)

   **Pricing earn** : Photo INCI=25 (le gros), barcode=5, nom=5, face=8 (futur), marque=7 (futur), bonus complétude=+30 all-or-nothing.

   **Catalogue rééquilibré** (économie saine, themes/chat/sticker virtuels droppés) :
   - 500 pts → Badge Mama Founder (vanity, ~17 contribs)
   - 1 500 pts → 1 semaine Premium offerte (~50 contribs)
   - 5 000 pts → 1 mois Premium offert (~167 contribs)
   - 15 000 pts → 6 mois Premium offerts (~500 contribs, valeur 30€)
   - 30 000 pts → 1 an Premium offert (~1000 contribs, valeur 60€)

   **Mobile code** : `lib/heloPoints.ts`, `components/points/PointsToast.tsx`, `components/profile/HeloPointsSection.tsx`, `app/points.tsx`. `hooks/usePremium.ts` updaté : `isPremium = isPremiumRC OR bonusPremiumUntil > NOW()` (fusion RevenueCat + bonus Hēlo Points).

   **Wiring Ghost Capture** : Award fire-and-forget après `ghostCaptureSave` (+30-35 pts/contribution). URL params `pointsEarned=N` passé d'ocr-review → verdict screen → toast `+35 ⭐ ✨ Merci !` pendant 4s.

   **Bugs critiques fixés post-MVP** (commit `d9751a6`, task #108) :
   - 🔴 `profiles.id` (PAS `user_id`) — corrigé dans 3 endroits (redeem_reward RPC, `getUserRewardFlags`, `fetchBonusPremiumUntil`). Avant : UPDATE silencieusement échoué.
   - 🔴 Drift 38/49 auth.users sans profile — trigger + backfill → 49/49 maintenant.

   **Smoke test 100% validé** : award_points(+30) ✓, redeem Badge Founder (500 → is_founder=TRUE) ✓, redeem Premium 1 sem (1500 → bonus_premium_until=NOW+7days) ✓.

   **À faire futur** : (a) détection 1st-contributor + multiplier ×2, (b) Badge Mama Founder affiché sur ProfileHeader (actuellement seulement dans HeloPointsSection), (c) partial_metadata mobile handler (refactor productLookup pour basculer auto vers Ghost Capture quand backend retourne `product_metadata_only`). Phase 2 post-revenue : gift cards Amazon Incentives API.

24. **Trigger `ensure_profile_for_user`** (commit `d9751a6`) : Sur `auth.users INSERT`, crée automatiquement un row dans `profiles` (ON CONFLICT DO NOTHING). Empêche le drift entre auth users et profiles que j'avais découvert (38/49 users orphelins). Backfill aussi appliqué pour les 38 users historiques. Si tu fais un nouveau test signup, le profile apparaît immédiatement.

18. **Sentry DSN production** : projet `helo-54/react-native` créé le 25/05/2026 (Issue ID prefix `REACT-NATIVE-*`). DSN `https://770f44a3be648c6dec7e000e59762326@o4511434162110464.ingest.de.sentry.io/4511450951450704` dans `artifacts/helo/.env` sous `EXPO_PUBLIC_SENTRY_DSN`. Plugin Expo dans `app.json` configuré avec `organization=helo-54`, `project=react-native`. Fallback DSN aussi hardcodé dans `lib/sentry.ts` pour safety (au cas où env var pas chargée — ne pas supprimer). Vérifier wiring depuis l'app via Profile → DEV → "Send Sentry test event" (function `sendSentryTestEvent()`). MCP Sentry peut maintenant lire events via `mcp__sentry__search_events` avec `projectSlug=react-native`.

30. **Firecrawl pivot + source masking (task #121, 26/05/2026)** :

   **Pourquoi pivot vers Firecrawl** :
   Recon HTTP simple a montré que la majorité des cibles food/drive sont protégées (Carrefour 403, Monoprix S3 403, Newpharma Cloudflare JS, Easyparapharmacie PerimeterX). Seul Auchan + Pharma GDD + brands restent scrapables directement. Rate limit Anthropic Tier 1 + HTML brut 25k tokens/page = bottleneck.

   **Solution Firecrawl** :
   - HTML → markdown clean conversion (5k tokens vs 25k tokens) → 5x moins cher Claude + reste dans Tier 1
   - Pool proxies + browser fingerprinting → bypass Cloudflare/Akamai/PerimeterX
   - Débloque : Carrefour Drive (80k SKUs), Monoprix Drive (30k), Newpharma (50k)
   - Free tier : 500 pages gratos pour tester
   - Hobby $19/mo : 5k pages
   - Standard $99/mo : 100k pages
   - MCP officiel : https://firecrawl.dev/mcp

   **Maths refait avec Firecrawl** :
   - Total budget pre-Firecrawl : ~$280 Pharma GDD seul (Tier 1 = 5 jours non-stop)
   - Total budget Firecrawl : ~$60 Pharma GDD (Hobby $19 + Claude $40) + débloque Carrefour
   - Carrefour Drive 80k pages : ~$320 Firecrawl Standard inclus + ~$160 Claude = $480 → catalog FR complet

   **Source masking en DB** (anti-traceability) :
   - Avant : `source = 'scraped_pharma_gdd'`, `metadata.source_url` exposé
   - Après : `source = 'helo_cosmetic_db_v1'` (cosmétiques), `helo_food_db_v1` (food), `helo_medication_db_v1` (médicaments)
   - source_url retiré de metadata
   - L'app utilisateur ne voit JAMAIS source → invisible total côté UX
   - Seul Noury (Supabase MCP) sait l'origine
   - Légal : INCI = donnée publique d'intérêt sanitaire (règlement EU 1223/2009), tant que robots.txt + rate limit respectés → scraping défendable

   **Plan d'implémentation** :
   1. User crée compte firecrawl.dev (free tier) + share API key
   2. Refactor `scripts/scrapers/_shared/` :
      - Remplace `http_runner.ts` + `claude_extractor.ts` par `firecrawl_client.ts`
      - Garde `supabase_writer.ts` + `scraper_base.ts`
      - Adapt `pharmacy/pharma_gdd.ts` + `brands/_factory.ts` au nouveau flow
   3. Migration SQL : UPDATE `products SET source = 'helo_cosmetic_db_v1' WHERE source LIKE 'scraped_%'`
   4. Test live 10 produits Pharma GDD via Firecrawl
   5. Si OK → relance scraping mass en background

29. **Live scraping pilot + rate limit Anthropic (tasks #119-120, 26/05/2026)** :

   **Recon HTTP réel des sites cibles** :
   - ✅ **Pharma GDD** : `sitemap-product.xml` direct, 14 672 URLs produit
   - ❌ 1001pharmacies : robots.txt disallow ClaudeBot
   - ❌ Newpharma : Cloudflare challenge JS
   - ❌ Easyparapharmacie : PerimeterX captcha
   - ❌ Doctipharma.fr : fusion docmorris en cours, sitemap HTML
   - Scrapers Doctipharma + Newpharma supprimés du code (non-viables aujourd'hui)
   - Pharma GDD reste seule cible pharmacy. Phase 2 future = Playwright headless pour bypass.

   **3 bugs scraper fixés (commit 31d2030)** :
   - `products.metadata` column ajoutée via migration MCP (existait pas)
   - Final flush block ne loggait pas les errors → corrigé + sample dry-run print
   - Smart-trim HTML : si keyword composition/INCI absent des premiers 80k chars, on injecte une fenêtre 8k autour du keyword (était critique : Pharma GDD met la div Composition à 64k chars en moyenne)

   **Validation live (3 produits Nuxe insérés)** :
   - Nuxe Rêve de Miel baume lèvres (EAN 3264680015809) → intended_use=lip_balm, INCI 485 chars
   - Nuxe Rêve de Miel gel nettoyant (EAN 3264680004070) → face_cleanser, 585 chars
   - Nuxe Eclat Prodigieux poudre bronzante (EAN 3264680001239) → bronzer, 540 chars

   **🔴 Rate limit Anthropic découvert au scaling** :
   - Tier 1 (free / dev) = 50 000 input tokens / minute
   - 1 page Pharma GDD = ~25k tokens input → max **2 pages/min** sur Tier 1
   - Mass scraping 14k produits = ~120h (5 jours) sur Tier 1 → pas viable
   - **Solutions** :
     - Tier 2 (≥$5 spent) = 450k tokens/min → 18 pages/min → 14k en ~13h
     - Tier 3 (≥$40 spent) = 1M tokens/min → 14k en ~6h
     - OU pre-extract Composition div via regex avant Claude (token usage ÷10, tier 1 devient viable)
   - Background scrapers killed avant atteinte. À relancer quand tier upgrade ou pre-extract codé.

   **Brand sitemap regex fixé** :
   - `_factory.ts` : Shopify utilise `sitemap_products_1.xml?from=...&to=...` (query string)
   - Ancienne regex `/sitemap.*\.xml$/i` requérait fin de string → loupait Mustela
   - Nouvelle regex `/sitemap[^/]*\.xml(\.gz)?(\?|$)/i` accepte query string
   - Validé : Mustela sitemap retourne 88 product URLs (sans le rate limit ça aurait scrapé OK)

   **Composants mobile prêts (non-committés en attente déploiement scraping)** :
   - `components/alternatives/AffiliateButton.tsx` — bouton merchant avec tracking via openMerchantLink
   - `app/alternatives.tsx` refactorisé : 3 boutons purchase_links remplacés par `<AffiliateButton>` + thread userId/sourceBarcode
   - `components/verdict/DrugInteractionBanner.tsx` — bannière interactions avec 4 niveaux sévérité (contraindicated/major/moderate/minor), expand on tap, query RPC `find_drug_interactions`
   - `hooks/useExpoPushRegistration.ts` — register Expo push token + upsert push_subscriptions (skip si web/permission denied)
   - tsc mobile ✓, à wirer dans verdict screen + onboarding ultérieurement

28. **Big push "fait tout" (tasks #112-118, 25/05/2026 nuit late)** :

   **DB foundations** (6 migrations MCP appliquées + dumpées local) :
   - `enable_pgvector_and_trgm` : extensions pgvector + pg_trgm
   - `ingredient_embeddings_table` : table + index HNSW + RPC `match_ingredient_fuzzy` (Lot 19-D2)
   - `partner_shelf_events_realtime` : vraie table + publication Realtime (remplace proxy community_submissions)
   - `drug_interactions_table` : table + RPC `find_drug_interactions` + `profiles.current_medications` (Tier A safety)
   - `product_recalls_push_subscriptions` : tables product_recalls + push_subscriptions + RPC `find_users_to_notify_recall` (Lot 19-I1)
   - `alternatives_affiliate_url_column` : `products.purchase_links` JSONB + `affiliate_clicks` + view `v_affiliate_revenue` (Lot 19-G1)

   **Scraping framework Claude-assisted** (`scripts/scrapers/`) :
   - `_shared/` : types, http_runner (rate limit 1.5 req/s + User-Agent identifiable), claude_extractor (Haiku 4.5 extrait depuis HTML, ~$0.0005/page), supabase_writer (batched upsert avec dedup EAN), scraper_base (boucle discover→fetch→extract→insert)
   - `pharmacy/` : doctipharma.ts (~80k SKUs) + newpharma.ts (~50k SKUs) + pharma_gdd.ts (~30k SKUs)
   - `brands/_factory.ts` : 12 configs (Avène, Mustela, La Roche-Posay, Bioderma, Weleda, Nuxe, Caudalie, Lierac, Vichy, SVR, A-Derma, Ducray) + BrandScraper class + `run_all.ts`
   - README complet avec quality_score scale (100 helo > 90 brand > 80 pharmacy > 70 drive > 60 OBF > 50 OFF), garde-fous éthiques, budget ~$80 pour ~160k cosmétiques FR
   - Dep ajoutée : `@anthropic-ai/sdk ^0.65.0`

   **BDPM import** (`scripts/src/bdpm-import/run.ts`, Lot 19-B4) :
   - Parse 3 fichiers TXT pipe-separated (CIS + CIP + COMPO) en latin1
   - Build products avec barcode=CIP13(EAN13), source='bdpm', quality_score=95
   - ~18k médicaments officiels FR, $0 (source gov gratuite)
   - User doit télécharger manuellement le ZIP depuis data.gouv.fr et le placer dans `.bdpm-cache/` (gated derrière formulaire)

   **pgvector embeddings populate** (`scripts/src/embeddings/populate.ts`, Lot 19-D2) :
   - OpenAI text-embedding-3-small (1536d)
   - Batch 100 ingredients par appel
   - Skip déjà embeddés (sauf --force)
   - Coût ~$0.005 pour 5 313 ingrédients one-shot

   **Affiliate links mobile** (`artifacts/helo/lib/affiliateLinks.ts`, Lot 19-G1) :
   - Wrapper `openMerchantLink` ouvre WebBrowser (in-app SafariViewController / Chrome Custom Tab)
   - Track click via Supabase `affiliate_clicks` + analytics PostHog
   - Order préférentiel : Monoprix Drive > Bébé9 > Pharma Express > Amazon
   - Backend complète query string affiliate (`?tag=helo-fr-21` etc.)

   **Push recall RappelConso** (`artifacts/api-server/src/routes/recalls-poll.ts`, Lot 19-I1) :
   - Cron endpoint `POST /api/recalls/poll` protégé par `x-helo-cron-secret`
   - Fetch RappelConso data.gouv.fr (100 derniers)
   - Filter nouveaux (rappel_id unique), insert product_recalls
   - Extract EAN8/13 depuis identification_des_produits via regex
   - Call RPC `find_users_to_notify_recall` → batch Expo Push (chunks de 100)
   - Severity auto-classified (critical/high/medium/low) via keywords risque

   **Setup env requis pour les scripts** :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (jamais commit)
   - `ANTHROPIC_API_KEY` (scrapers)
   - `OPENAI_API_KEY` (embeddings)
   - `HELO_CRON_SECRET` (recalls-poll endpoint)

   **À faire pour activer en prod** :
   - Republish Replit Autoscale (recalls-poll endpoint)
   - Inscrire les programmes affiliés (Amazon Associates FR, Monoprix, Bébé9)
   - Setup cron externe pointant `POST /api/recalls/poll` (GitHub Actions hourly ou Replit Scheduled Jobs)
   - User : télécharger ZIP BDPM + lancer `pnpm import:bdpm`
   - Lancer `pnpm embeddings:populate` (one-shot ~5min)
   - Lancer scrapers progressivement (`pnpm scrape:doctipharma --max=1000` pour test)
   - Mobile : composant `<AffiliateButton>` à ajouter dans alternatives card (Phase suivante)
   - Mobile : composant `<DrugInteractionBanner>` au scan (Phase suivante)
   - Mobile : enregistrer Expo push token au signup → table push_subscriptions

   **Validation** : tsc --noEmit mobile + api-server + scripts ✓, aucune régression.

27. **Réorg dossier Supabase (task #111, 25/05/2026 nuit)** :

   **Avant** : 9 fichiers SQL en vrac dans `artifacts/helo/supabase/` avec 3 conventions différentes (`migration-*.sql`, `migration-lot17-*.sql`, `seed-*.sql`). 13 migrations MCP-appliquées non committées en local → drift code/DB possible.

   **Après** : structure standard Supabase :
   ```
   artifacts/helo/supabase/
   ├── README.md              (workflow + index 23 migrations + tables/RPCs/views)
   ├── migrations/            (23 fichiers YYYYMMDDHHMMSS_*.sql versionnés)
   ├── seeds/                 (4 fichiers numérotés 01_/02_/03_ + _legacy_)
   ├── functions/             (3 Edge Functions inchangées)
   └── .temp/                 (CLI state inchangé)
   ```

   **Mapping legacy → nouveau** (git mv préserve l'historique) :
   - `schema.sql` → `migrations/20260312030434_initial_schema.sql`
   - `migration-alternatives.sql` → `migrations/20260312230533_alternatives.sql`
   - `migration-community-submissions.sql` → `migrations/20260320002617_community_submissions.sql`
   - `migration-baby-mode.sql` → `migrations/20260330160221_baby_mode.sql`
   - `migration-circle.sql` → `migrations/20260331224007_circle.sql`
   - `rls-policies.sql` → `migrations/20260331234522_rls_policies.sql`
   - `migration-ghost-capture.sql` → `migrations/20260515182430_ghost_capture.sql`
   - `migration-api-usage.sql` → `migrations/20260516125621_api_usage.sql`
   - `migration-lot17-*.sql` → `migrations/20260525001611_lot17_dose_and_herbs.sql`
   - `migration-lot18-*.sql` → `migrations/20260525005813_lot18_ghost_capture_safety.sql`
   - `seed-ingredients.sql` → `seeds/01_ingredients.sql`
   - `seed-ingredients-baby.sql` → `seeds/02_ingredients_baby.sql`
   - `seed-products.sql` → `seeds/03_products.sql`
   - `seed-ALL.sql` → `seeds/_legacy_bootstrap_all.sql`

   **+13 nouvelles migrations dumped depuis MCP** (via `SELECT array_to_string(statements...) FROM supabase_migrations.schema_migrations`) — toutes les Lot 19 + Hēlo Points + audit fixes maintenant committées en local : `20260525022454_lot19_a1_essential_oils_60.sql` ... `20260525180124_point_transactions_anti_double_award_unique.sql`.

   **Refs mises à jour** : `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `lib/productLookup.ts`, et ce CLAUDE.md (gotchas #9 + #13).

   **Workflow nouveau** : voir `supabase/README.md`. Pour appliquer une migration : `mcp__supabase__apply_migration({ name, query })` → dump le SQL dans `migrations/YYYYMMDDHHMMSS_<name>.sql` → commit.

26. **partial_metadata mobile handler + isFirstContributor multiplier ×2 (task #110, 25/05/2026 nuit fin)** :

   **isFirstContributor wiring** (`app/ocr-review.tsx`) :
   - Pre-navigation `await isFirstContributor(barcode, userId)` (~50-200ms DB roundtrip — négligeable vs ~800ms OCR + matching avant ça)
   - Si TRUE → ajoute un award `first_contributor_bonus` de montant `baseTotal` (= multiplier ×2 effectif)
   - URL param `firstContributor=1` passé à verdict screen → toast affiche `+70 ⭐ 👑 Première contributrice ! Tu viens de découvrir ce produit pour toute la communauté Hēlo`
   - Le bonus est tracké comme transaction séparée dans `point_transactions` (ledger lisible)
   - Safe default `false` si check fail (pas de bonus erroné)

   **partial_metadata mobile handler** :
   - `lib/api.ts` : nouveau type `PartialProductMetadata` + variant `metadata_only` dans `ScanError`. Parse 404 body cherchant `error: "product_metadata_only"` (backend retourne ça quand OBF/OFF a le produit mais pas d'INCI exploitable).
   - `hooks/useScan.ts` : nouveau champ `partialMetadata: PartialProductInfo | null` dans `ScanState`. Quand backend retourne `metadata_only`, state se remplit avec barcode + name + brand + imageUrl + source.
   - `components/verdict/GhostCaptureModal.tsx` : nouvelle prop `partialInfo?: { name; brand; imageUrl }`. Si fourni, affiche la photo du produit OBF + titre "Composition manquante" + sous-titre "On a trouvé Nutella mais sa composition n'est pas encore connue".
   - `app/verdict/[scanId].tsx` : nouveau render path AVANT le check error — quand `partialMetadata` est set, render `<GhostCaptureModal partialInfo={...} />` avec routing vers scan tab pre-fillé (`ghostBarcode/ghostName/ghostBrand` URL params).
   - Analytics : 2 nouveaux events typés `scan_partial_metadata` + `partial_metadata_ghost_capture_started`.

   **À wirer plus tard** : `scan.tsx` + `ocr-review.tsx` lecture des `ghostName/ghostBrand` URL params pour pre-fill input. Aujourd'hui le user retape le nom dans OCR review (mineur, ~3s).

   **Validation** : `tsc --noEmit` mobile + api-server ✓, 206/207 tests pass (baseline).

25. **Audit complet codebase 25/05/2026 (task #109)** : Pass de qualité full-stack post-Hēlo Points. 4 agents parallèles → 7 critiques + 5 importants identifiés. Tous patchés (mobile + DB + api-server) :

   **Mobile fixes** :
   - **Bug #1 Logout** (`components/profile/useAccountActions.ts`) : `supabase.auth.signOut()` AVANT `AsyncStorage.clear()`. Sinon JWT persistait dans `supabase.auth.token` → session pouvait leaker au prochain `ensureAnonymousSession` (cross-user risk).
   - **Bug #2 Delete account** : Ordre supabase deletes AVANT `AsyncStorage.clear` (`point_redemptions` → `point_transactions` → `user_points` → `scan_history` → `community_submissions` → `partner_links` → `profiles` → `signOut`) pour éviter rows orphelins si AsyncStorage clear OK mais Supabase fail.
   - **Bug #3+4 Awards Ghost Capture séquentiels** (`app/ocr-review.tsx`) : Refactor `Promise.all` async IIFE → boucle `for...of` séquentielle. Sinon awards parallèles consommaient le cap 300 pts/jour mid-stream et les autres étaient cappés à 0. Source unique `pointsSteps` array partagée entre URL param (`pointsEarned=N`) et awards RPC.
   - **Bug #5 URL params bornés** (`app/verdict/[scanId].tsx`) : `pointsEarned` max 500, `ghostContribCount` max 10 000. Empêche un attaquant URL d'afficher `+999999 ⭐` ou des chiffres aberrants.
   - **Bug #8 ghostCaptureSave awaited avant awards** (`app/ocr-review.tsx`) : `await ghostCaptureSave(...)` AVANT octroi points. Si save fail (réseau, RPC down), pas d'awards → préserve cohérence `user_points` ↔ `community_submissions`. Analytics `ghost_capture_completed` track `saved:true/false` au lieu de prétendre que toutes les contributions ont réussi.
   - **Bug #10 isFirstContributor proper logic** (`lib/heloPoints.ts`) : Query `community_submissions` (PAS `products.source`) avec `neq('user_id', currentUserId)`. Sémantique correcte : "ce user est-il le premier contributeur communautaire" même si OFF/OBF a backfilled le product. Safe default `false` si query fail (don't reward erroneously).

   **api-server fixes** :
   - **Bug #11 logClaudeApiCall retry** (`lib/apiCostTracker.ts`) : 1 retry avec backoff 500ms sur erreur transitoire Supabase. Toujours fire-and-forget (non-fatal pour le user), mais évite de perdre des lignes `api_usage` sur blip réseau pool.

   **DB fix** :
   - **Bug #7 Anti-double-award atomique** (migration `point_transactions_anti_double_award_unique`) : `CREATE UNIQUE INDEX uniq_point_transactions_user_product_reason ON point_transactions(user_id, product_id, reason) WHERE product_id IS NOT NULL`. Garde-fou DB-level même si le RPC `award_points` a un bug — pas de double-credit possible.

   **Trade-offs gardés tels quels (pas de fix)** :
   - **Bug #6 `verdict/[scanId].tsx` phase race** : Code actuel a un guard `activeScanRef.current === barcode` + debounce 50ms. Si phase change après les 50ms, scan complète avec phase initial (légère incorrection). Le fix briserait le guard anti-double-fetch. Trade-off documenté dans les commentaires du code.

   **Validation** : `tsc --noEmit` mobile + api-server ✓, tests 206/207 (3 suites pre-existing supabase env var failure, cf. Gotcha #1), aucune régression.

31. **Audit complet #2 + Bloc 1 safety (task #122, 29/05/2026)** : 5 agents parallèles (74k lignes) + advisors DB live. Bugs critiques trouvés ET corrigés :
   - **#1 SAFETY — allergies ignorées sur chemin backend** : `adaptBackendResponse` (useScan) ne calculait jamais `allergyWarnings` → bannière rouge anaphylaxie jamais affichée en prod (marchait que hors-ligne). Fix : `applyAllergiesToBackendResult()` ré-applique `applyPersonalPreferences` + `getVerdict` sur les matches backend, escalade la sévérité, préserve l'autorité backend (glow/IA).
   - **#2 SÉCU — premium gratuit 1 tap** : `search.tsx` écrivait `PREMIUM_KEY='true'` au clic "Découvrir Premium" → premium app-wide gratuit. Fix : `requirePremium()` → paywall.
   - **#4 — cache legacy `matches:[]`** : faux "safe" sans bannière. Fix : cache hit avec 0 match traité comme miss.
   - **#5 — CI ne testait pas le mobile** + `preferenceMatcher` (allergies) avait 0 test. Fix : `lib/supabase.ts` placeholder URL (ne throw plus à l'import → débloque 3 suites), nouveaux tests `preferenceMatcher.test.ts` (11 cas allergies) + `eNumberAliases.test.ts`, CI lance `npx jest` mobile. **248/248 tests, 20/20 suites vertes** (avant 206/207).
   - **#7 — premium source incohérente** : `search.tsx` + `prescription-scan.tsx` lisaient AsyncStorage brut → refusaient le premium offert via Hēlo Points. Fix : `usePremium()` partout.
   - **#8 — `express.json()` 100kb** rejetait les photos 8MB Vision (le MOAT). Fix : `limit: '12mb'`.
   - **#11 — E-numbers à suffixe cassés** : `resolveENumber` `.toUpperCase()` vs clés minuscules → E150d (caramel Coca), E160b, E472* jamais résolus. Fix : normalisation canonique + test.
   - **#6 — secret committé** : `EXPO_PUBLIC_HELO_APP_SECRET` était en clair dans ce fichier → redacté, **à rotationner** côté Replit + .env avant launch.
   - **Parsing parenthèses = safety** : décision documentée — `parseIngredients` PRÉSERVE le contenu parenthétique ("Arôme (lait)" garde "lait") pour ne jamais perdre un allergène. L'ancien test qui exigeait de stripper était dangereux, corrigé.

   **Orphelins identifiés NON corrigés (volontaire, gelés)** : DrugInteractionBanner, AffiliateButton (purchase_links jamais hydraté), useExpoPushRegistration, pgvector match (jamais appelé), chat unread, partner realtime — tous à 0 row DB. Discipline : ne pas wirer 7 features avant d'avoir des vrais users. Cf. décision "Grande Simplification".

   **Validation** : tsc mobile + api-server ✓, 248/248 tests ✓.

32. **Check-up final 10 agents — chaque ligne A→Z (30/05/2026)** : passe exhaustive (10 agents parallèles) après le Bloc 1. Bugs trouvés ET corrigés (commit `48aa6af`) :
   - **🔴 SAFETY — allergène le plus mortel invisible** : `preferenceMatcher` n'avait PAS la racine `'cacahu'` → **« cacahuète » (arachide, anaphylaxie) jamais détectée** sous son nom courant FR. Idem `'caséin'`/`'caseinat'` (Lait — « caséinate » manquée). Fix : `ALLERGY_KEYWORDS` étendu (+ cacahu, caséin, caseinat, avoine, malt, tofu, anchois, gambas) + nouvelles entrées **Moutarde** et **Céleri**. Couvert par `__tests__/preferenceMatcher.test.ts` (régression cacahuète/caséinate).
   - **🔴 Parsing préfixe langue cassé (backend + mobile)** : l'ancienne regex `/^(en|fr|…)\s*:?\s+/i` EXIGEAIT un espace après le préfixe → la forme OFF la + courante `en:e145` (deux-points SANS espace) leakait `En:e145` dans l'UI ET cassait le matching de l'additif. Fix : `/^(en|fr|de|es|it|nl|pt)(?::\s*|\s+)/i` dans **`lib/productLookup.ts` ET `api-server/src/lib/parseIngredients.ts`** — ⚠️ **DOIVENT rester synchros** (port l'un de l'autre).
   - **🔴 api-server CI crashait à l'import** : `supabaseAdmin.ts` appelait `createClient` avec URL vide → throw au load → suite entière morte (phantom 0 test). Fix : URL placeholder `https://placeholder.supabase.co` quand `isSupabaseConfigured` false (même pattern que mobile `lib/supabase.ts`). Débloque **117 tests api-server**.
   - **`recalls-poll` extractEans trop laxe** : ne capturait pas les GTIN-14 ni les EAN collés au texte. Fix : capture 8–14 chiffres + normalisation GTIN-14 → EAN-13. Insert passé en `upsert(onConflict:'rappel_id', ignoreDuplicates:true)` (anti-doublon si cron rejoue).
   - **`HomeRecentScans` cartes inertes** : les cartes « Récents » de la home n'avaient AUCUN `onPress` → impossible de rouvrir un verdict. Fix : `router.push('/verdict/${id}')` (même pattern que MonPlacardView).
   - **`VerdictBottomBar` catégorie hardcodée** : `category='cosmetic'` en dur → un **aliment** dangereux proposait des **alternatives cosmétiques**. Fix : dérivée de `product.source` (OFF/resto→food, OBF→cosmetic, sinon heuristique `categories[]`, fallback cosmetic = zéro régression).
   - **`scraper supabase_writer.barcodeExists`** lisait `data` au lieu de `count` (avec `head:true`, `data` est null → existence toujours fausse → doublons). Fix : lecture de `count`.
   - **3 tests api-server périmés corrigés** (assertions trop strictes/irréalistes, PAS de vrais bugs) : Yaourt « Lait » → `.includes('lait')`, préfixe langue, parenthèses single-char « X » → tokens réalistes. **Confirmé : `parseIngredients` PRÉSERVE les tokens complets (« Lait entier ») — c'est voulu (safety).**

   **État final vérifié** : **mobile 250/250 (20 suites)**, **api-server 117/0** (avant : crash/phantom), `tsc --noEmit` clean sur les 3 packages (mobile + api-server + scripts).

   **Dettes différées (documentées, non faites — volontaire)** : (a) durcissement prompt-injection sur l'INCI envoyée à Claude (`anthropic.ts`) ; (b) bypass header `requirePremium` (impossible à retirer tant que RevenueCat pas wiré) ; (c) cleanup 4 composants morts ; (d) copy « vous→tu » résiduel ; (e) `MaListeView` vide.

33. **Audit #3 inline + fixes cross-couches (02/07/2026)** : 3e passe complète, faite inline (fan-out agents KO sur session limit). Spécificité : tous les bugs trouvés étaient des **interactions entre couches** (mobile ↔ backend ↔ RLS), zone aveugle des audits mono-fichier. 5 bugs 🟠 + 5 mineurs, TOUS corrigés :
   - **🟠 Partner "Ajouter au placard" échouait silencieusement** : `handleShelfSelect` insérait `scan_history` avec `user_id = effectiveUserId` (= ID de la maman quand le partenaire scanne) → rejeté par la policy RLS `scan_history_insert_owner` (`user_id = auth.uid()`), ET supabase-js retourne `{error}` sans throw → **l'erreur n'était jamais lue, la notification partait quand même**. Fix : insert sous l'ID authentifié (`userId`, le vrai acteur) + check `historyError` + notification seulement si la ligne est écrite.
   - **🟠 Cache backend legacy `matches:[]`** (miroir serveur du bug #4 audit #2) : `routes/scan.ts` cache-hit servait `matches: cached.matches ?? []` → mobile : `totalCount=0`, pas de bannière incertitude, et `applyAllergiesToBackendResult` n'avait RIEN à bumper → **bannière rouge allergie impossible sur ces produits**. Fix : cache hit exige un breakdown non-vide, sinon MISS → recompute.
   - **🟠 Fix VerdictBottomBar (48aa6af) inopérant en prod** : `useScan.adaptBackendResponse` écrit `source:'helo'` pour tout scan backend → la dérivation par source ne marchait QUE sur le fallback local. Fix : le backend expose `product.category` (= beltDomain) dans `ScanResponse` (+ persisté dans le cache payload), `useScan` le propage via `ProductData.categories`, VerdictBottomBar teste categories (+ branche `medication`).
   - **🟠 Insert produit scan sans `source` ni `category`** : (a) régression data-hygiene (produits `source=NULL` de retour après le backfill 25/05) ; (b) **cosmétique découvert via OBF → category NULL → `/alternatives` le traitait en FOOD** (prompt sniper alimentaire, Ceinture food, filet OFF). Fix : `category: beltDomain, source: offSource` à l'insert.
   - **🟠 Premium Hēlo Points ignoré offline** : `useScan` (gate offline) + `useOffline` (download DB) lisaient `PREMIUM_KEY` brut (cache RC seul). Fix : nouveau `lib/premiumStatus.ts` → `getEffectivePremium()` fusionne RC + `bonusPremiumUntil` depuis AsyncStorage SEUL (zéro réseau — marche hors-ligne). `usePremium.fetchBonusPremiumUntil` fait du write-through vers la nouvelle key `STORAGE_KEYS.bonusPremiumUntil` (`@helo_bonus_premium_until`) sur query réussie uniquement (un blip réseau ne révoque pas un bonus).
   - **🟡 ×5** : comparaison secrets à temps constant (`secretsEqual` via `timingSafeEqual` dans appSecret + cron gate recalls) ; cache alternatives passé sur la RPC atomique `merge_analysis_cache` (fallback RMW si 42883) ; sortie Claude Vision **sanitizée serveur** (`sanitizeAnalysis` : category/confidence normalisées avec fallbacks safe, items non-string filtrés) + re-filtre mobile ; `userId` (header RC) passé au sniper pour l'attribution FinOps `api_usage` ; bannières verdict lisent `bannerVerdict` (= verdict AFFICHÉ, onglet bébé compris) avec **union des allergies** (jamais moins d'alerte qu'avant).

   **Vérifié sain à l'audit #3 (pas touché)** : aucun chemin faux-safe (danger court-circuite, IA KO → caution non caché), fixes des audits 1-2 tous en place, 9 allergies onboarding 100% couvertes par `ALLERGY_KEYWORDS`, regex `en:` synchrone, secret scan repo propre, toggle premium Profile bien gated `__DEV__`, CI complète et bloquante.

   **⚠️ Republier Replit Autoscale** après ce push (scan.ts/alternatives.ts/appSecret/analyze-ingredients-image modifiés). Le MCP Supabase était non-authentifié cette session → RLS vérifiée statiquement (migrations) ; la RPC `merge_analysis_cache` doit exister en prod (déployée depuis `docs/supabase-rpc.sql` — sinon fallback RMW automatique, pas de casse).

   **Validation** : tsc mobile + api-server ✓, mobile 250/250 (20 suites), api-server 117/0.

34. **🔴 FAILLE RLS CRITIQUE trouvée + colmatée en prod (02/07/2026)** : découverte en re-authentifiant le MCP Supabase (ancien token `sbp_4106…` révoqué → nouveau généré). Avec accès DB live, preuve d'une fuite invisible dans les migrations.
   - **La faille** : des policies fourre-tout héritées `USING (true)` en `cmd=ALL`/`public` coexistaient avec les policies `*_owner` correctes. En RLS PostgreSQL les policies **permissives se combinent en OR** → `(user_id = auth.uid()) OR true = true` → les policies owner étaient **totalement neutralisées**. Invisible en lisant les migrations (qui ne montraient que les `*_owner`), visible SEULEMENT en base live.
   - **Exploit prouvé** (clé anon publique du bundle, non authentifié) : lecture de **49 profiles** (allergies, trimestre, due date, `medical_conditions` = données de santé RGPD) + **scan_history** ; **écriture publique** sur `ingredients` → empoisonnement possible des verdicts safety (danger→safe pour toutes).
   - **Le fix** (`supabase/migrations/20260702140000_rls_harden_drop_permissive.sql`, appliqué live via Management API) : DROP des policies `*_all`/`qual=true` sur profiles, scan_history, shopping_list, partner_links, pacts, pact_witnesses, community_submissions, product_alternatives + DROP écriture publique sur ingredients. Filets de remplacement créés là où il manquait : `profiles_delete_owner` (GDPR), `partner_links_update_participant`, `product_alternatives_select_public`, `community_submissions_update_authenticated` (fallback ghostCapture), owner-CRUD pacts/pact_witnesses. **`products`/`ingredients` gardent leur SELECT public** (catalogue, pas de PII). + `search_path` pinné sur les 7 SECURITY DEFINER (advisor).
   - **Preuve post-fix** (même test anon) : profiles/scan_history/partner_links/shopping_list → **0 ligne** en anon, INSERT ingredients anon → **HTTP 401**, catalogue toujours lisible. **Aucune casse** : mobile a une session `signInAnonymously` (auth.uid() défini → owner policies OK), backend en service_role (bypass RLS), features touchées flag-off.
   - ⚠️ **Le MCP `mcp__supabase__*` de CETTE session tourne encore sur l'ancien token** → ne remarchera qu'à la **prochaine session** (le serveur MCP ne recharge pas `~/.claude.json` à chaud). En attendant : requêtes via l'API Management (`curl` + `SUPABASE_ACCESS_TOKEN` du `.claude.json`). Nouveau token **jamais commité** (`.claude.json` hors repo).

   **Validation** : migration idempotente (DROP IF EXISTS + CREATE), appliquée + vérifiée live. tsc + tests inchangés (fix DB pur, aucun code mobile/backend touché).

35. **Audit #4 (design→sécurité) + interruption chat + tutoiement complet (02/07/2026 soir)** : passe inline ciblée sur ce qui n'avait pas été lu (design system, chat, écrans secondaires, transverse). Verdict : app solide (discipline safety réelle, design system propre et tokenisé, backend mature). Corrections :
   - **🟠 Chat : le garde-fou de chargement bloquait l'interruption** (demande explicite user). Pendant `isTyping`, l'input était gelé (`editable={!isTyping}`) + bouton envoi désactivé, ET `sendMessage` n'avait NI timeout NI abort → réseau lent = spinner infini, aucune échappatoire. Fix : (a) `lib/anthropic.ts` timeout dur 30s (`Promise.race`) → message clair au lieu de pendre ; (b) `chat.tsx` bouton **STOP** pendant la génération, input jamais gelé, jeton `sendTokenRef` qui invalide la requête interrompue (réponse tardive ignorée). Le scan n'a pas ce piège (verdict timeout 10s + Vision 20s intégrés).
   - **Tutoiement complet** : la décision UX « tu partout » n'était pas tenue (~250 « vous/votre/vos » dont ~56 dans le flux principal). Migration grammaticale (script `scratchpad/tu_migration.py` : `votre`→`ton/ta` selon genre+voyelle via `FEM_CONSONNE`, `vos`→`tes`, impératifs `-ez`→`-e/-s`) sur **92 fichiers**. **Exclusions volontaires** : `lib/anthropic.ts` (voix IA médicale = vouvoiement par design), « vous » de couple (`Vous êtes une équipe`, `un scan et vous êtes liés`, `Vous voyez vos choix` dans `onboarding/index.tsx` — pluriel réel maman+partenaire), « Rendez-vous » (locution). Piège rencontré : un remplacement `Je t'écoute` a cassé une string single-quote → repassée en double-quotes. Résultat : **0 « vous » résiduel** (hors exclusions), tsc clean, 250/250.
   - **Améliorations restantes recommandées (non faites)** : accessibilité VoiceOver (~40% des `onPress` ont un `accessibilityLabel`) ; dark mode « Lune de minuit » défini mais aucun écran ne consomme `useColors()` (finir ou retirer le toggle) ; 7 features gelées à 0 row (discipline OK, à ne pas oublier).

   **Validation** : tsc mobile ✓, mobile 250/250, commits `0f9081e` (interruption) + `848fef3` (tutoiement).

36. **Audit-refacto itératif module par module (02/07/2026 nuit)** : passe qualité (pilier « ligne par ligne / DRY / perf », le moins couvert par les audits 1-4). Un module = un commit, tsc+250 tests verts à chaque.
   - **Module 1 `verdict/[scanId].tsx`** (commit `3f40f90`) : retrait de l'appel DB `getCircle()` exécuté **à chaque ouverture de verdict** (écran le + vu) pour un `circleId` consommé seulement par un `<CircleShareRow>` **commenté** (feature circle flag-off) → 1 requête DB + 1 render évités/vue. + états morts (`circleId`, `sharedToCircle`, `ghostVisible`) et ref write-only `lastFailedBarcode` supprimés. 1121→1114 L.
   - **Module 2 `alternatives.tsx`** (commits `50bf450` + `f36f705`) : (a) la carte affichait toujours le placeholder au lieu de `alt.image_url` (photos OFF/OBF fournies par le backend) → **photo produit affichée** (expo-image) ; (b) **DEUX features mortes réparées** : `MaListeView` était un `useState([])` sans persistance ni writer (liste toujours vide) ET le bouton « Ajouter à ma liste » un stub `Alert("Bientôt disponible")`. Fix : nouvelle `lib/shoppingList.ts` (AsyncStorage, dédup nom+marque, zéro backend) → bouton persiste + `MaListeView` charge au focus + persiste toggle/remove. Nouvelle key `STORAGE_KEYS.shoppingList`, event `alternative_added_to_list`. Titre « The Swap » → « Alternatives » (cohérence FR).
   - **Module 3 `scan.tsx` + `ocr-review.tsx`** (commit `057fc70`) : flux capture/moat **déjà très solides** (ocr-review durci en #109 : awards séquentiels, save-avant-award, 1ère contributrice ×2). Aucun bug. Appliqué : DRY `handleShutter` (nav ocr-review dupliquée → helper `goToOcrReview`). **Proposé non fait** : le base64 photo (150 KB–plusieurs MB) transite par param d'URL vers ocr-review + photo-result → migrer vers handoff AsyncStorage (touche 3 fichiers du moat, à valider + tester runtime).
   - **Module 4 `(tabs)/index.tsx` + `components/home/*`** (commit `bafb231`) : **le plus propre** — index mémoïse (useMemo glow + useCallback handlers), 12/14 composants `React.memo`, `shelf` stable (useState) donc memo réellement efficace. Seul fix : `GlowScoreDeltaToast` était le seul enfant non-mémoïsé → `React.memo`.
   - **Reste à passer** (ordre) : shelf+components, écrans secondaires, lib/hooks, backend (refacto only). Amélioration proposée non faite sur module 1 : extraire 3 blocs IIFE du verdict (`AnalysisSourceCard`, `ContextualQuoteRow`, `CommunityBadge`) en composants mémoïsés.

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

*Last updated 02/07/2026 (nuit) : Audit #4 (gotcha #35) — chat interruptible (bouton STOP + timeout 30s, le garde-fou de chargement ne bloque plus l'interruption) + tutoiement complet « vous→tu » sur 92 fichiers (grammaire correcte, IA médicale + couple + Rendez-vous préservés). Mobile 250/250, tsc clean. Commits 0f9081e + 848fef3.

*Last updated 02/07/2026 (soir) : 🔴 FAILLE RLS critique colmatée en prod (gotcha #34) — policies fourre-tout `qual=true` neutralisaient les owner (profiles/scan_history lisibles en anon = fuite données santé RGPD + écriture ingredients publique = empoisonnement verdict). Migration RLS appliquée + prouvée (anon → 0). Token Supabase rotationné. ⚠️ MCP supabase remarche à la prochaine session. ⚠️ Republier Replit Autoscale (audit #3).

*Last updated 02/07/2026 : Audit #3 + fixes cross-couches (gotcha #33) — partner shelf RLS silencieux, cache backend matches:[], category backend→mobile (VerdictBottomBar prod), insert scan source/category, premium bonus offline, + 5 durcissements (timing-safe, RPC cache alternatives, sanitizer Vision, FinOps userId, bannières bébé). Mobile 250/250, api-server 117/0. ⚠️ Republier Replit Autoscale.

--- archives sessions précédentes ci-dessous ---

*Last updated 30/05/2026 : Check-up final 10 agents (gotcha #32) — cacahuète/caséinate (allergène mortel invisible), regex préfixe langue `en:` (backend+mobile), supabaseAdmin CI crash, recalls extractEans, HomeRecentScans inert, VerdictBottomBar catégorie. Mobile 250/250, api-server 117/0, tsc clean ×3. (commit 48aa6af code + ce commit doc).

--- archives sessions précédentes ci-dessous ---

*Last updated 26/05/2026 (nuit) : Big push infra + scraping pilot live + mobile components.

🎯 Réalisations de la session "fait tout" (tasks #112-120) :

DB foundations (6 migrations MCP + dumpées local) :
- pgvector + pg_trgm extensions
- ingredient_embeddings table + HNSW + RPC match_ingredient_fuzzy
- partner_shelf_events vraie table + Realtime publication
- drug_interactions + RPC find_drug_interactions + profiles.current_medications
- product_recalls + push_subscriptions + RPC find_users_to_notify_recall
- products.purchase_links + affiliate_clicks + v_affiliate_revenue
- products.metadata column (pour scraping provenance)

Code livré (commit 7e4cb08 + 31d2030) :
- Framework scraping Claude-assisted (scripts/scrapers/_shared/)
- Scraper Pharma GDD (14 672 URLs validées)
- 12 brand scrapers via factory (Avène/Mustela/LRP/Bioderma/Weleda/Nuxe/Caudalie/Lierac/Vichy/SVR/A-Derma/Ducray)
- BDPM import script (18k médicaments FR)
- pgvector embeddings populate script
- Mobile lib/affiliateLinks.ts + composant AffiliateButton (wiré dans alternatives.tsx)
- Mobile DrugInteractionBanner.tsx + useExpoPushRegistration.ts hook
- Backend /api/recalls/poll endpoint cron protégé

🟢 Validation live scraping :
- 3 produits Nuxe insérés depuis Pharma GDD avec INCI complète (485-585 chars) + intended_use bien classifié

🔴 Bottleneck découvert :
- Rate limit Anthropic Tier 1 = 50k tokens/min
- 1 page = ~25k tokens → max 2 pages/min
- Mass scraping bloqué tant que pas upgrade Tier 2 OU pre-extract Composition regex (token usage ÷10)

🛏 Prochaine session — par ordre de priorité :

(toi, NEXT STEP)
1. **Compte Firecrawl** (firecrawl.dev free tier 500 pages) → API key → me la filer
   → débloque scraping mass + Carrefour Drive + bypass Cloudflare partout

(toi, 1 clic)
2. Republish Replit Autoscale → active partial_metadata + apiCostTracker + recalls-poll

(toi, ~30min total)
3. Download BDPM ZIP data.gouv.fr → .bdpm-cache/ → pnpm import:bdpm
4. Get OPENAI_API_KEY → pnpm embeddings:populate (~5min, $0.005)
5. Inscrire programmes affiliés (Amazon FR, Monoprix, Bébé9)

(moi, ~3h post Firecrawl key)
6. Refactor scripts/scrapers/_shared/ pour Firecrawl
7. Source masking SQL : UPDATE products SET source = 'helo_*_db_v1' WHERE source LIKE 'scraped_%'
8. Test live 10 produits Pharma GDD via Firecrawl
9. Lancer scraping mass Pharma GDD + Carrefour + brands en background
10. Wire DrugInteractionBanner dans verdict screen
11. Wire registerExpoPushToken dans onboarding step "Activer alertes rappel"
12. Seed drug_interactions table (parse BDPM + sources publiques CRAT)

🛑 Bloque encore le launch beta :
- TestFlight upload (Apple Developer $99/an + EAS secrets)
- App Store assets (6 screenshots, description FR, privacy URL)
- PostHog EAS secrets setup
*
*Maintenu par : Claude — mets à jour ce fichier à la fin de chaque Lot majeur.*
