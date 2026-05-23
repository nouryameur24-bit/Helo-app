# Hēlo — Logique ALTERNATIVES : pipeline complet + problèmes rencontrés

> Snapshot 23 mai 2026 — matcher v12 — focus exclusif sur le pipeline d'alternatives.

---

## 0. TL;DR — la chaîne en 7 étapes

```
[Mobile]                          [Backend GET /api/alternatives/:barcode]
   │                                          │
   │ 1. clic "Voir alternatives"              │ A. Bouclier premium (header)
   ├─────────────────────────────────────────►│ B. Cache analysis_cache[phase_v12]
   │                                          │ C. Lookup origin Supabase
   │                                          │ D. Extraction keywords + categories_tags
   │                                          │ E. LIVE FILET OFF/OBF (cgi/search.pl)
   │                                          │ F. SNIPER Claude Haiku (max 3 picks)
   │                                          │ G. CEINTURE matcher déterministe
   │                                          │ H. Scoring badges + tri
   │ 2. carousel 3–5 cartes                   │ I. Cache write best-effort
   │◄─────────────────────────────────────────│
```

---

## 1. Côté mobile — `app/alternatives.tsx`

### 1.1 Inputs (params URL Expo Router)

Routés depuis `verdict/[barcode].tsx` quand l'utilisatrice clique "Voir alternatives" :

| Param | Type | Origine |
|---|---|---|
| `barcode` | `string` | barcode scanné |
| `category` | `'food' \| 'cosmetic' \| 'medication'` | calculé scan |
| `productName` | `string` | nom retourné par OFF/Supabase |
| `productBrand` | `string` | marque |
| `flaggedDanger` | `JSON.stringify(string[])` | ingrédients risk=danger |
| `flaggedCaution` | `JSON.stringify(string[])` | ingrédients risk=caution |
| `trimester` | `'1'\|'2'\|'3'\|'breastfeeding'\|'baby'` | phase user |

### 1.2 Hook principal

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    setLoading(true);
    const [remote, dangerExpl, cautionExpl] = await Promise.all([
      fetchAlternativesRemote(barcode, trimester, isPremium),
      getIngredientExplanations(flaggedDanger),   // Supabase direct
      getIngredientExplanations(flaggedCaution),
    ]);
    if (cancelled) return;

    // Bouclier monétisation côté client (M1) :
    //  (a) 403 backend explicite "premium_required" → paywall
    //  (b) backend KO ET user free → paywall (pas de fallback gratuit)
    if (!remote.ok && (remote.error.kind === 'premium_required' || !isPremium)) {
      router.replace({ pathname: '/paywall', params: { trigger: 'feature' } });
      return;
    }

    let results: AlternativeProduct[];
    if (remote.ok) {
      results = remote.data.slice(0, isPremium ? 5 : 3);
    } else {
      // Fallback local UNIQUEMENT pour premium si backend timeout/5xx
      results = await getAlternativesByBarcode(
        barcode, { danger: flaggedDanger, caution: flaggedCaution }, trimester, true,
      );
    }
    setAlternatives(results);
    setExplanations({ danger: dangerExpl, caution: cautionExpl });
    setLoading(false);
  })();
  return () => { cancelled = true; };
}, [barcode, isPremium, trimester, flaggedDangerKey, flaggedCautionKey]);
```

### 1.3 Affichage

- `ScrollView horizontal` avec snap (carousel), `CARD_WIDTH = SCREEN_WIDTH - 64`, `CARD_GAP = 12`.
- Chaque carte : image, nom, marque, badge origine (pharmacy/french/bio), score caution, **`reason`** (phrase ≤15 mots Claude).
- Empty state : si `alternatives.length === 0` → bottom-sheet "Suggérer une alternative" (insert dans `community_submissions`).

---

## 2. Client HTTP — `lib/api.ts`

### 2.1 Endpoint

```ts
GET ${EXPO_PUBLIC_HELO_API_URL}/api/alternatives/${encodeURIComponent(barcode)}
  ?trimester={1|2|3|breastfeeding|baby}

Headers:
  x-helo-app-secret: $EXPO_PUBLIC_HELO_APP_SECRET   // middleware auth backend
  x-helo-is-premium: 'true' | 'false'                // signal FinOps (NON secret)

Timeout: 8 000 ms (au-delà → fallback local)
```

### 2.2 Mapping status → error discriminée

```ts
type AlternativesError =
  | { kind: 'premium_required'; message?: string }   // 403 — paywall
  | { kind: 'not_found' }                            // 404 — barcode inconnu
  | { kind: 'unauthorized' }                         // 401 — app_secret KO
  | { kind: 'rate_limited' }                         // 429
  | { kind: 'invalid_request'; detail?: string }     // 400
  | { kind: 'network' | 'server' | 'unconfigured'; detail?: string };
