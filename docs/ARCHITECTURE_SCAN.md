# Hēlo — Architecture Scan & Alternatives

> **Statut : VERROUILLÉ pour la production** (clôture après CHUNK 7)
> Moteur de scan et système d'alternatives hybride officiellement gelés.
> Toute évolution future devra justifier l'ouverture d'un nouveau chapitre.

---

## 1. Flow de données d'un scan

```
┌─────────────┐    1. POST /api/scan        ┌──────────────────┐
│   Mobile    │ ────────────────────────────→│   BFF Express    │
│  (Expo)     │    { barcode, trimester }   │  artifacts/      │
│             │    x-helo-app-secret        │  api-server      │
└─────────────┘                              └────────┬─────────┘
      ↑                                               │
      │ 6. Verdict { score, ingredients,              │ 2. Lookup cache Supabase
      │             riskLevel, advice }               │    (table scans_cache)
      │                                               ↓
      │                                      ┌──────────────────┐
      │                                      │     Supabase     │
      │                                      │  scans_cache     │  HIT → metric
      │                                      │  products        │  scan_cache{hit:true}
      │                                      │  ingredients     │  → return early
      │                                      └────────┬─────────┘
      │                                               │ MISS
      │                                               │ 3. Hydratation produit
      │                                               │    + parsing INCI
      │                                               ↓
      │                                      ┌──────────────────┐
      │                                      │  Match déterm.   │
      │                                      │  5000 ingrédients│ ← knowledge base
      │                                      │  par phase       │   (cosing/efsa/
      │                                      └────────┬─────────┘    crat/medications)
      │                                               │
      │                                               │ 4. Si ambigu/inconnu
      │                                               ↓
      │                                      ┌──────────────────┐
      │                                      │  Claude Haiku    │ metric:
      │                                      │  claude-haiku-4-5│ scan_ai_call
      │                                      │  max 400 tokens  │ {ms, tokens}
      │                                      └────────┬─────────┘
      │                                               │
      │                                               │ 5. Write-back cache
      └───────────────────────────────────────────────┘
```

**Caractéristiques clés** :

| Étape | Latence typique | Source |
|---|---|---|
| Cache HIT | ~400 ms | Supabase round-trip |
| Cache MISS sans Claude | ~800 ms | Supabase + match déterministe |
| Cache MISS avec Claude | ~3.0–3.5 s | + 1 appel Anthropic |
| Tokens moyens Claude | ~2 500 in / ~300 out | par scan IA |

**Auth** : header `x-helo-app-secret` (HMAC partagé app/BFF, validé par middleware `requireAppSecret` ; le redact Pino masque la valeur dans tous les logs).

---

## 2. Flow du moteur d'alternatives (hybride Filet + Sniper + Ceinture)

