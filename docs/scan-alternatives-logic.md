# Hēlo — Logique technique complète : Scan + Alternatives

> Snapshot 23 mai 2026 (v12 du matcher alternatives). Document destiné à une analyse Claude.
> Sources : `artifacts/api-server/src/routes/alternatives.ts`, `artifacts/api-server/src/lib/{anthropic,matcher,parseIngredients}.ts`, `artifacts/helo/app/(tabs)/scan.tsx`, `artifacts/helo/app/alternatives.tsx`, `artifacts/helo/lib/{api,alternatives,productLookup,ingredientMatch}.ts`.

---

## 1. Vue d'ensemble (architecture)

```
┌───────── MOBILE (Expo) ──────────┐         ┌───── BACKEND (Express 5) ─────┐
│                                  │         │                                │
│ (tabs)/scan.tsx  ───────────────►│  CAMERA │ /api/scan (POST)               │
│   • CameraView + barcode/OCR     │         │   - Cache Supabase             │
│   • Debounce 1.5s, ref lock      │         │   - Matcher déterministe       │
│   • checkScanLimit() (non-prem)  │         │   - Fallback Claude Haiku      │
│   • router.push /verdict/[code]  │         │                                │
│                                  │  HTTP   │ /api/alternatives/:barcode     │
│ /verdict/[barcode].tsx           │ ───────►│   Bouclier premium (header)    │
│   • POST /api/scan → DTO         │         │   Cache phasé v12              │
│   • Affiche GlowScore + ingr.    │         │   ┌─ Live Filet OFF/OBF ─┐     │
│   • CTA "Voir alternatives"      │         │   │  cgi/search.pl       │     │
│                                  │         │   │  + categories_tags   │     │
│ /alternatives.tsx                │  HTTP   │   └──────────┬───────────┘     │
│   • GET /api/alternatives        │ ───────►│              ▼                 │
│   • fallback local si KO         │         │   ┌─ Sniper Claude Haiku ┐    │
│   • Carousel 3-5 cartes          │         │   │  prompt food/cosmo    │    │
│                                  │         │   └──────────┬────────────┘    │
└──────────────────────────────────┘         │              ▼                 │
                                             │   ┌─ Ceinture déterministe ┐  │
                                             │   │  domaine isolé (matcher)│  │
                                             │   └──────────┬──────────────┘  │
                                             │              ▼                 │
                                             │   ┌─ Scoring badges + tri ┐   │
                                             │   └──────────┬─────────────┘   │
                                             │              ▼                 │
                                             │     Cache Supabase             │
                                             │     analysis_cache[t{N}_v12]   │
                                             └────────────────────────────────┘
```

Stack : Expo SDK 54, React Native Reanimated, Expo Router, Express 5, Anthropic SDK (`claude-haiku-4-5`), Supabase (`products`, `ingredients`, `community_submissions`), OFF (Open Food Facts) + OBF (Open Beauty Facts).

---

## 2. Pipeline SCAN — du code-barres au verdict

### 2.1 Capture caméra (mobile) — `app/(tabs)/scan.tsx`

```tsx
const lastBarcode = useRef<string | null>(null);
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleBarcodeScanned = useCallback(
  async ({ data }: { data: string }) => {
    if (!data || data === lastBarcode.current || scanMode !== 'barcode') return;
    lastBarcode.current = data;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { lastBarcode.current = null; }, DEBOUNCE_MS); // 1500ms

    // Bouclier monétisation : checkScanLimit consomme atomiquement 1 slot
    // server-side (avec fallback local offline). 5 scans gratuits / jour.
    if (!isPremium && !isOffline) {
      const allowed = await checkScanLimit();
      if (!allowed) { lastBarcode.current = null; return; }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flashColor.value = withSequence(/* flash viewfinder vert */);
    setTimeout(() => router.push(`/verdict/${encodeURIComponent(data)}`), 350);
  },
  [/* deps */],
);
```

**Points critiques :**
- `useFocusEffect` reset `lastBarcode.current = null` au blur (sinon re-scan du même produit rejeté en silence après retour de `/verdict`).
- 5 modes scrollables : `barcode | ingredients (OCR) | menu (resto) | photo | ordonnance`.
- Le mode `ghostMode=1` via param URL force OCR au prochain focus (CTA "Photographier la composition" depuis verdict).
- `BARCODE_TYPES = ['ean13','ean8','upc_a','upc_e','code128','code39','itf14']`.
- Web : placeholder `WebPlaceholder` (pas de caméra web supportée).

### 2.2 Backend `/api/scan` (POST) — orchestration

Le mobile appelle `scanProductRemote(barcode, phase)` (`lib/api.ts`), qui POST `{barcode, trimester}` avec header `x-helo-app-secret`. Le backend exécute en cascade :

1. **Lookup origin** dans Supabase `products` par barcode (12k entrées curées).
2. Si absent → **community_submissions** (status `auto_captured` ou `community_verified`).
3. Si absent → **OFF live** (`world.openfoodfacts.org/api/v2/product/:barcode`).
4. Si absent → **OBF live** (cosmétiques).
5. Si absent → 404, le mobile bascule en **Ghost Capture** (OCR + sauvegarde communautaire via RPC `ghost_capture_upsert`).

Le DTO renvoyé :