```

### 2.3 DTO renvoyé

```ts
interface AlternativeProductDto {
  id: string;                                  // = barcode (pas d'UUID interne)
  name: string;
  brand: string;
  category: string;                            // string brute → coerce côté mobile
  barcode: string | null;
  image_url: string | null;
  description_fr: string | null;               // toujours null aujourd'hui
  reason: string | null;                       // M3 : phrase ≤15 mots Claude
  overall_risk: 'safe' | 'caution';
  price_range: string;                         // vide aujourd'hui
  popularity_count: number;                    // score interne, sert au tri
  origin_badge: 'pharmacy' | 'french' | 'bio' | null;
}
```

Validation défensive : payload `!Array.isArray` → traité comme `server error` (déclenche fallback) plutôt que faux empty.

---

## 3. Backend — `GET /api/alternatives/:barcode`

Constante critique : `const MATCHER_VERSION = 'v12';` → toute la stratégie d'invalidation cache repose dessus.

### 3.1 Étape A — Bouclier FinOps

```ts
const isPremiumRequest = req.header('x-helo-is-premium') === 'true';
if (!isPremiumRequest) {
  emitMetric(req.log, 'alternatives_premium_blocked', { barcode });
  return res.status(403).json({ error: 'premium_required', feature: 'alternatives' });
}
```

⚠️ **Header non-cryptographique** — n'importe qui peut forger. Vrai bouclier = IAP RevenueCat device-side. Ce header sert juste à **éviter le coût Claude/OFF** avant qu'on ait un JWT signé.

Middleware en amont : `requireAppSecret` (401 si `x-helo-app-secret` ≠ `$HELO_APP_SECRET`) + rate-limit 10 req/min/IP.

### 3.2 Étape B — Validation + cache hit

```ts
if (!/^[0-9]{6,14}$/.test(barcode)) return res.status(400);
const parse = QuerySchema.safeParse(req.query);  // Zod
const phase: Phase = parsePhase(parse.data.trimester);
const cacheKey = `${phase}_v12`;  // ex: "t2_v12", "breastfeeding_v12"

const { data: origin } = await supabaseAdmin.from('products')
  .select('id, barcode, name, brand, category, ingredients_raw, image_url, analysis_cache')
  .eq('barcode', barcode).maybeSingle();
if (!origin) return res.status(404);

const cache = (origin.analysis_cache ?? {}) as Record<string, any>;
const phaseCache = cache[cacheKey];

// Cache HIT = DTOs complets déjà calculés
if (phaseCache?.alternatives_dtos) {
  emitMetric(req.log, 'alternatives_cache', { hit: true, n: phaseCache.alternatives_dtos.length });
  return res.json(phaseCache.alternatives_dtos);
}
```

Shape JSONB Supabase :
```jsonc
analysis_cache: {
  "t1_v12":             { "search_keyword": "moutarde", "alternatives_dtos": [...], "alternatives_computed_at": "..." },
  "t2_v12":             { ... },
  "breastfeeding_v12":  { ... }
}
```

### 3.3 Étape C — Keywords + categories_tags

```ts
// Hint mot-clé : sauvegardé par /api/scan (Claude scan a renvoyé search_keyword)
const searchKeyword = phaseCache?.search_keyword ?? null;

// Heuristique de secours : BRAND_TO_TYPE + PRODUCT_TYPES + 1er mot ≥4 chars
const fallbackKeywords = extractKeywords(origin.name, origin.brand);
const uniqueKw = [...new Set([searchKeyword?.toLowerCase(), ...fallbackKeywords].filter(Boolean))];

const isCosmetic = (origin.category ?? '').toLowerCase() === 'cosmetic';
const beltDomain: IngredientDomain = isCosmetic ? 'cosmetic' : 'food';

