# Hēlo — Supabase

Structure de la base de données Hēlo (PostgreSQL EU, projet `loshefmumtkunvddrnpy`).

```
supabase/
├── README.md              ← tu lis ce fichier
├── migrations/            ← 23 migrations versionnées YYYYMMDDHHMMSS_*.sql
├── seeds/                 ← données de seed (ingrédients, produits demo)
├── functions/             ← 3 Edge Functions Deno (chat, ocr, scan-quota)
└── .temp/                 ← état Supabase CLI (project-ref, versions, etc.)
```

## Migrations

Toutes les migrations sont nommées `YYYYMMDDHHMMSS_nom_snake_case.sql` selon le standard Supabase CLI.

### Conventions

- **Naming** : `YYYYMMDDHHMMSS_descriptive_name.sql` (timestamp UTC + snake_case)
- **Idempotence** : toujours `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING`
- **Reversibilité** : pas de migration `down/` pour l'instant — préférer correction par nouvelle migration
- **Atomicité** : 1 fichier = 1 changement logique (table, RPC, view)

### Migrations existantes (chronologique)

| Date | Fichier | Description |
|---|---|---|
| 2026-03-12 | `20260312030434_initial_schema.sql` | Schema initial (profiles, ingredients, products, scan_history, etc.) |
| 2026-03-12 | `20260312230533_alternatives.sql` | Système alternatives produits |
| 2026-03-20 | `20260320002617_community_submissions.sql` | Table community_submissions (Ghost Capture) |
| 2026-03-30 | `20260330160221_baby_mode.sql` | Mode bébé (risk_level pour 0-2 ans) |
| 2026-03-31 | `20260331224007_circle.sql` | Cercle (feature flag off) |
| 2026-03-31 | `20260331234522_rls_policies.sql` | Row Level Security policies |
| 2026-05-15 | `20260515182430_ghost_capture.sql` | RPC ghost_capture_upsert atomique |
| 2026-05-16 | `20260516125621_api_usage.sql` | Table api_usage + RPC consume_api_quota |
| 2026-05-25 | `20260525001611_lot17_dose_and_herbs.sql` | Lot 17 : max_dose_mg_per_day + 50 plantes CRAT |
| 2026-05-25 | `20260525005813_lot18_ghost_capture_safety.sql` | Lot 18 : threshold 5 + rate limit per-user |
| 2026-05-25 | `20260525022454_lot19_a1_essential_oils_60.sql` | Lot 19 : 60 huiles essentielles CRAT |
| 2026-05-25 | `20260525022630_lot19_a1_food_ingredients_80.sql` | Lot 19 : 80 ingrédients alimentaires (mercures, listeria, etc.) |
| 2026-05-25 | `20260525022723_lot19_a1_trendy_cosmetics_2025.sql` | Lot 19 : 30 ingrédients cosmétiques trendy K-beauty |
| 2026-05-25 | `20260525022802_lot19_j3_profiles_user_preferences_sync.sql` | Lot 19 : sync allergies/dietary backend |
| 2026-05-25 | `20260525022841_lot19_l_analytics_views.sql` | Lot 19 : 8 vues analytics dashboard |
| 2026-05-25 | `20260525023021_lot19_d1_pregnancy_food_tags.sql` | Lot 19 : tags listeria/toxo/mercure sur products food |
| 2026-05-25 | `20260525145357_lot19_e1b_intended_use_schema.sql` | Lot 19 : colonnes intended_use + quality_score |
| 2026-05-25 | `20260525150244_api_usage_cost_tracking.sql` | Tracking coût Claude API (model, tokens, USD) |
| 2026-05-25 | `20260525170104_helo_points_system.sql` | Hēlo Points : 4 tables + 2 RPCs + 8 récompenses |
| 2026-05-25 | `20260525171727_helo_points_fulfillment_v2.sql` | Phase 1.5 : auto-fulfillment Premium + Badge Founder (⚠️ bug profiles.id) |
| 2026-05-25 | `20260525174825_helo_points_redeem_fix_profiles_id.sql` | Fix critique : profiles.id pas user_id |
| 2026-05-25 | `20260525174904_profiles_auto_create_trigger.sql` | Trigger anti-drift auth.users → profiles + backfill |
| 2026-05-25 | `20260525180124_point_transactions_anti_double_award_unique.sql` | Anti-double-award partial unique index |

## Seeds