```ts
interface ScanResponseDto {
  status: 'autorise' | 'a_eviter' | 'interdit';
  verdict: 'safe' | 'caution' | 'danger';
  glow_score: number;        // 0–100
  explanation: string;
  source: 'deterministic' | 'ai';
  cached: boolean;
  search_keyword: string | null;   // hint catégorie pour /alternatives
  product: { name; brand; image_url };
  matches: ScanMatchDto[];
}
```

### 2.3 Parsing ingrédients — `parseIngredients.ts` (port mobile + backend, IDENTIQUE)

```ts
export function parseIngredients(ingredientsText: string): string[] {
  if (!ingredientsText.trim()) return [];

  // 1) Pré-nettoyage GLOBAL (pourcentages, marqueurs typo)
  const preCleaned = ingredientsText
    .replace(/\d+[,.]?\d*\s*%/g, '')   // "21,5 %" / "0.3%"
    .replace(/[*†‡§#]/g, '');

  // 2) Extraire sous-ingrédients entre parens (préserve "huile végétale (palme)")
  const parenSubItems = extractParenthesizedSubItems(preCleaned);
  // 3) Strip les parens de la chaîne principale
  const text = preCleaned.replace(/\([^)]*\)/g, '').replace(/[()]/g, '');
  // 4) Concat principal + sous-items
  const combined = parenSubItems.length > 0
    ? `${text} ; ${parenSubItems.join(' ; ')}` : text;

  return combined
    .split(/[,;.\n]+/)
    .map(s => s.trim())
    .map(s => s.replace(/[\s\-–—:.]+$/, '').trim())
    .map(normalizeAllergenCaps)          // SOJA → soja, LAIT → lait
    .filter(s => s.length >= 2)
    .filter(s => !/:\s*\d/.test(s))
    .filter(s => !/^dont\b/i.test(s))
    .filter(s => !NUTRITION_PATTERNS.test(s))  // valeurs nutritionnelles
    .filter((s, i, arr) => arr.findIndex(o => o.toLowerCase() === s.toLowerCase()) === i)
    .map(capitalizeFirst);
}
```

### 2.4 Matcher déterministe — `matcher.ts` (5000 ingrédients en base)

```ts
export type IngredientDomain = 'food' | 'cosmetic' | 'medication';
// Mappé depuis `source` (EFSA→food, ANSES/ANSM/CRAT/BDPM/FDA/HAS/OMS→medication,
// cosing/sccs/echa/etc.→cosmetic). PRIORITÉ : food > medication > cosmetic.

const SAFE_OVERRIDES: { pattern: RegExp; label: string }[] = [
  // Bug "vinaigre d'alcool" matchant la row "alcool" → faux positif danger T1
  { pattern: /\bvinaigre\s+(?:blanc|d['’]?\s*alcool|de\s+vin|de\s+cidre|balsamique)\b/iu, label: 'Vinaigre' },
  { pattern: /\bcetearyl\s+alcohol\b/iu,  label: 'Cetearyl alcohol (alcool gras)' },
  { pattern: /\bcetyl\s+alcohol\b/iu,     label: 'Cetyl alcohol (alcool gras)'   },
  { pattern: /\bstearyl\s+alcohol\b/iu,   label: 'Stearyl alcohol (alcool gras)' },
  { pattern: /\bbehenyl\s+alcohol\b/iu,   label: 'Behenyl alcohol (alcool gras)' },
  { pattern: /\bmyristyl\s+alcohol\b/iu,  label: 'Myristyl alcohol (alcool gras)' },
  { pattern: /\bbenzyl\s+alcohol\b/iu,    label: 'Benzyl alcohol (conservateur)' },
  { pattern: /\balcool[s]?\s+gras\b/iu,   label: 'Alcool gras' },
];

// Matching word-boundary bi-directionnel avec apostrophes typo + droites
function makeWordRegex(term: string): RegExp | null {
  const escaped = escapeForRegex(term.trim())
    .replace(/['’]/g, "['’]")
    .replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'iu');
}

export async function matchDeterministic(ingredientsList, phase, domain?) {
  const allRows = await loadIngredients();    // cache 1h, ~5000 rows
  const rows = domain
    ? allRows.filter(r => sourceToDomain(r.source) === domain)  // isolation domaine
    : allRows;

  const matches = ingredientsList.map(ingredientName => {
    // 0. Whitelist d'exceptions
    const safe = matchSafeOverride(ingredientName);
    if (safe) return { ingredientName, matched: true, riskLevel: 'safe', ... };

    // 1. Match bi-directionnel :
    //    a) row.name ⊂ ingredientName  (toujours)
    //    b) ingredientName ⊂ row.name  (gated len ≥ 4 pour éviter "fat"⊂"sulfate")
    const matched = rows.find(ing => {
      if (wordMatches(ingredientName, ing.name)) return true;
      if (wordMatches(ingredientName, ing.name_inci ?? '')) return true;
      if (ing.synonyms?.some(syn => wordMatches(ingredientName, syn))) return true;
      if (ingredientName.length >= 4) {
        if (wordMatches(ing.name, ingredientName)) return true;
        if (wordMatches(ing.name_inci ?? '', ingredientName)) return true;
      }
      return false;
    });

    return matched
      ? { ingredientName, matched: true, matchedIngredientName: matched.name,
          riskLevel: getRiskForPhase(matched, phase) }
      : { ingredientName, matched: false, riskLevel: 'no_signal' };
  });

  const dangerousMatch = matches.find(m => m.riskLevel === 'danger');
  const hasUnknown = matches.some(m => !m.matched);
  return { matches, hasUnknown, dangerousMatch };
}
```