// Fetch categories_tags du produit origine depuis OFF/OBF
const originCategoriesTags = await fetchOriginCategoriesTags(barcode, isCosmetic);
const categoryTag = pickMostSpecificCategoryTag(originCategoriesTags);
// ex: ["en:condiments","en:mustards","en:dijon-mustards"] → "en:dijon-mustards"
```

`extractKeywords` cherche d'abord un **form-factor** ("Twix glacé" → `sorbet|yaourt glacé|glace`), puis matche `BRAND_TO_TYPE` (40+ marques non-grossesse → alternatives safe par défaut : `coca → eau pétillante|limonade|soda`), puis `PRODUCT_TYPES` generic, sinon 1er mot alphabétique ≥4 chars hors stopwords.

`pickMostSpecificCategoryTag` parcourt `categories_tags` à l'envers (OFF range du général au spécifique), skip un set `TOO_GENERIC_TAGS` (`en:foods, en:beverages, en:cosmetics, en:plant-based-foods, en:groceries, en:body, en:hair…`), retient le 1er segment ≥ 4 chars.

### 3.4 Étape D — LIVE FILET OFF/OBF

```ts
const { candidates, strategy } = await fetchLiveCandidates(
  uniqueKw, isCosmetic, barcode, req.log, categoryTag, origin.brand ?? null,
);
if (candidates.length === 0) {
  // ⚠️ N'ÉCRIT PAS le cache — quasi toujours blip OFF 503 transient.
  return res.json([]);
}
```

#### Phase 1 — catégorie scopée, **keyword vide volontairement**

```ts
if (categoryTag) {
  // keyword="" → cgi trie par sort_by=unique_scans_n (popularité), donc
  // mix de marques. AVEC keyword="amora", tri par pertinence textuelle =
  // 20× Amora retournés (bug originel décrit §4).
  const { candidates } = await searchOffCandidates('', isCosmetic, categoryTag);
  for (const c of candidates) {
    if (seen.has(c.barcode)) continue;
    if (excludeBrandNorm && c.brand.trim().toLowerCase() === excludeBrandNorm) continue;
    seen.add(c.barcode); collected.push(c);
    if (collected.length >= 30) break;
  }
}
```

#### Phase 2 — fallback mots-clés si <5 candidats

```ts
if (collected.length < 5) {
  for (const kw of keywords.slice(0, 3)) {
    if (collected.length >= 10) break;
    if (excludeBrandNorm && kw === excludeBrandNorm) continue;
    const { candidates } = await searchOffCandidates(kw, isCosmetic, categoryTag ?? null);
    /* push avec mêmes filtres seen + excludeBrand */
  }
}
```

#### Diversité — max 2 candidats par marque

```ts
const perBrandCount = new Map<string, number>();
const brandDiverse: LiveCandidate[] = [];
for (const c of collected) {
  const key = c.brand.trim().toLowerCase() || '__nobrand__';
  if ((perBrandCount.get(key) ?? 0) >= 2) continue;
  perBrandCount.set(key, (perBrandCount.get(key) ?? 0) + 1);
  brandDiverse.push(c);
}
return { candidates: deduplicateCandidates(brandDiverse).slice(0, 20), strategy };
```

#### `searchOffCandidates` — routage **ES vs cgi**

```ts
// 2 endpoints OFF aux comportements opposés :
//
//  • ES (search.openfoodfacts.org) → 1s, MAIS ignore param categories_tags
//    ET ne renvoie pas categories_tags dans la réponse. Inutilisable si
//    categoryTag présent.
//  • cgi/search.pl (world.openfoodfacts.org) → 3-4s, parfois 503, MAIS
//    supporte facet `tagtype_0=categories&tag_0=mustards` server-side
//    ET renvoie categories_tags.
//
// → cgi forcé si categoryTag OU isCosmetic (OBF n'a pas d'endpoint ES).

if (isCosmetic || categoryTag) {
  const host = isCosmetic ? 'https://world.openbeautyfacts.org'
                          : 'https://world.openfoodfacts.org';
  const params = new URLSearchParams({
    search_terms: keyword,             // peut être "" → tri popularité pure
    sort_by: 'unique_scans_n',
    page_size: '30', json: 'true', action: 'process',
  });
  if (categoryTag) {
    params.set('tagtype_0', 'categories');
    params.set('tag_contains_0', 'contains');
    const tail = categoryTag.split(':').slice(1).join(':') || categoryTag;
    params.set('tag_0', tail);
  }
  url = `${host}/cgi/search.pl?${params}`;
} else {
  url = `${ES_HOST}?${new URLSearchParams({ q: keyword || '*',
    countries_tags: 'en:france', page_size: '30' })}`;
}

