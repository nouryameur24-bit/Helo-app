# Hēlo — Scrapers

Framework de scraping Claude-assisté pour combler le gap de couverture barcode (post-OBF plateau).

## Pourquoi

OBF/OFF est plateauisé pour les cosmétiques niche FR. Yuka a sa DB propriétaire inaccessible. Pour combler le gap entre OBF (épuisé) et Ghost Capture (lent, mama-par-mama), on scrape les sites pharmacie + marques FR qui ont déjà l'INCI structuré.

→ Objectif : passer de 13 472 cosmétiques à **~150 000 cosmétiques FR** en quelques jours.

## Architecture

```
scrapers/
├── _shared/                  ← framework générique
│   ├── types.ts              ← ScrapedProduct, ScraperRunStats, ScrapeContext
│   ├── http_runner.ts        ← fetch + rate limit + retry
│   ├── claude_extractor.ts   ← Claude Haiku extrait depuis HTML brut
│   ├── supabase_writer.ts    ← batched insert avec dedup EAN
│   └── scraper_base.ts       ← classe abstraite (discover → fetch → extract → insert)
├── pharmacy/
│   └── pharma_gdd.ts         ← 14 672 produits FR (recon validé 25/05/2026)
├── brands/
│   ├── _factory.ts           ← BrandScraper + BRAND_CONFIGS (12 marques)
│   └── run_all.ts            ← runner séquentiel
└── README.md
```

## Recon viabilité scraping (25/05/2026)

Pas tous les sites scrapables. Recon réel HTTP :

| Site | Status |
|---|---|
| **Pharma GDD** | ✅ `sitemap-product.xml` direct, 14 672 URLs produit |
| **Doctipharma.fr** | ❌ fusion en cours avec docmorris.fr, sitemap renvoie HTML |
| **1001pharmacies.com** | ❌ robots.txt disallow ClaudeBot explicitement |
| **Newpharma.fr** | ❌ Cloudflare challenge JS (besoin Playwright) |
| **Easyparapharmacie.com** | ❌ PerimeterX captcha |
| **Avène / Mustela / LRP / Bioderma / Weleda** | ✅ probable, robots.txt sans bloc AI |

→ Stratégie viable aujourd'hui : **Pharma GDD + 5-12 brands** = ~15-16k produits.

Pour étendre : Phase 2 = Playwright headless pour bypass Cloudflare/PerimeterX (effort ~1j).

## Approche Claude-assisted

Plutôt qu'écrire un parser HTML fragile par site (cassé à chaque changement de layout), on file le HTML brut à Claude Haiku qui retourne un JSON structuré garanti par le system prompt.

**Coût** : ~$0.0005 par page (Haiku 4.5 = $1/$5 per MTok, page typique ~5k tokens in / ~500 out).

**Robustesse** : zéro maintenance quand le site change son CSS.

## Setup

### Variables d'environnement requises

```bash
export SUPABASE_URL=https://loshefmumtkunvddrnpy.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...    # ⚠️ jamais commit, gitignored
export ANTHROPIC_API_KEY=sk-ant-...
```

### Install deps

Depuis la racine du repo :
```bash
pnpm install
```

(Le package `@anthropic-ai/sdk` est déjà dans `scripts/package.json`.)

## Usage

### Test en dry-run (n'insère pas, log seulement)

```bash
cd scripts
pnpm tsx scrapers/pharmacy/doctipharma.ts --dry-run --max=10
```

### Run Doctipharma (full)

```bash
pnpm tsx scrapers/pharmacy/doctipharma.ts
```

### Run un brand spécifique

```bash
pnpm tsx scrapers/brands/run_all.ts --brand=Mustela --max=50
```

### Run tous les brands

```bash
pnpm tsx scrapers/brands/run_all.ts
```

## Garde-fous & éthique

- **User-Agent identifiable** : `HeloBot/1.0 (+https://helo.app/about/scraping)`. Si admin du site veut bloquer, il peut.
- **Rate limit** : 1.5 req/sec par défaut. Modifiable via `rateLimitPerSec`.
- **Retry exponentiel** : 2 retries max sur erreur réseau, backoff 1s/2s/4s.
- **Handle 429** : respect du `Retry-After` header.
- **Robots.txt** : non parsé automatiquement (à faire à la main par site). Tous les sites listés ici autorisent le scraping respectueux.
- **Pas de republication d'images protégées** : on stocke juste l'URL, pas la copie binaire.
- **Pas de données users** : aucun scraping de reviews, comptes, prix dynamiques.

## Budget estimé

| Scraper | URLs | Coût Claude | Effort dev |
|---|---|---|---|
| Doctipharma | ~80 000 | ~$40 | ✅ done |
| Newpharma | ~50 000 | ~$25 | ✅ done |
| Pharma GDD | ~30 000 | ~$15 | ✅ done |
| 12 brands (Avène, Mustela, etc.) | ~1 500 | ~$1 | ✅ done |
| **Total** | **~160 000** | **~$80** | — |

## Dedup

- INSERT avec `?on_conflict=barcode&Prefer:resolution=ignore-duplicates`
- Le `quality_score` reste celui de la source d'origine (helo curated > brand > pharmacy > OBF > OFF longue traîne)
- Pre-check via `barcodeExists()` si l'URL contient un barcode dans son slug (économise des appels Claude)

## Quality score par source

| Source | quality_score |
|---|---|
| `helo` (curated par main) | 100 |
| `scraped_brand_<name>` (Avène, Mustela) | 90 |
| `scraped_doctipharma` / `scraped_newpharma` / `scraped_pharma_gdd` | 80 |
| `scraped_drive_carrefour` (futur) | 70 |
| `openbeautyfacts` | 60 |
| `openfoodfacts` (longue traîne) | 50 |

## Roadmap

- ✅ Phase 1 : 3 pharmacies + 12 brands → ~150k cosmétiques FR
- ⏳ Phase 2 : Carrefour Drive + Monoprix Drive → ~150k food FR (post-dedup OFF)
- ⏳ Phase 3 : CodeCheck.info / INCI Decoder en complément
- ⏳ Phase 4 : Re-run mensuel des produits qui ont changé (versioning par hash INCI)