**Risques par phase :** colonnes `risk_level_t1/t2/t3/breastfeeding/baby` ∈ `safe | caution | danger | no_signal`. Fallback `baby → no_signal`, `breastfeeding → t3`.

### 2.5 GlowScore — `computeVerdict`

```ts
verdict = hasDanger ? 'danger' : hasCaution ? 'caution' : 'safe';
score = 100 - (dangerCount × 50) - (cautionCount × 15) - (unknownCount × 2);
score = clamp(score, 0, 100);
```

### 2.6 Fallback IA — `analyzeWithClaude` (claude-haiku-4-5)

Si **aucun danger déterministe** ET **≥1 ingrédient unknown** → fallback Claude Haiku avec prompt système :

```
Tu es un expert en toxicologie et en nutrition périnatale. Analyse la liste
d'ingrédients d'un produit pour une femme enceinte ou allaitante.
Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown) :
- status: "autorise" | "a_eviter" | "interdit"
- glow_score: entier 0-100
- explanation: 2 phrases max FR
- search_keyword: 1-3 mots (ex: "fromage pâte molle")
Sois conservateur : doute → "a_eviter".
```

User prompt : `Phase: trimestre 2 / Produit: X / Ingrédients: ...`. `max_tokens=400`. `search_keyword` sera REUTILISÉ comme hint catégorie par `/alternatives`.

---

## 3. Pipeline ALTERNATIVES — du clic au carousel

### 3.1 Mobile (`app/alternatives.tsx`)

Receives via URL params : `barcode, category, productName, productBrand, flaggedDanger (JSON string[]), flaggedCaution, trimester`.

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    setLoading(true);
    const [remote, dangerExpl, cautionExpl] = await Promise.all([
      fetchAlternativesRemote(barcode, trimester, isPremium),  // backend
      getIngredientExplanations(flaggedDanger),                // Supabase direct
      getIngredientExplanations(flaggedCaution),
    ]);
    if (cancelled) return;

    // M1 : bouclier monétisation côté client.
    // (a) 403 premium_required, (b) backend KO + !isPremium → paywall.
    if (!remote.ok && (remote.error.kind === 'premium_required' || !isPremium)) {
      router.replace({ pathname: '/paywall', params: { trigger: 'feature' } });
      return;
    }

    let results: AlternativeProduct[];
    if (remote.ok) {
      const limit = isPremium ? 5 : 3;
      results = remote.data.slice(0, limit);
    } else {
      // Fallback local (premium uniquement) — Supabase products by category/brand
      results = await getAlternativesByBarcode(barcode, {danger,caution}, trimester, isPremium);
    }
    setAlternatives(results);
    setExplanations({ danger: dangerExpl, caution: cautionExpl });
    setLoading(false);
  })();
  return () => { cancelled = true; };
}, [barcode, isPremium, trimester, flaggedDangerKey, flaggedCautionKey]);
```

Carousel horizontal `ScrollView` snapping, `CARD_WIDTH = SCREEN_WIDTH - 64`, `CARD_GAP = 12`, dots indicators.

### 3.2 `fetchAlternativesRemote` — `lib/api.ts`

```ts
GET ${API_BASE}/api/alternatives/${barcode}?trimester={1|2|3|breastfeeding|baby}
Headers:
  x-helo-app-secret: $EXPO_PUBLIC_HELO_APP_SECRET
  x-helo-is-premium: true|false   // signal FinOps (pas un secret)
Timeout: 8s (sinon fallback local pour préserver UX premium)
```

Status codes mappés en `AlternativesError` discriminée :
`200 → ok | 403 → premium_required | 404 → not_found | 401 → unauthorized | 429 → rate_limited | 400 → invalid_request | 5xx → server`.

### 3.3 Backend `GET /api/alternatives/:barcode` — orchestration v12

```ts
// ─── 0. BOUCLIER FINOPS ────────────────────────────────────────────────
const isPremiumRequest = req.header('x-helo-is-premium') === 'true';
if (!isPremiumRequest) return 403 { error: 'premium_required', feature: 'alternatives' };

// ─── 1. Validation barcode + trimestre Zod ─────────────────────────────
if (!/^[0-9]{6,14}$/.test(barcode)) return 400;
const phase = parsePhase(QuerySchema.safeParse(req.query).data.trimester);
const cacheKey = `${phase}_v12`;  // MATCHER_VERSION = 'v12'

// ─── 2. Lookup origin Supabase ─────────────────────────────────────────
const { data: origin } = await supabaseAdmin
  .from('products')
  .select('id, barcode, name, brand, category, ingredients_raw, image_url, analysis_cache')
  .eq('barcode', barcode).maybeSingle();
if (!origin) return 404;

// ─── 3. CACHE HIT (DTOs complets) ──────────────────────────────────────
const phaseCache = (origin.analysis_cache ?? {})[cacheKey];
if (phaseCache?.alternatives_dtos) { return res.json(phaseCache.alternatives_dtos); }

// ─── 4. Résolution keywords ───────────────────────────────────────────
const searchKeyword = phaseCache?.search_keyword ?? null;  // hint Claude scan
const fallbackKeywords = extractKeywords(origin.name, origin.brand);
const uniqueKw = [...new Set([searchKeyword?.toLowerCase(), ...fallbackKeywords].filter(Boolean))];