// Retry 3×, backoff [0, 250, 750] ms, timeout 8s, user-agent identifié
const BACKOFFS_MS = [0, 250, 750];
const OFF_TIMEOUT_MS = 8000;
const USER_AGENT = 'Helo/1.0 (https://helo.app)';
```

#### Normalisation `LiveCandidate`

```ts
interface LiveCandidate {
  barcode: string;            // /^[0-9]{6,14}$/
  name: string;               // FR > EN > drop
  brand: string;              // ES: array[0] | cgi: string.split(',')[0]
  ingredients_raw: string;    // text_fr > text_en > tags i18n joinés si ≥3
  image_url: string | null;   // image_front_url > image_url > image_small_url
  labels_tags: string[];      // ["en:organic", "fr:bio", ...]
  category: string;
  categories_tags: string[];  // ["en:condiments", "en:mustards", ...]
}
// Drop si ingredients_raw < 20 chars (Claude ne peut pas juger l'invisible).
```

#### Dédoublonnage

```ts
// Clé = brand|name débarrassé des formats (200g, 50cl, 1L, etc.) → fusionne
// "Maille MdD 215g" et "Maille MdD 380g".
const key = `${brand.toLowerCase()}|${name.toLowerCase()
  .replace(/\s+/g,' ')
  .replace(/\d+\s*(ml|cl|l|g|kg)\b/g, '')
  .trim()}`;
```

### 3.5 Étape E — SNIPER Claude Haiku

```ts
const sniperInput: AlternativeCandidate[] = candidates.map(c => ({
  barcode: c.barcode,
  name: c.brand ? `${c.brand} — ${c.name}` : c.name,
  ingredients_raw: c.ingredients_raw,
}));

const sniperResult = await selectSafeAlternativesWithClaude({
  candidates: sniperInput,
  trimester: phase,
  originalName: origin.name,
  searchKeyword: searchKeyword ?? fallbackKeywords[0] ?? '',
  isCosmetic,                                  // → choisit prompt food vs cosmetic
  log: req.log,
});
// → SniperResult { barcodes: string[], picks: SniperPick[], outcome }
```

#### Deux prompts système distincts

**FOOD :**
```
Tu es un expert en toxicologie périnatale ET en grande distribution alimentaire
française. Voici 20 produits candidats avec leurs listes d'ingrédients.
Le produit d'origine est : '{originalName}' (Catégorie : '{searchKeyword}').
L'utilisatrice est au {trimester}.

Ta mission : Sélectionne jusqu'à 3 produits qui respectent STRICTEMENT :
1. SÉCURITÉ ALIMENTAIRE ABSOLUE : zéro caféine > OMS (200mg/j), zéro édulcorant
   déconseillé (aspartame T3, cyclamate), zéro additif controversé (E102/E110/
   E124 azoïques, E249-E252 nitrites, E951), zéro alcool, zéro risque listériose
   /toxoplasmose (lait cru, charcuterie crue, poisson cru/fumé), zéro mercure
   élevé (thon rouge, espadon).
2. COHÉRENCE D'OCCASION : même MOMENT DE CONSOMMATION (boisson → boisson, sorbet
   OK comme alt glace).
3. MARCHÉ FRANÇAIS uniquement.

🚨 Si AUCUN produit ne respecte la règle 1, renvoie [].

⚠️ FORMAT : [{"barcode":"...","reason":"..."}]. reason = phrase FR ≤15 mots.
```

**COSMETIC :**
```
Tu es un expert en cosmétovigilance périnatale ET en grande distribution
cosmétique française. Listes INCI fournies.

Règle 1 SÉCURITÉ CUTANÉE (absorption transdermique = risque fœtus) :
zéro perturbateur endocrinien (parabènes propyl/butyl/isopropyl, phénoxyéthanol
>1%, BHA/BHT, cyclopentasiloxane D4/D5, EDTA, triclosan, oxybenzone/octocrylène),
zéro rétinoïde (Retinol/Retinyl Palmitate/Retinaldehyde — contre-indiqué
grossesse), zéro acide salicylique >2%, zéro huile essentielle à risque (Sauge,
Romarin verbénone, Menthe poivrée, Cèdre, Camphre, Anis), zéro allergène fort
(MIT/MCIT, Formaldéhyde/Quaternium-15), zéro sulfate SLS/SLES en produit
non-rincé.

Règle 2 : cohérence d'usage. Règle 3 : parapharmacie/Sephora FR.
```

#### User prompt

```ts
const userPrompt = candidates.map((c, i) =>
  `${i + 1}. Code-barres: ${c.barcode}
   Nom: ${c.name}
   Ingrédients: ${c.ingredients_raw.slice(0, 2000)}`
).join('\n\n');
// 20 × 2000 chars ≈ 10k tokens input. (Passé de 800→2000 post-CHUNK 7 car
// troncature 800 cachait les additifs en queue de liste OFF.)
```

#### Appel & parsing résilient

```ts
const response = await client.messages.create({
  model: 'claude-haiku-4-5', max_tokens: 500,
  system: systemPrompt, messages: [{ role: 'user', content: userPrompt }],
});