Données de seed dev/demo (ordre d'exécution = préfixe `01_`, `02_`, ...).

| Fichier | Description |
|---|---|
| `01_ingredients.sql` | ~50 ingrédients curés (cosmétiques + alimentaires + médicaments) |
| `02_ingredients_baby.sql` | Risk levels mode bébé pour les mêmes ingrédients |
| `03_products.sql` | ~20 produits curés démo (Yuka-équivalent local) |
| `_legacy_bootstrap_all.sql` | Bundle bootstrap historique — superseded par les fichiers numérotés ci-dessus + migrations |

**Note** : La DB prod a aujourd'hui ~5 313 ingrédients et 626 986 produits — ces seeds sont historiques (premier launch). Les enrichissements suivants (60 huiles, 80 food, 30 cosmétiques) sont dans des migrations Lot 19.

## Workflow

### Pour appliquer une nouvelle migration

1. **Via MCP Supabase (recommandé)** :
   ```ts
   await supabase.apply_migration({
     name: 'feature_xyz',  // snake_case, le timestamp est auto-généré
     query: '...',
   });
   ```
   Le SQL est appliqué + tracké dans `supabase_migrations.schema_migrations`.

2. **Dump local** : Après l'application MCP, créer le fichier dans `migrations/` avec le timestamp officiel pour traçabilité git :
   ```sql
   -- Migration : feature_xyz
   -- Appliquée via Supabase MCP le YYYY-MM-DD
   -- Version: YYYYMMDDHHMMSS
   ...
   ```

3. **Update CLAUDE.md gotchas** si besoin (RPCs critiques, breaking changes).

### Pour vérifier l'état d'application

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Pour reset le local dev (jamais sur prod !)

```bash
supabase db reset  # CLI uniquement, attention destructif
```

## Edge Functions

3 fonctions Deno deployed sur Supabase :
- **`chat`** : Forward chat user → Claude Haiku (legacy, en cours de migration vers api-server)
- **`ocr`** : Google Vision OCR (texte depuis image)
- **`scan-quota`** : RPC server-side quota scan free vs premium

```bash
supabase functions deploy <function>
```

## Tables clés (DB live)

- **`profiles`** : user profil + allergies/dietary/cosmetic + bonus_premium_until + is_founder
- **`ingredients`** : 5 313 entries (medication/food/cosmetic) avec risk_levels par phase
- **`products`** : 626 986 entries (OFF/OBF + helo curated + community) avec overall_risk + pregnancy_risks
- **`scan_history`** : historique scans utilisateurs
- **`community_submissions`** : Ghost Capture pending + verified (5 scans = auto-verify)
- **`product_alternatives`** : 957 paires alternatives cohérentes par intended_use
- **`user_points`** + **`point_transactions`** + **`rewards_catalog`** + **`point_redemptions`** : Hēlo Points (gamification)
- **`api_usage`** : tracking coût Claude API (model, tokens, USD, duration_ms)
- **`partner_links`** : pairing maman ↔ partenaire
- **`waitlist`** : pre-launch waitlist

## RPCs critiques

| RPC | Description |
|---|---|
| `award_points` | Octroi atomique + anti-spam (cap 300 pts/jour, 1 award par barcode/reason) |
| `redeem_reward` | Dépense atomique + auto-fulfillment Premium + Badge Founder |
| `ghost_capture_upsert` | Insert/update community_submissions atomique + rate limit per-user |
| `merge_analysis_cache` | Cache analyse OFF + AI fallback |
| `upsert_product_keep_cache` | Insert product sans invalider le cache existant |
| `consume_api_quota` | Server-side check quota free vs premium |
| `ensure_profile_for_user` | Trigger anti-drift auth.users → profiles |

## Views analytics

`SELECT * FROM v_<name>` :
- `v_ingredients_health` — coverage par catégorie + risk levels
- `v_products_health` — coverage par source + catégorie
- `v_user_activity` — signups par jour (sans PII)
- `v_top_scanned_products` — top 1000 produits scannés
- `v_top_unknown_products` — produits avec ingrédients non identifiés (enrichissement prioritaire)
- `v_waitlist_growth` — croissance waitlist par jour
- `v_community_health` — santé des ghost captures community
- `v_pregnancy_tags_stats` — stats tags pregnancy (listeria, toxo, mercure, etc.)
- `v_api_costs_daily` — coûts Claude API par jour
- `v_points_leaderboard` — leaderboard Hēlo Points

## Référence

- Supabase Dashboard : https://supabase.com/dashboard/project/loshefmumtkunvddrnpy
- Project ref : `loshefmumtkunvddrnpy` (région EU)
- MCP supabase : disponible via `mcp__supabase__*` dans Claude Code
- Source de vérité prod : la DB live (les fichiers SQL sont l'historique committé pour traçabilité)