// ─── 5. Détection domaine + fetch categories_tags origine ─────────────
const isCosmetic = (origin.category ?? '').toLowerCase() === 'cosmetic';
const beltDomain = isCosmetic ? 'cosmetic' : 'food';
const originCategoriesTags = await fetchOriginCategoriesTags(barcode, isCosmetic);
const categoryTag = pickMostSpecificCategoryTag(originCategoriesTags);
//   ex: ["en:condiments", "en:mustards", "en:dijon-mustards"] → "en:dijon-mustards"
//   skip TOO_GENERIC_TAGS (en:foods, en:beverages, en:cosmetics, etc.)

// ─── 6. LIVE FILET (cgi/search.pl OFF/OBF) ─────────────────────────────
const { candidates, strategy } = await fetchLiveCandidates(
  uniqueKw, isCosmetic, barcode, req.log, categoryTag, origin.brand ?? null,
);
if (candidates.length === 0) {
  // ⚠️ NE PAS cacher cet empty — quasi toujours un blip OFF 503 transient.
  return res.json([]);
}

// ─── 7. SNIPER Claude Haiku ────────────────────────────────────────────
const sniperInput = candidates.map(c => ({
  barcode: c.barcode,
  name: c.brand ? `${c.brand} — ${c.name}` : c.name,
  ingredients_raw: c.ingredients_raw,
}));
const sniperResult = await selectSafeAlternativesWithClaude({
  candidates: sniperInput, trimester: phase, originalName: origin.name,
  searchKeyword: searchKeyword ?? fallbackKeywords[0] ?? '',
  isCosmetic, log: req.log,
});
//   → { barcodes: string[], picks: [{barcode, reason}], outcome }
//   outcome ∈ success | model_empty | no_candidates | infra_error | parse_error | unconfigured
//   max 3 picks. Sniper hallucinated barcodes filtrés via Set(input.barcodes).

if (sniperResult.barcodes.length === 0) {
  await writeAlternativesCache(req, barcode, cache, cacheKey, []);
  return res.json([]);
}

// ─── 8. CEINTURE ET BRETELLES (matcher déterministe sur picks Sniper) ──
const byBarcode = new Map(candidates.map(c => [c.barcode, c]));
const safeCandidates: LiveCandidate[] = [];
for (const b of sniperResult.barcodes) {
  const cand = byBarcode.get(b);
  if (!cand) continue;  // hallucination filtrée par le Set, sécurité
  const parsed = parseIngredients(cand.ingredients_raw);
  const belt = await matchDeterministic(parsed, phase, beltDomain);
  if (belt.dangerousMatch) continue;  // rejet danger (caution non-bloquant)

  // Garde-fou catégorie context-aware :
  //  - strategy 'category_primary'/'category_then_kw' : OFF a filtré server-side → trust
  //  - strategy 'keywords' : on EXIGE categoryTag dans cand.categories_tags
  if (categoryTag && strategy === 'keywords' && !cand.categories_tags.includes(categoryTag)) {
    continue;  // drift rejected
  }

  // Junk brand filter : OFF parfois met la catégorie dans brand
  // ("brand: Moutarde" pour catégorie moutarde). Rejette UNIQUEMENT si pas d'image.
  const brandNorm = cand.brand.trim().toLowerCase();
  const categoryNorm = cand.category.trim().toLowerCase();
  const nameNorm = cand.name.trim().toLowerCase();
  const isJunkBrand = brandNorm.length === 0
    || brandNorm === categoryNorm
    || nameNorm.includes(brandNorm);
  if (!cand.image_url && isJunkBrand) continue;

  safeCandidates.push(cand);
}

// ─── 9. Scoring badges + tri ──────────────────────────────────────────
const dtos = safeCandidates.map(c => {
  const { score, originBadge } = scoreAndBadge(c.name, c.brand, c.ingredients_raw, c.labels_tags);
  return {
    id: c.barcode, name: c.name, brand: c.brand, category: c.category,
    barcode: c.barcode, image_url: c.image_url,
    description_fr: null,
    reason: reasonByBarcode.get(c.barcode) || null,  // M3 : phrase ≤15 mots de Claude
    overall_risk: 'safe',
    price_range: '',
    popularity_count: score,        // 0 + 15 pharma + 8 french + 5 bio
    origin_badge: originBadge,      // 'pharmacy' | 'french' | 'bio' | null
  };
});

// Tri : score desc ; à égalité, produit avec image d'abord (identifiable rayon)
dtos.sort((a,b) => b.popularity_count - a.popularity_count || (b.image_url?1:0) - (a.image_url?1:0));

// ─── 10. Cache best-effort ────────────────────────────────────────────
await writeAlternativesCache(req, barcode, cache, cacheKey, dtos);
return res.json(dtos);
```

### 3.4 `fetchLiveCandidates` (v12) — fonction critique du bug Amora

```ts
type LiveStrategy = 'category_primary' | 'category_then_kw' | 'keywords';