```
GET /api/alternatives/:barcode?trimester=X
                 │
                 ▼
        ┌─────────────────┐
        │  Cache lookup   │  metric: alternatives_cache{hit}
        │  (cacheKey =    │
        │   "t1"|"t2"|... │
        │   |"breastfee.."│
        │   |"baby")      │
        └────────┬────────┘
                 │ MISS
                 ▼
   ╔════════════════════════════════════╗
   ║  ÉTAGE 1 — LE FILET (large)        ║   ILIKE Supabase sur catégorie
   ║  pg_trgm ILIKE                     ║   + mots-clés produit source
   ║  ≤ 20 candidats                    ║
   ╚════════════════════════════════════╝
                 │
                 ▼
   ╔════════════════════════════════════╗
   ║  ÉTAGE 2 — LE SNIPER (sélectif)    ║   Claude Haiku, prompt strict :
   ║  Claude Haiku 4.5                  ║   "ne garde que les 3 produits
   ║  max 200 tokens out                ║    100% safe pour cette phase,
   ║  → SniperResult{barcodes, outcome} ║    sinon retourne []"
   ╚════════════════════════════════════╝
                 │
                 ├── outcome=infra_error    → metric:alternatives_ai_error
                 │                            + alertAiError() throttlée
                 │                            → fallback []
                 │
                 ├── outcome=parse_error    → log warn, []
                 │
                 ├── outcome=model_empty    → 🛡️ metric:safety_trap_triggered
                 │                              {reason:"sniper_empty"}
                 │                            + alertSafetyTrap() throttlée
                 │                            → []
                 │
                 └── outcome=success        ↓ barcodes validés
                 ▼
   ╔════════════════════════════════════╗
   ║  ÉTAGE 3 — CEINTURE & BRETELLES    ║   Re-vérification déterministe
   ║  Match ingrédient-par-ingrédient   ║   contre les 5000 ingrédients.
   ║  sur les 3 picks du Sniper         ║   Veto si UNE seule entrée :
   ╚════════════════════════════════════╝   - inconnue (no_signal)
                 │                          - danger/caution pour la phase
                 │
                 ├── beltVetoUnknown > 0    → 🛡️ metric{reason:"belt_unknown",
                 │                                       vetoed, examined}
                 │                            + alertSafetyTrap throttlée
                 │
                 ├── beltVetoRisk > 0       → 🛡️ metric{reason:"belt_risk", …}
                 │                            + alertSafetyTrap throttlée
                 │
                 ▼
        ┌─────────────────┐
        │  safeProducts   │  Scoring + badges (score, originBadge)
        │  → DTO          │  slice(0, isPremium ? 5 : 3) côté mobile
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Write-back     │  Cache Supabase, TTL phase-spécifique
        │  cache          │
        └────────┬────────┘
                 │
                 ▼
              Response

[Côté mobile] lib/api.ts → fetchAlternativesRemote() avec fallback local
                          sur erreur réseau / payload malformé.
```

**Philosophie "Ceinture & Bretelles"** : on n'admet un produit comme "100 % safe" que si **chaque** ingrédient est positivement reconnu ET sans risque pour la phase. *"On ne sait pas" ≠ "c'est safe"*. Cette preuve positive est le cœur de la fiabilité médicale.

---

## 3. Sécurités en place

### 🛡️ Trappe de sécurité médicale (KPI fiabilité)

Deux mécanismes orthogonaux, distinctement loggés et alertés :

| Trappe | Déclencheur | Métrique |
|---|---|---|
| **Sniper empty** | Claude renvoie explicitement `[]` sur un set candidat non vide | `safety_trap_triggered{reason:"sniper_empty"}` |
| **Belt unknown** | ≥ 1 produit vetoé car ingrédient inconnu | `safety_trap_triggered{reason:"belt_unknown", vetoed, examined}` |
| **Belt risk** | ≥ 1 produit vetoé car ingrédient danger/caution | `safety_trap_triggered{reason:"belt_risk", vetoed, examined}` |

**Distinction critique** : le KPI ne fire que sur `model_empty` (intention explicite du modèle). Les `infra_error`, `parse_error`, `unconfigured`, `no_candidates` produisent aussi `[]` mais sont des incidents techniques séparés (`alternatives_ai_error` ou `log.warn`) — **ne polluent pas le taux de trappe**.

### 🚦 Rate limits (Express middlewares)

| Middleware | Endpoint | Limite |
|---|---|---|
| `requireAppSecret` | `/api/*` | Auth HMAC obligatoire |
| `alternativesRateLimit` | `/api/alternatives/:barcode` | Par IP, fenêtre glissante |

### 🤫 Throttling alertes (anti-spam Discord/Slack)

Mécanisme en mémoire dans `lib/webhookAlerter.ts` — **strictement O(1)** sur le request path.

| Type d'alerte | Clé de dédup | Fenêtre |
|---|---|---|
| Erreur API Anthropic | `ai_error:<source>:<errorKind>` | **5 min** |
| Trappe de sécurité | `safety_trap:<reason>:<barcode>` | **1 min** |

**Garanties** :
- **Hard cap mémoire** : Map plafonnée à 10 000 entrées via **éviction FIFO O(1)** (`keys().next().value`). Impossible de dépasser ~500 KB RAM même sous flood d'attaque.
- **Silence gracieux** : alerte droppée par throttle = `return` simple, aucun log warn (ne pollue pas Pino).
- **Court-circuit no-op** : si `METRICS_WEBHOOK_URL` absent, la fonction return AVANT toute écriture dans la Map (zéro overhead).