// Extraction du 1er array JSON top-level — scan bracket-balanced :
//  - tracker depth [/]
//  - skip [/] DANS les strings (gestion \" \\)
//  - retourne le substring exact ou null
// Plus robuste que regex greedy (over-capture) ou non-greedy (cut au 1er ]).
const jsonArray = extractFirstJsonArray(textBlock.text);
const parsed = JSON.parse(jsonArray);

// Anti-hallucination : Set des barcodes input
const validSet = new Set(candidates.map(c => c.barcode));
const picks: SniperPick[] = [];
for (const item of parsed) {
  if (typeof item === 'string' && validSet.has(item)) {
    picks.push({ barcode: item, reason: '' });    // legacy format toléré
  } else if (item?.barcode && validSet.has(item.barcode)) {
    picks.push({ barcode: item.barcode, reason: String(item.reason ?? '').slice(0, 200) });
  }
}
const trimmedPicks = picks.slice(0, 3);
```

#### Outcomes (distinction métriques critique)

```ts
type SniperOutcome =
  | 'success'        // ≥ 1 barcode validé
  | 'model_empty'    // 🚨 Claude a explicitement renvoyé [] — TRUE TRAP (KPI sécurité)
  | 'no_candidates'  // filet vide en amont
  | 'infra_error'    // throw SDK (network/timeout/401/429/5xx)
  | 'parse_error'    // réponse non-JSON ou non-array
  | 'unconfigured';  // ANTHROPIC_API_KEY manquante
```

→ `model_empty` est le **vrai signal médical** "rien de sûr en stock", mappé à `safety_trap_triggered` (alerté Slack). Les autres `barcodes:[]` sont des bugs infra à ne **pas** confondre.

### 3.6 Étape F — CEINTURE et bretelles (matcher déterministe)

```ts
const byBarcode = new Map(candidates.map(c => [c.barcode, c]));
const safeCandidates: LiveCandidate[] = [];

for (const b of sniperResult.barcodes) {
  const cand = byBarcode.get(b);
  if (!cand) continue;  // hallucination déjà filtrée par le Set, ceinture & bretelles

  // 1. Matcher déterministe avec ISOLATION DE DOMAINE (beltDomain)
  const parsed = parseIngredients(cand.ingredients_raw);
  const belt = await matchDeterministic(parsed, phase, beltDomain);
  if (belt.dangerousMatch) continue;
  // Note: caution NON-bloquant — Claude a déjà jugé l'ensemble safe,
  // la Ceinture n'est qu'un anti-hallucination sur danger CONFIRMÉ.

  // 2. Garde-fou catégorie context-aware :
  //   strategy 'category_primary'/'category_then_kw' → trust OFF (filtré server-side)
  //   strategy 'keywords'                            → EXIGE categoryTag dans candidate
  if (categoryTag && strategy === 'keywords'
      && !cand.categories_tags.includes(categoryTag)) {
    continue;
  }

  // 3. Junk brand filter : OFF parfois met catégorie dans brand
  // ("brand: Moutarde" pour catégorie moutarde). Rejette UNIQUEMENT si pas d'image.
  const brandNorm = cand.brand.trim().toLowerCase();
  const isJunkBrand =
       brandNorm.length === 0
    || brandNorm === cand.category.trim().toLowerCase()
    || cand.name.trim().toLowerCase().includes(brandNorm);
  if (!cand.image_url && isJunkBrand) continue;

  safeCandidates.push(cand);
}
```

### 3.7 Étape G — Scoring + tri

```ts
function scoreAndBadge(name, brand, ingredientsRaw, labelsTags) {
  const brandLower = brand.toLowerCase();
  let score = 0;
  let originBadge: OriginBadge = null;

  if (PHARMACY_BRANDS.some(b => brandLower.includes(b))) {
    score += 15; originBadge = 'pharmacy';
  } else if (FRENCH_BRANDS.some(b => brandLower.includes(b))) {
    score += 8;  originBadge = 'french';
  }

  if (detectBio(name, ingredientsRaw.toLowerCase(), labelsTags)) {
    score += 5;
    if (!originBadge) originBadge = 'bio';
  }
  return { score, originBadge };
}

const PHARMACY_BRANDS = ['avène', 'la roche-posay', 'mustela', 'bioderma',
  'uriage', 'a-derma', 'klorane', 'weleda', 'cattier', 'cetaphil', 'cerave',
  'eucerin', 'ducray', 'nuxe'];
const FRENCH_BRANDS  = ['caudalie', 'embryolisse', 'lierac', 'sanoflore',
  'melvita', 'galenic', 'phyto', 'rené furterer'];