async function fetchLiveCandidates(
  keywords: string[],
  isCosmetic: boolean,
  excludeBarcode: string,
  log: Logger,
  categoryTag?: string | null,
  excludeBrand?: string | null,   // v12 : marque origine exclue
): Promise<{ candidates: LiveCandidate[]; strategy: LiveStrategy }> {
  if (keywords.length === 0 && !categoryTag) return { candidates: [], strategy: 'keywords' };

  const seen = new Set<string>([excludeBarcode]);
  const collected: LiveCandidate[] = [];
  const excludeBrandNorm = (excludeBrand ?? '').trim().toLowerCase();
  let usedStrategy: LiveStrategy = 'keywords';

  // ─── PHASE 1 : catégorie scopée, keyword="" volontairement ─────────────
  // Sans keyword, cgi trie par sort_by=unique_scans_n (popularité) → mix de
  // marques. AVEC keyword="amora", cgi triait par pertinence textuelle et
  // ramenait 20× Amora (bug originel).
  if (categoryTag) {
    usedStrategy = 'category_primary';
    const { candidates } = await searchOffCandidates('', isCosmetic, categoryTag);
    for (const c of candidates) {
      if (seen.has(c.barcode)) continue;
      if (excludeBrandNorm && c.brand.trim().toLowerCase() === excludeBrandNorm) continue;
      seen.add(c.barcode); collected.push(c);
      if (collected.length >= 30) break;
    }
  }

  // ─── PHASE 2 : fallback keywords si < 5 ─────────────────────────────────
  if (collected.length < 5) {
    if (categoryTag && collected.length > 0) usedStrategy = 'category_then_kw';
    for (const kw of keywords.slice(0, 3)) {
      if (collected.length >= 10) break;
      if (excludeBrandNorm && kw.trim().toLowerCase() === excludeBrandNorm) continue;
      const { candidates } = await searchOffCandidates(kw, isCosmetic, categoryTag ?? null);
      for (const c of candidates) {
        if (seen.has(c.barcode)) continue;
        if (excludeBrandNorm && c.brand.trim().toLowerCase() === excludeBrandNorm) continue;
        seen.add(c.barcode); collected.push(c);
        if (collected.length >= 30) break;
      }
    }
  }

  // ─── DIVERSITÉ : max 2 candidats par marque ─────────────────────────────
  // Évite que Maille (5 formats) sature le top et prive Claude d'options.
  const perBrandCount = new Map<string, number>();
  const brandDiverse: LiveCandidate[] = [];
  for (const c of collected) {
    const key = c.brand.trim().toLowerCase() || '__nobrand__';
    const n = perBrandCount.get(key) ?? 0;
    if (n >= 2) continue;
    perBrandCount.set(key, n + 1);
    brandDiverse.push(c);
  }

  return { candidates: deduplicateCandidates(brandDiverse).slice(0, 20), strategy: usedStrategy };
}
```

### 3.5 `searchOffCandidates` — routage ES vs cgi

```ts
async function searchOffCandidates(keyword, isCosmetic, categoryTag?) {
  // ★ Choix d'endpoint :
  //  - ES (search.openfoodfacts.org) : rapide ~1s, MAIS n'honore PAS le param
  //    categories_tags (testé : Mayo+Ketchup retournés pour "mustard") ET
  //    omet categories_tags de la réponse → inutilisable si categoryTag.
  //  - cgi (world.openfoodfacts.org/cgi/search.pl) : ~3-4s, parfois 503, MAIS
  //    supporte facet tagtype_0=categories&tag_0=mustards server-side.
  // → cgi si categoryTag OU cosmétique (OBF n'a pas d'ES) ; ES sinon.

  let url: string;
  if (isCosmetic || categoryTag) {
    const host = isCosmetic ? 'https://world.openbeautyfacts.org' : 'https://world.openfoodfacts.org';
    const params = new URLSearchParams({
      search_terms: keyword, sort_by: 'unique_scans_n', page_size: '30', json: 'true', action: 'process',
    });
    if (categoryTag) {
      params.set('tagtype_0', 'categories');
      params.set('tag_contains_0', 'contains');
      const tail = categoryTag.includes(':') ? categoryTag.split(':').slice(1).join(':') : categoryTag;
      params.set('tag_0', tail);  // "en:mustards" → "mustards"
    }
    url = `${host}/cgi/search.pl?${params}`;
  } else {
    url = `${getLiveFiletEndpoint(isCosmetic)}?${new URLSearchParams({
      q: keyword || '*', countries_tags: 'en:france', page_size: '30',
    })}`;
  }

  // Retry 3× sur 5xx/429/timeout, backoff [0, 250, 750]ms
  // OFF_TIMEOUT_MS = 8000 (cgi répond en ~3.4s typique)
  for (let attempt = 0; attempt < 3; attempt++) {
    if (BACKOFFS_MS[attempt] > 0) await sleep(BACKOFFS_MS[attempt]);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), OFF_TIMEOUT_MS);
    try {
      const resp = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': USER_AGENT } });
      if (!resp.ok) {
        if (resp.status < 500 && resp.status !== 429) return { candidates: [], error: `http_${resp.status}` };
        continue;
      }
      const json = await resp.json();
      const raws = json.hits ?? json.products ?? [];
      const candidates = raws.map(normalizeOffProduct).filter(Boolean);
      return { candidates, error: null };
    } catch (err) {
      lastError = err.name === 'AbortError' ? 'timeout' : 'network';
    } finally { clearTimeout(timer); }
  }
  return { candidates: [], error: lastError };
}
```

### 3.6 Normalisation OFF/OBF — `normalizeOffProduct`

```ts
interface LiveCandidate {
  barcode: string;          // regex /^[0-9]{6,14}$/
  name: string;             // FR > EN > drop si vide
  brand: string;            // ES array[0] | cgi string split(',')[0]
  ingredients_raw: string;  // text_fr > text_en > tags i18n joinés (si ≥3 tags)
  image_url: string | null; // image_front_url > image_url > image_small_url
  labels_tags: string[];    // ["en:organic", "fr:bio", ...]
  category: string;
  categories_tags: string[]; // ["en:condiments", "en:mustards", ...]
}
// Drop si ingredients_raw < 20 chars (Claude ne peut pas juger l'invisible).
```

### 3.7 Dédoublonnage — `deduplicateCandidates`

```ts
// Clé = `${brand}|${name normalisé sans formats poids/volumes}`
// → "Maille|moutarde de dijon" identifie "Maille MdD 215g" et "Maille MdD 380g".
const key = `${c.brand.toLowerCase()}|${c.name.toLowerCase().replace(/\s+/g,' ').replace(/\d+\s*(ml|cl|l|g|kg)\b/g,'').trim()}`;
```

### 3.8 `pickMostSpecificCategoryTag` (anti-drift Mayo)

```ts
const TOO_GENERIC_TAGS = new Set([
  'en:groceries', 'en:plant-based-foods-and-beverages', 'en:plant-based-foods',
  'en:beverages', 'en:meats', 'en:meals', 'en:snacks', 'en:foods',
  'en:dairies', 'en:fats', 'en:cereals-and-potatoes',
  'en:cosmetics', 'en:body', 'en:hair', 'en:face', 'en:skin',
]);
// OFF range categories_tags du + général au + spécifique → on parcourt à
// l'envers, skip les trop génériques, prend le 1er segment ≥ 4 chars.
```

### 3.9 Extraction keywords (mapping marque→type)

```ts
// Stratégie : pour chaque marque NON-SAFE en grossesse, injecte
// SIMULTANÉMENT (1) le like-for-like, (2) des alternatives safe par défaut.
// Sans (2), Claude refuse légitimement tout (aucun Coca n'est "safe T2").
const BRAND_TO_TYPE: Record<string, string[]> = {
  'coke': ['eau pétillante', 'limonade', 'soda'],
  'coca': ['eau pétillante', 'limonade', 'soda'],
  'red bull': ['infusion', 'jus', 'thé glacé', 'boisson énergisante'],
  'nutella': ['pâte à tartiner', 'purée amande', 'confiture'],
  'twix': ['barre céréales', 'fruits secs', 'chocolat noir'],
  'haribo': ['fruits secs', 'compote', 'bonbon bio'],
  'magnum': ['sorbet', 'yaourt'],
  // ... 40+ entries
};

