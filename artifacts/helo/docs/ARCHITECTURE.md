# Architecture Hēlo

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    App Expo (React Native)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Scan Tab │  │ Journal  │  │ Profile  │  │  Communauté  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │                │           │
│  ┌────▼──────────────▼──────────────▼────────────────▼───────┐  │
│  │                  lib/ (business logic)                     │  │
│  │  productLookup · glowscore · trimester · anthropic · ocr  │  │
│  └────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                             │
          ┌──────────────────┼───────────────────┐
          │                  │                   │
   ┌──────▼──────┐  ┌────────▼────────┐  ┌──────▼──────────────┐
   │  Supabase   │  │  Open Food Facts│  │  Supabase Edge Fns  │
   │  (DB + RLS) │  │  Open Beauty F. │  │  /chat  /ocr        │
   └─────────────┘  └─────────────────┘  └─────────────────────┘
                                                   │
                                     ┌─────────────┴──────────┐
                                     │   Anthropic Claude API  │
                                     │   Google Vision API     │
                                     └────────────────────────┘
```

## Tables Supabase

| Table | Description | RLS |
|-------|-------------|-----|
| `ingredients` | Base de données INCI + alimentaire | Public SELECT |
| `products` | Produits scannés indexés | Public SELECT |
| `scan_history` | Historique de scans par utilisateur | Owner only |
| `shopping_list` | Liste de courses personnelle | Owner only |
| `community_submissions` | Soumissions communautaires | Insert public, SELECT approved only |
| `profiles` | Profils grossesse (DPA, trimestre, prénom) | Owner only |
| `partner_links` | Liens co-parent | Participants uniquement |

### Relations clés

```
profiles (id) ──────────────── scan_history (user_id)
profiles (id) ──────────────── shopping_list (user_id)
profiles (id) ──────────────── partner_links (user_id_a, user_id_b)
ingredients (id) ───────────── [matchIngredients() matches by name/INCI]
```

## Flux de scan barcode

```
1. Utilisateur scanne un code-barres (expo-camera)
2. sanitizeBarcode() valide le format (8 ou 13 chiffres)
3. fetchProductByBarcode() interroge :
   a. Open Food Facts (aliments) → /api/v2/product/{barcode}.json
   b. Open Beauty Facts (cosmétiques) → cascade si OFF renvoie null
4. parseIngredients() extrait la liste depuis ingredients_text_fr
5. matchIngredients() fait la correspondance contre la table Supabase `ingredients`
   - Matching par nom, INCI, synonymes
   - risk_level selon le trimestre courant (T1/T2/T3/breastfeeding/baby)
6. getVerdict() calcule : danger > caution > safe
7. Verdict affiché + ajout à scan_history
8. calculateGlowScore() met à jour le score global du placard
```

## Variables d'environnement requises

| Variable | Usage | Côté |
|----------|-------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL Supabase | Client |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase | Client |
| `EXPO_PUBLIC_GOOGLE_VISION_KEY` | OCR ingrédients | ⚠️ Migrer vers Edge Function |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | Chat IA + Vision | ⚠️ Migrer vers Edge Function |
| `EXPO_PUBLIC_RC_KEY_IOS` | RevenueCat iOS | Client |
| `EXPO_PUBLIC_RC_KEY_ANDROID` | RevenueCat Android | Client |

Les clés Anthropic et Google Vision DOIVENT être migrées côté serveur (Edge Functions).
Voir `docs/SECURITY.md` pour le plan de migration.

## Lancer le projet en développement

```bash
# Depuis la racine du monorepo
pnpm install
pnpm --filter @workspace/helo run dev

# Sur iOS (simulateur)
pnpm exec expo start --ios

# Sur Android
pnpm exec expo start --android
```

## Lancer les tests

```bash
cd artifacts/helo
pnpm test           # Jest — tests unitaires
pnpm typecheck      # TypeScript strict check
```

## Pipeline d'ingrédients

Le fichier `supabase/seed-ingredients.sql` contient la base initiale.
Pour enrichir la base :

1. Ajouter les ingrédients dans `supabase/seed-ingredients.sql`
2. Pousser via : `supabase db push` ou `psql -f supabase/seed-ingredients.sql`
3. Les champs `risk_level_t1`, `risk_level_t2`, `risk_level_t3` définissent le risque par trimestre
4. Les valeurs possibles : `'safe' | 'caution' | 'danger' | 'no_signal'`

## Structure des dossiers principaux

```
artifacts/helo/
├── app/                    # Expo Router — écrans et navigation
│   ├── (tabs)/             # Onglets principaux
│   ├── onboarding/         # Flux d'onboarding
│   ├── verdict/            # Résultats de scan
│   └── _layout.tsx         # Layout global + ErrorBoundary
├── components/             # Composants UI réutilisables
│   ├── ui/                 # Boutons, cartes, texte, badges
│   └── shelf/              # Composants placard
├── constants/
│   └── theme.ts            # Système de design (couleurs, typo, ombres)
├── hooks/                  # Hooks métier (useProfile, usePremium, ...)
├── lib/                    # Logique métier (scan, IA, Supabase, ...)
│   ├── config.ts           # ★ Configuration centralisée (env vars)
│   ├── validation.ts       # ★ Sanitization des inputs
│   └── errorReporting.ts   # ★ Logging des erreurs
├── supabase/
│   ├── functions/          # Edge Functions Supabase (proxies API)
│   ├── rls-policies.sql    # ★ Politiques RLS complètes
│   └── schema.sql          # Schéma de la base de données
├── types/
│   └── index.ts            # Types TypeScript partagés
└── __tests__/              # Tests unitaires Jest
```