// Tri : score desc ; à égalité, candidate AVEC image en premier (UX rayon).
dtos.sort((a,b) =>
  b.popularity_count - a.popularity_count
  || (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0)
);
```

### 3.8 Étape H — Cache write best-effort

```ts
async function writeAlternativesCache(req, barcode, existingCache, cacheKey, dtos) {
  const existingPhase = existingCache[cacheKey] ?? {};
  const newCache = {
    ...existingCache,
    [cacheKey]: {
      ...existingPhase,                          // garde search_keyword historique
      alternatives_dtos: dtos,
      alternatives_computed_at: new Date().toISOString(),
    },
  };
  const { error } = await supabaseAdmin.from('products')
    .update({ analysis_cache: newCache }).eq('barcode', barcode);
  if (error) req.log.warn({ err: error, barcode, cacheKey, n: dtos.length },
    'cache write failed — next call will re-trigger live filet');
}
```

⚠️ **Empty array `[]` JAMAIS caché** quand vient du live filet (anti-poison OFF 503). Caché uniquement si vient explicitement du Sniper `model_empty` (vraie trappe sécurité).

---

## 4. Fallback local mobile — `getAlternativesByBarcode`

Si backend KO **ET** premium, exécution Supabase direct en **3 layers** :

```
LAYER 1 — category = origin.category AND name ILIKE %keyword% (PRODUCT_TYPES)
          excluded origin, ingredients_raw NOT NULL, LIMIT 30
                                  │
                                  ├─ filterAndScore(flagged, trimester, premium)
                                  │     • HARD: ingredient contient danger flagged → drop
                                  │     • HARD: contient T1/T3 extras (alcool denat, ibuprofène…)
                                  │     • SOFT: -15 par caution flagged contenu
                                  │     • BONUS: pharmacy +15, french +8, bio +5
                                  │
                                  ▼
                          si len >= limit → return slice
                                  │
LAYER 2 — brand = origin.brand (même marque, autres formats), exclu origin
          filterAndScore → mergeUnique avec layer 1
                                  │
LAYER 3 — same category any product (LIMIT 50)
          filterAndScore → mergeUnique
                                  ▼
                            return slice(0, limit)
```

Exclusions trimestre-spécifiques (gated premium) :
```ts
T1: ['alcool denat','alcohol denat','éthanol','ethanol','caféine','caffeine']
T3: ['ibuprofène','ibuprofen','aspirine','aspirin','diclofenac','naproxen']
```

---

## 5. Versioning cache & métriques

```ts
const MATCHER_VERSION = 'v12';        // bump = invalidation totale du cache
const cacheKey = `${phase}_v12`;       // ex "t2_v12", "breastfeeding_v12"

// Legacy alternatives_dtos sous cacheKey 'v9'/'v10'/'v11' → ignorés (cache miss).