### 🔥 Fire-and-forget webhook

Toutes les alertes :
1. Retournent `void` immédiatement (jamais awaité)
2. Lancent `fetch` en arrière-plan avec **timeout 3 s** via `AbortController`
3. Wrappent toutes les erreurs (réseau, DNS, abort, 5xx) dans `try/catch/finally`
4. Wrappent même `logger.warn` dans `safeWarn()` (paranoïa Node 24 unhandled rejection)

→ **Impossible** qu'une panne Discord/Slack ralentisse ou crashe un `/api/scan` ou `/api/alternatives`.

### 🔐 Anti-leak PII

Aucune des chaînes de logs ou des payloads webhook ne contient :
- ❌ Listes d'ingrédients
- ❌ Prompts Claude
- ❌ Headers, tokens, app secret (redact Pino sur `x-helo-app-secret`, `authorization`, `cookie`)
- ❌ Noms ou identifiants utilisateur

Seuls passent : codes-barres (publics), IDs Supabase courts, compteurs, durées (ms), labels (`model`, `cacheKey`, `reason`, `error_kind`).

---

## 📊 Les 7 événements de métrique (observabilité Pino)

Tous les events sortent en JSON structuré avec `{ metric: true, event, ... }` — filtrables `grep '"metric":true'` puis agrégeables `jq`.

| Event | Source | Champs clés |
|---|---|---|
| `scan_cache` | `/api/scan` | `hit, barcode, cacheKey` |
| `scan_ai_call` | Claude scan | `ms, input_tokens, output_tokens, model` |
| `scan_ai_error` | Claude scan catch | `ms, error_kind, model` |
| `alternatives_cache` | `/api/alternatives` | `hit, barcode, cacheKey [, n]` |
| `alternatives_ai_call` | Claude sniper | `ms, input_tokens, output_tokens, candidates, picked` |
| `alternatives_ai_error` | Claude sniper catch | `ms, error_kind, model` |
| `safety_trap_triggered` | Sniper + Ceinture | `reason, barcode, cacheKey [, vetoed, examined]` |

**Classification d'erreur Anthropic** ordonnée pour gérer les sous-classes sans `.status` HTTP :
`APIConnectionTimeoutError → timeout`, `APIConnectionError → network`, `RateLimitError`, `AuthenticationError`, puis `APIError.status`.

---

## 🗂️ Fichiers de référence

| Fichier | Rôle |
|---|---|
| `artifacts/api-server/src/routes/scan.ts` | Endpoint POST scan |
| `artifacts/api-server/src/routes/alternatives.ts` | Endpoint GET alternatives (3 étages) |
| `artifacts/api-server/src/lib/anthropic.ts` | `analyzeIngredientsWithClaude` + `selectSafeAlternativesWithClaude` + `SniperResult` + `classifyAnthropicError` |
| `artifacts/api-server/src/lib/metrics.ts` | `emitMetric`, `mark` |
| `artifacts/api-server/src/lib/webhookAlerter.ts` | `alertAiError`, `alertSafetyTrap`, throttle FIFO |
| `artifacts/api-server/src/lib/logger.ts` | Pino avec redact |
| `artifacts/api-server/src/middlewares/appSecret.ts` | Auth HMAC |
| `artifacts/api-server/src/middlewares/alternativesRateLimit.ts` | Rate limit IP |
| `artifacts/helo/lib/api.ts` | `fetchAlternativesRemote` + fallback local |

---

## ✅ Verrouillage

- **Typecheck** : 0 erreur
- **Tests Jest** : 232/232 ✅
- **Code reviews architecte** : 4 issues critiques remontées, 4 fixées (sniper outcome structuré, classifyAnthropicError ordre des sous-classes, agrégation vetos belt, hard cap FIFO O(1))
- **PII** : audité — aucun leak
- **Mémoire** : bornée — pas de fuite possible
- **Latence** : webhook fire-and-forget — zéro impact sur le p99 user

**🔒 Chapitre fermé. Pas de feature creep.**