function extractKeywords(name, brand) {
  // 1. Form factor PREMIER : "Twix glacé" → sorbet/yaourt glacé/glace,
  //    pas barre céréales malgré la marque Twix.
  // 2. BRAND_TO_TYPE ENSUITE.
  // 3. PRODUCT_TYPES generic match (yaourt, fromage, shampoing, ...).
  // 4. Last-resort fallback : 1er mot alphabétique ≥4 chars hors stopwords
  //    (bio, sans, naturel, premium, vegan, articles, couleurs, etc.).
}
```

---

## 4. SNIPER Claude Haiku — `anthropic.ts`

### 4.1 Deux prompts système (food vs cosmetic)

```
ALTERNATIVES_SYSTEM_PROMPT_FOOD :
Tu es un expert en toxicologie périnatale ET en grande distribution alimentaire
française. Voici 20 produits candidats avec leurs listes d'ingrédients.
Le produit d'origine est : '{originalName}' (Mot-clé/Catégorie : '{searchKeyword}').
L'utilisatrice est au {trimester}.

Ta mission : Sélectionne jusqu'à 3 produits qui respectent STRICTEMENT ces 3 règles :
1. SÉCURITÉ ALIMENTAIRE ABSOLUE : zéro caféine > seuil OMS (200mg/j), zéro
   édulcorant déconseillé (aspartame T3, cyclamate), zéro additif controversé
   (E102/E110/E124 colorants azoïques, E249-E252 nitrites, E951), zéro alcool,
   zéro risque listériose/toxoplasmose (lait cru, charcuterie crue, poisson
   cru/fumé), zéro mercure élevé (thon rouge, espadon).
2. COHÉRENCE D'OCCASION : même MOMENT DE CONSOMMATION que '{originalName}'
   (boisson rafraîchissante → eau pétillante OK ; sorbet → glace OK).
3. MARCHÉ FRANÇAIS : supermarchés FR uniquement.

🚨 Si AUCUN produit ne respecte la règle 1, renvoie [].

⚠️ FORMAT : tableau JSON [{"barcode":"...","reason":"..."}].
reason = phrase FR ≤15 mots citant ingrédient absent ou label.
```

```
ALTERNATIVES_SYSTEM_PROMPT_COSMETIC :
Tu es un expert en cosmétovigilance périnatale ET en grande distribution
cosmétique française. Voici 20 produits candidats avec leurs listes INCI.

Règle 1 SÉCURITÉ CUTANÉE (absorption transdermique = risque fœtus) :
zéro perturbateur endocrinien (parabènes propyl/butyl/isopropyl, phénoxyéthanol
>1%, BHA/BHT, cyclopentasiloxane D4/D5, EDTA, triclosan, oxybenzone/octocrylène),
zéro rétinoïde (Retinol/Retinyl Palmitate/Retinaldehyde — contre-indiqué grossesse),
zéro acide salicylique >2%, zéro huile essentielle à risque (Sauge, Romarin
verbénone, Menthe poivrée, Cèdre, Camphre, Anis), zéro allergène fort (MIT/MCIT,
Formaldéhyde/Quaternium-15), zéro sulfate SLS/SLES en produit non-rincé.