// Métriques émises :
'alternatives_premium_blocked'  { barcode }
'alternatives_cache'            { hit, barcode, cacheKey, n }
'live_filet_fetch'              { ms, source, n_raw, n_filtered, n_final, strategy, category_tag, error }
'alternatives_belt_rejection'   { barcode, beltDomain, n_rejected }
'alternatives_ai_call'          { ms, model, input_tokens, output_tokens, candidates, picked }
'alternatives_ai_error'         { ms, model, error_kind }
'safety_trap_triggered'         { reason: 'sniper_empty', barcode, cacheKey, candidates }
```

---

## 6. PROBLÈMES RENCONTRÉS — historique + fix

### 6.1 Bug "Mayo retournée pour Moutarde" (v6 → v7)

**Symptôme :** scan Moutarde Maille → alternatives = `Mayonnaise Heinz, Ketchup Heinz, Vinaigrette`.

**Cause :** ES (search.openfoodfacts.org) **n'honore pas** le param `categories_tags`. On lui passait `categories_tags=en:mustards` et il renvoyait tout ce qui matchait "mustard" textuellement, y compris des produits dont les categories réelles étaient `en:mayonnaises`.

**Fix v7 :** routage forcé vers `cgi/search.pl` quand `categoryTag` présent. cgi supporte `tagtype_0=categories&tag_0=mustards` server-side.

### 6.2 Bug "ES omet categories_tags dans la réponse" (v7 → v8)

**Symptôme :** garde-fou belt `cand.categories_tags.includes(categoryTag)` rejetait 100% des candidats ES (champ vide).

**Fix v8 :** ES ne renvoie pas `categories_tags` → on **doit** passer en cgi pour toute search catégorie. Maintenant `searchOffCandidates` choisit cgi dès que `categoryTag || isCosmetic`.

### 6.3 Bug "cgi 503 fréquents → 0 résultats" (v8 → v9)

**Symptôme :** ~15% des appels alternatives → `[]` puis cache pollué (vide caché).

**Fix v9 :**
- Retry 3× avec backoff `[0, 250, 750]ms`
- Timeout `3000 → 8000ms` (cgi répond en ~3.4s typique)
- **Skip cache write si live filet retourne vide** (vraie trappe = Sniper empty, pas filet empty)

### 6.4 Bug "Moutarde Amora → 3× variantes Amora" (v9 → v10) — LE BUG CENTRAL

**Symptôme :** scan Amora 8720182460042 → alternatives = `Amora Fine et Forte 215g, Amora Forte 380g, Amora à la moutarde de Dijon`. Le Sniper Claude faisait son job (les variantes Amora SONT toutes safe), mais c'est inutile pour l'utilisatrice.

**Cause :** Phase 1 du live filet appelait `searchOffCandidates(keyword="amora", categoryTag="en:mustards")`. cgi triait par **pertinence textuelle** → 20× hits Amora retournés. Le Sniper n'avait que des Amora à proposer.

**Fix v10 :** Phase 1 utilise `keyword=""` (chaîne vide). Sans search_terms, cgi tri par `sort_by=unique_scans_n` (popularité globale) → mix de marques diverses. Le keyword n'est utilisé qu'en **Phase 2 fallback** si Phase 1 < 5 résultats.

### 6.5 Bug "Cache v10 pollué pré-fix" (v10 → v11)

**Symptôme :** users qui avaient déjà scanné Amora gardaient les anciennes alternatives Amora en cache.

**Fix v11 :** bump `MATCHER_VERSION` v10 → v11 → invalidation totale.

### 6.6 Bug "Phase 1 ramène quand même 1× Amora en tête" (v11 → v12)

**Symptôme :** même avec `keyword=""`, Amora restait dans le top car ils ont le plus de scans (popularité). Le Sniper la prenait + 2 autres marques.

**Fix v12 :**
1. **`excludeBrand` parameter** dans `fetchLiveCandidates` → toute candidate avec `brand === origin.brand` est rejetée à l'entrée. Amora origine ⇒ aucune Amora dans candidates.
2. **Max 2 candidats par marque** (`perBrandCount`) → empêche U/Maille/Carrefour de saturer le top et prive le Sniper de diversité.
3. Bump cache v11 → v12.

**Résultat actuel** sur 8720182460042 :
```
1. Moutarde de Dijon pot verre 200g — U
2. Moutarde de Dijon                — Reine de Dijon
3. Moutarde de Dijon                — CMI (Carrefour)
```

### 6.7 Bug "vinaigre d'alcool" → faux positif T1 danger

**Symptôme :** Moutarde Amora notée 27/100 en T1 car le matcher déterministe matchait la row "alcool" (danger T1) dans l'ingrédient "vinaigre d'alcool".

**Fix :** ajout d'une **whitelist SAFE_OVERRIDES** en tête du matcher qui court-circuite toute évaluation pour 8 patterns regex :
```ts
/\bvinaigre\s+(?:blanc|d['’]?\s*alcool|de\s+vin|de\s+cidre|balsamique)\b/iu
/\bcetearyl\s+alcohol\b/iu          // alcool gras émollient
/\bcetyl\s+alcohol\b/iu
/\bstearyl\s+alcohol\b/iu
/\bbehenyl\s+alcohol\b/iu
/\bmyristyl\s+alcohol\b/iu
/\bbenzyl\s+alcohol\b/iu            // conservateur cosmétique légal
/\balcool[s]?\s+gras\b/iu
```

### 6.8 Bug "Kouign Amann" → cross-domain match cosmétique

**Symptôme :** "fat" (row food EFSA) matchait `sulfate de magnésium lauryléther` (cosmétique) → faux danger.

**Fix :** introduction de `IngredientDomain` (`food | cosmetic | medication`) dérivé du champ `source` Supabase (PRIORITÉ : food > medication > cosmetic). `matchDeterministic(list, phase, domain)` filtre les rows par domaine avant tout match. La Ceinture du pipeline alternatives passe `beltDomain` = `isCosmetic ? 'cosmetic' : 'food'`.

### 6.9 Bug "Sniper hallucine des barcodes"

**Symptôme :** Claude renvoie parfois un barcode qui ne figure pas dans les 20 candidats input (hallucination).

**Fix :**
1. `new Set(candidates.barcode)` filtre toute pick hors-input avant retour Sniper.
2. **Double safety** côté backend : `byBarcode.get(b); if (!cand) continue;` lors de l'étape Ceinture.

### 6.10 Bug "Sniper troncature 800 chars cache additifs"

**Symptôme :** Claude jugeait safe un produit dont la liste OFF se terminait par `E150c (caramel ammoniacal)` → ignoré car au-delà du slice 800.

**Fix :** `ingredients_raw.slice(0, 2000)` (post-CHUNK 7). 20 × 2000 ≈ 10k tokens input, marge confortable sous limite Claude Haiku.

### 6.11 Bug "Format réponse Claude rotule"

**Symptôme :** parfois ` ```json [...] ``` `, parfois `Voici les barcodes: [...]`, parfois array nesté `[[...]]`. Le parser non-greedy `/\[[\s\S]*?\]/` cuttait au 1er `]` interne.

**Fix :** `extractFirstJsonArray()` = scan bracket-balanced (O(n), une passe) avec gestion des `[`/`]` dans les strings et des escapes `\"` / `\\`. Plus aucun cas d'échec depuis.

### 6.12 Bug "Junk brands OFF" (catégorie mise dans le champ brand)

**Symptôme :** OFF a des entrées avec `brand: "Moutarde"` (= catégorie, pas une vraie marque). Polluait les résultats avec des cartes "Moutarde — Moutarde".

**Fix :** filtre `isJunkBrand` (brand vide || brand === category || name.contains(brand)) **gated sur `!image_url`** → on accepte une junk brand si une photo permet l'identification visuelle au rayon.

### 6.13 Bug "Drift Mayo via categories_tags trop génériques"

**Symptôme :** `pickMostSpecificCategoryTag` retournait parfois `en:condiments` → ramenait mayo + ketchup + sauces.

**Fix :** liste `TOO_GENERIC_TAGS` skippée explicitement (groceries, plant-based-foods, beverages, meats, meals, snacks, foods, dairies, fats, cereals-and-potatoes, cosmetics, body, hair, face, skin…). On prend le **tag le plus spécifique non-générique**.

### 6.14 Problème "x-helo-is-premium forgeable"

**Statut :** connu, accepté en l'état.

**Risque :** un utilisateur free peut forger `x-helo-is-premium: true` → accès gratuit à /alternatives (~3-5 c$ Claude + 1 cgi OFF par appel).

**Mitigations actuelles :**
- Rate-limit 10 req/min/IP
- `requireAppSecret` empêche les bots externes
- Vraie défense = IAP RevenueCat côté device + JWT signé (roadmap)

### 6.15 Problème "Mobile-backend drift parser"

**Risque :** `parseIngredients.ts` existe en **double** (mobile `productLookup.ts` + backend `parseIngredients.ts`). Si l'un dérive, scan offline vs online donne 2 GlowScore différents → bug de cohérence.

**Mitigation actuelle :** commentaire d'avertissement en tête des deux fichiers + revue manuelle obligatoire. **À refacto** : extraire en `lib/parse-ingredients` (workspace package partagé). Non fait car mobile a son propre pipeline JS bundler (Metro vs esbuild).

---

## 7. Points de vigilance pour analyse externe

1. **2 endpoints OFF aux comportements opposés** → toute refacto de `searchOffCandidates` risque de casser le bug Amora.
2. **`keyword=""` en Phase 1 est volontaire** — sans ça, on retombe en 30s sur le bug "20× Amora".
3. **Le cache stocke des DTOs complets** (pas juste des barcodes) → 0 re-fetch OFF/Supabase au cache hit. Pivot important du design.
4. **`caution` n'est pas bloquant en Ceinture** — c'est volontaire (Claude a déjà jugé l'ensemble safe, on filtre que les `danger` confirmés).
5. **Distinction `model_empty` vs `infra_error`** : seul `model_empty` est une vraie trappe de sécurité médicale (KPI). Les autres `[]` viennent de bugs infra et ne doivent **pas** être cachés.
6. **`excludeBrand` peut être problématique** si `origin.brand === ''` (chaîne vide) → match les autres candidates sans brand, mais le 2-per-brand cap rattrape.
7. **`scoreAndBadge` est appelé APRÈS la Ceinture** → le score reflète la qualité (pharma/french/bio) pas la sécurité (déjà acquise).
8. **Sniper voit 20 candidats max** mais ne retourne que 3 → si filet ramène 50, on tronque à 20 (les top par popularité). Risque : produit mieux mais moins scanné jamais montré.
9. **Cache invalidation = bump constante `MATCHER_VERSION`**, pas de TTL automatique. C'est volontaire (les recettes OFF changent rarement).
10. **Le fallback local mobile (`getAlternativesByBarcode`)** est très différent du backend (3 layers Supabase, pas de Claude). Risque d'incohérence visuelle si backend down vs up.
