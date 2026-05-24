# Audit follow-ups — dettes architecturales restantes

Suivi des findings de l'audit `v4` qui n'ont **pas** été corrigés directement dans le code parce qu'ils nécessitent des décisions produit ou des migrations à risque. À traiter avant le launch App Store.

## ⚠️ Action requise — Déploiement Supabase RPC

**Fichier** : `docs/supabase-rpc.sql`
**Fonctions** : `merge_analysis_cache`, `upsert_product_keep_cache`

Le code Node (`routes/scan.ts`) appelle déjà `merge_analysis_cache` avec un fallback transparent vers l'ancien read-modify-write si la fonction n'est pas trouvée (code Postgres `42883`). Tant que la RPC n'est pas déployée :

- Les scans continuent de fonctionner ✅
- La race condition documentée subsiste (rare en pratique, 1 perte d'écriture sur ~1000 scans concurrents même phase/barcode)

**Pour activer la protection atomique** :
1. Ouvrir https://supabase.com/dashboard/project/<your-project>/sql/new
2. Coller le contenu de `docs/supabase-rpc.sql`
3. Cliquer **Run**
4. Vérifier : `SELECT proname FROM pg_proc WHERE proname IN ('merge_analysis_cache', 'upsert_product_keep_cache');` → 2 lignes

## ⚠️ Action requise — Configuration RevenueCat backend

**Code** : `src/middlewares/requirePremium.ts`

Le middleware valide le tier Premium côté serveur via RevenueCat API **si** `REVENUECAT_SECRET_API_KEY` est configurée dans Replit Secrets. Tant que la clé n'est pas configurée :

- Le middleware retombe sur le header legacy `x-helo-is-premium` (falsifiable)
- Un log warn explicite est émis au boot : `requirePremium: REVENUECAT_SECRET_API_KEY not set — falling back to client header. NOT a real shield.`

**Pour activer la protection forte** :
1. RevenueCat Dashboard → Project → API Keys → Copier la **Secret API Key** (≠ Public API key qui est dans le bundle mobile)
2. Replit → Secrets → Add `REVENUECAT_SECRET_API_KEY` = `<secret_v2_…>`
3. Redéployer le service

L'app mobile envoie déjà le header `x-helo-rc-user-id` (cf. `lib/api.ts:fetchAlternativesRemote`).

## 🟠 Dette ouverte — Pipeline ingrédients : risque de cache obsolète

**Fichier** : `scripts/src/ingredients-pipeline/insert.ts:161`

```ts
.upsert(batch, { onConflict: 'barcode', ignoreDuplicates: true });
```

**Risque** : un produit déjà en base ne sera **jamais** rafraîchi par le pipeline, même si OFF a corrigé son `ingredients_text_fr`. Conséquence : le `analysis_cache` (qui dépend de `ingredients_raw`) devient obsolète sans déclencheur d'invalidation.

**Solution recommandée** : remplacer la ligne par un appel à la RPC `upsert_product_keep_cache` (cf. `docs/supabase-rpc.sql`). Cette RPC :
- Upsert les champs metadata (name, brand, category, image_url) 
- Préserve `analysis_cache` si `ingredients_raw` n'a pas changé
- **Efface** `analysis_cache` si `ingredients_raw` a changé (invalidation cohérente)

Effort : ~5 lignes dans `insert.ts`. Non fait dans Lot 3 pour ne pas mêler scripts/ et apparaître dans un commit avec des effets de bord pendant le launch.

## 🟡 Dette ouverte — Unification des types `MatchResult`

**3 emplacements actuels** :
1. `artifacts/api-server/src/lib/matcher.ts:48-53` (canonical)
2. `artifacts/helo/types/index.ts` (mobile)
3. Schéma OpenAPI `lib/api-spec/openapi.yaml` → généré dans `lib/api-zod/src/generated/`

Risque : compile OK mais runtime divergent (mobile s'attend à un champ que le backend ne renvoie plus, ou vice-versa).

**Solution recommandée** : OpenAPI = source unique. Régénérer types mobile via Orval (déjà configuré dans `lib/api-spec/orval.config.ts`). Matcher backend importe son `MatchResult` depuis `@workspace/api-zod`. Effort : ~1 jour. Non bloquant tant qu'on respecte le pattern "modifier les 3 ensemble" — mais c'est exactement le pattern qui a causé la régression v3 sur `parseIngredients`.

## ✅ Déjà traité

- ✅ #1 EXPO_PUBLIC fallback retiré (Lot 2)
- ✅ #2 CORS verrouillé (Lot 1)
- ✅ #3 `/download/design` supprimé (Lot 1)
- ✅ #4 Race `analysis_cache` — RPC préparée + intégration code (déploiement SQL pending)
- ✅ #5 Tests matcher + parseIngredients (35 cas, Lot 2)
- ✅ #6 Premium falsifiable — middleware RC prêt (config RC API key pending)
- ✅ #7 `devActivate` supprimé (Lot 1)
- ✅ #8 Anthropic timeout + retries + circuit breaker (Lot 1)
- ✅ #9 AI fallback dégradation — circuit breaker (Lot 1)
- ✅ #10 ~Chat loading state~ (était déjà présent — faux positif audit)
- ✅ #11 Alternatives error state + retry (Lot 1)
- ✅ #12 Mobile/backend `parseIngredients` aligné (Lot 2)
- ✅ #13 — voir ci-dessus, dette pipeline ouverte
- ✅ #14 AbortController global `/alternatives` (Lot 2)
- ✅ #15 `/healthz` log skip (Lot 1)
- ✅ #16 `webhookAlerter` Map — vérifié, déjà borné FIFO + TTL (faux positif audit)
- ✅ #17 `TOO_GENERIC_TAGS` étendu + slug guard ≥6 (Lot 1)
- ✅ #18 — voir ci-dessus, dette types ouverte
- ✅ #19 `ModeChip` minHeight 44 (Lot 1)