Règle 2 : cohérence d'usage (shampoing→shampoing, crème visage→crème visage).
Règle 3 : parapharmacie / supermarché / Sephora France.
```

### 4.2 User prompt format

```ts
const userPrompt = candidates.map((c, i) =>
  `${i + 1}. Code-barres: ${c.barcode}\n   Nom: ${c.name}\n   Ingrédients: ${c.ingredients_raw.slice(0, 2000)}`
).join('\n\n');
// 20 candidates × 2000 chars ≈ 10k tokens input. Post-CHUNK 7 : on est passés
// de 800→2000 car troncature 800 cachait les additifs en queue de liste OFF.
```

### 4.3 Réponse + parsing résilient

```ts
response = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 500,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});

// Extraction array JSON top-level via scan bracket-balanced :
//  - skip caractères dans les strings (gestion \" \\)
//  - tracker depth des [/]
//  - retourne le 1er array bien balancé
// Plus robuste que regex greedy (over-capture) ou non-greedy (cut au 1er `]` interne).
const jsonArray = extractFirstJsonArray(textBlock.text);
const parsed = JSON.parse(jsonArray);

// Format M3 : [{barcode, reason}]. Accept legacy string[] pour rollback.
const validSet = new Set(candidates.map(c => c.barcode));  // anti-hallucination
const picks: SniperPick[] = [];
for (const item of parsed) {
  if (typeof item === 'string' && validSet.has(item)) picks.push({ barcode: item, reason: '' });
  else if (item?.barcode && validSet.has(item.barcode)) {
    picks.push({ barcode: item.barcode, reason: String(item.reason ?? '').slice(0, 200) });
  }
}
const trimmedPicks = picks.slice(0, 3);

// Outcome : success | model_empty (true trap : Claude a explicitement []) |
//   no_candidates | infra_error | parse_error | unconfigured
return { barcodes, picks: trimmedPicks, outcome: barcodes.length > 0 ? 'success' : 'model_empty' };
```

### 4.4 Classification erreurs Anthropic

```ts
// Ordre important : sous-classes connexion/timeout n'ont pas de .status HTTP
if (err instanceof Anthropic.APIConnectionTimeoutError) return 'timeout';
if (err instanceof Anthropic.APIConnectionError) return 'network';
if (err instanceof Anthropic.RateLimitError) return 'rate_limited';
if (err instanceof Anthropic.AuthenticationError) return 'unauthorized';
if (err instanceof Anthropic.APIError) return err.status >= 500 ? 'server_error' : `api_${err.status}`;
```

---

## 5. Scoring badges — `scoreAndBadge`

```ts
const PHARMACY_BRANDS = ['avène', 'la roche-posay', 'mustela', 'bioderma',
  'uriage', 'a-derma', 'klorane', 'weleda', 'cattier', 'cetaphil', 'cerave',
  'eucerin', 'ducray', 'nuxe'];  // +15 pts, badge 'pharmacy'
const FRENCH_BRANDS = ['caudalie', 'embryolisse', 'lierac', 'sanoflore',
  'melvita', 'galenic', 'phyto', 'rené furterer'];  // +8 pts, badge 'french'

function detectBio(name, ingredientsLower, labelsTags) {
  if (labelsTags.some(t => t === 'en:organic' || t === 'fr:bio')) return true;
  return /\bbio\b/.test(nameLower) || nameLower.includes('biologique') || /\bbio\b/.test(ingredientsLower);
}  // +5 pts, badge 'bio' (si pas déjà pharmacy/french)
```

---

## 6. Cache `analysis_cache` (Supabase JSONB)

Shape par produit :

```jsonc
{
  "t1_v12": {
    "search_keyword": "moutarde",
    "alternatives_dtos": [/* AlternativeProductDto[] */],
    "alternatives_computed_at": "2026-05-23T10:23:45.123Z"
  },
  "t2_v12": { /* ... */ },
  "t3_v12": { /* ... */ },
  "breastfeeding_v12": { /* ... */ }
}
```

- **Bump `MATCHER_VERSION`** ('v9'→'v12') invalide tous les caches phasés en une ligne.
- **Empty results jamais cachés** (anti-poison sur OFF 503 transient).
- Backward compat : legacy `alternatives: string[]` traité comme miss.

---

## 7. Bug Amora (8720182460042) — historique des corrections

| Version | Symptôme | Fix |
|---|---|---|
| **v6 → v7** | Moutarde → Mayonnaise | Route via cgi quand `categoryTag` présent + drift filter |
| **v7 → v8** | ES ignore `categories_tags` | Tout cgi pour searches catégorie |
| **v8 → v9** | cgi 503 fréquents | Retry 3× backoff [0/250/750]ms, timeout 3s→8s, skip cache write si empty |
| **v9 → v10** | "3× variantes Amora retournées" | Phase 1 `keyword=""` (tri `unique_scans_n` au lieu de pertinence textuelle qui matchait la marque) |
| **v10 → v11** | Cache v10 pollué pré-fix | Bump cache |
| **v11 → v12** | Validation finale | `excludeBrand` (vire la marque origine), max 2 candidats/marque, bump cache |

**Résultat actuel sur 8720182460042** (Moutarde Amora) :
```
1. Moutarde de Dijon pot en verre 200g — brand: U
2. Moutarde de Dijon — brand: Reine de Dijon
3. Moutarde de Dijon — brand: CMI (Carrefour)
```

---

## 8. Métriques / observabilité (`emitMetric`)

```ts
'alternatives_premium_blocked'  { barcode }
'alternatives_cache'            { hit, barcode, cacheKey, n }
'live_filet_fetch'              { ms, source, n_raw, n_filtered, n_final, strategy, category_tag, error }
'alternatives_belt_rejection'   { barcode, beltDomain, n_rejected }
'alternatives_ai_call'          { ms, model, input_tokens, output_tokens, candidates, picked }
'alternatives_ai_error'         { ms, model, error_kind }
'safety_trap_triggered'         { reason: 'sniper_empty', barcode, cacheKey, candidates }
```

Webhook `alertSafetyTrap` + `alertAiError` envoient à Slack/Sentry.

---

## 9. Rate-limit & middlewares (Express)

- `requireAppSecret` : header `x-helo-app-secret` doit matcher `$HELO_APP_SECRET`. 401 sinon.
- `alternativesRateLimit` : 10 req/min/IP (anti-abus si forge `x-helo-is-premium: true`).
- Logger `pino` injecté par requête (`req.log`).

---

## 10. Types DTO partagés (mobile ↔ backend)

```ts
type OriginBadge = 'pharmacy' | 'french' | 'bio' | null;

interface AlternativeProductDto {
  id: string;
  name: string;
  brand: string;
  category: string;            // 'cosmetic' | 'food' | 'medication'
  barcode: string | null;
  image_url: string | null;
  description_fr: string | null;
  reason: string | null;       // M3 : phrase ≤15 mots de Claude
  overall_risk: 'safe' | 'caution';
  price_range: string;
  popularity_count: number;    // score interne, sert au tri
  origin_badge: OriginBadge;
}
```

---

## 11. Fallback local mobile (`getAlternativesByBarcode`)

Si backend KO **ET** premium, le mobile exécute en pur Supabase :

1. **Layer 1** : `products` mêmes `category` + `name ilike %keyword%` (productKeywords ∈ PRODUCT_TYPES), exclu origin, hard-filter ingrédients flagged `danger` (substring), soft penalty `caution` (-15/match).
2. **Layer 2** : si <limit, ajoute `brand = origin.brand` (même catégorie pas exigée).
3. **Layer 3** : si <limit, `category = origin.category` sans contrainte mot-clé.

Bonus score : pharmacy +15, french +8, bio +5. Exclusions T1 (`alcool denat`, `caféine`) et T3 (`ibuprofène`, `aspirine`) gated premium.

---

## 12. Points d'attention pour analyse Claude

1. **Le matcher mobile et backend doivent rester SYNC** (`ingredientMatch.ts` + `parseIngredients.ts` dupliqués des deux côtés volontairement, sinon scan online vs offline donne 2 scores différents).
2. **ES vs cgi** : architecture duale forcée par limitations OFF (ES rapide mais sans facet categories). Toute refacto risque de casser le bug Amora.
3. **excludeBrand** filtre la marque origine pour forcer la diversité concurrentielle. Edge case : si `origin.brand === ''`, `excludeBrandNorm === ''` matche les autres candidats sans brand → on garde le 1er, filtre les suivants par 2-per-brand cap.
4. **Junk brand filter** gated sur `!image_url` : on accepte "brand: Moutarde" si une photo permet d'identifier visuellement.
5. **categoryTag drift** : le matcher déterministe en Phase "keywords" exige strict match `categories_tags.includes(categoryTag)`. En "category_primary"/"category_then_kw" on trust OFF (sinon ES tronque parfois `categories_tags`).
6. **Sniper hallucination** : protection via `new Set(candidates.barcode)` ; tout barcode hors-input est silencieusement ignoré.
7. **caution non-bloquant Ceinture** : volontaire — le Sniper Claude a déjà jugé l'ensemble safe, la Ceinture n'est qu'un anti-hallucination sur `danger` confirmé.
8. **Cache hit DTO complet** : pas de re-fetch OFF, pas de re-hydrate Supabase. Pivot du design (avant on cachait `string[]` de barcodes → re-fetch obligatoire, lent).
9. **FinOps** : `x-helo-is-premium` n'est PAS un secret. Vrai bouclier = IAP RevenueCat device-side + rate-limit IP. Header sert juste à éviter le coût Claude/OFF avant qu'on ait un JWT.
10. **Empty result strategy** : `[]` du Sniper après candidates non-vide = "vraie trappe sécurité" (cache écrit). `[]` du live filet = "blip OFF" (cache NON écrit).

---

## 13. Fichiers de référence (paths)

```
artifacts/api-server/src/
├── routes/alternatives.ts                 # 1194 L — orchestrateur
├── lib/anthropic.ts                       # Sniper Claude + scan IA
├── lib/matcher.ts                         # Matcher déterministe 5000 ingr
├── lib/parseIngredients.ts                # Parser OFF (sync avec mobile)
├── lib/supabaseAdmin.ts                   # Client Supabase service-role
├── middlewares/appSecret.ts               # Validation x-helo-app-secret
└── middlewares/alternativesRateLimit.ts   # 10 req/min/IP

artifacts/helo/
├── app/(tabs)/scan.tsx                    # CameraView + 5 modes
├── app/alternatives.tsx                   # Carousel + empty state
├── app/verdict/[barcode].tsx              # Affichage scan result
├── lib/api.ts                             # Client HTTP backend
├── lib/alternatives.ts                    # Fallback local Supabase
├── lib/productLookup.ts                   # Cascade fetch barcode
├── lib/ingredientMatch.ts                 # Matcher mobile (sync backend)
└── lib/offline.ts                         # AsyncStorage cache ingrédients
```
