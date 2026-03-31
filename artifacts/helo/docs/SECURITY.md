# Politique de Sécurité — Hēlo

## 1. Gestion des clés API

### État actuel (V1)
Les clés API sont stockées dans des variables d'environnement `EXPO_PUBLIC_*`.
Les variables `EXPO_PUBLIC_*` sont inlinées par Expo au moment du build et sont
donc **visibles dans le bundle JavaScript de l'application**.

| Clé | Niveau de risque | Plan |
|-----|-----------------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Faible (URL publique) | OK côté client |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Faible (protégée par RLS) | OK côté client |
| `EXPO_PUBLIC_GOOGLE_VISION_KEY` | **Élevé** | Migrer → Edge Function |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | **Élevé** | Migrer → Edge Function |

### Plan de migration vers les Edge Functions

#### Étape 1 — Déployer les Edge Functions

```bash
# Depuis la racine Supabase
supabase functions deploy chat --no-verify-jwt
supabase functions deploy ocr --no-verify-jwt

# Configurer les secrets côté serveur (jamais dans le code)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_VISION_KEY=AIza...
```

#### Étape 2 — Mettre à jour le client

Dans `lib/anthropic.ts`, remplacer l'appel direct à Anthropic par :

```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.functions.invoke('chat', {
  body: { messages, system },
});
```

Dans `lib/ocr.ts`, remplacer l'appel Google Vision par :

```typescript
const { data, error } = await supabase.functions.invoke('ocr', {
  body: { imageBase64, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] },
});
```

#### Étape 3 — Retirer les clés du client

Supprimer `EXPO_PUBLIC_GOOGLE_VISION_KEY` et `EXPO_PUBLIC_ANTHROPIC_API_KEY`
des fichiers `.env` et `app.json`.

Les fichiers Edge Function sont déjà créés dans `supabase/functions/`.

---

## 2. Row Level Security (RLS)

Toutes les tables Supabase ont RLS activé. Les politiques sont définies dans
`supabase/rls-policies.sql`.

### Résumé des politiques

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `ingredients` | Public | ❌ | ❌ | ❌ |
| `products` | Public | ❌ | ❌ | ❌ |
| `scan_history` | Owner | Owner | Owner | Owner |
| `shopping_list` | Owner | Owner | Owner | Owner |
| `community_submissions` | Approved only + own | Public | ❌ | ❌ |
| `profiles` | Owner | Owner | Owner | ❌ |
| `partner_links` | Participants | Owner (user_a) | ❌ | ❌ |

"Owner" = `user_id = auth.uid()` ou `user_id = x-app-user-id` (header custom).

### Appliquer les politiques

```bash
psql -h <SUPABASE_HOST> -U postgres -f supabase/rls-policies.sql
# ou
supabase db push
```

---

## 3. Sanitization des inputs

Toutes les données saisies par l'utilisateur passent par `lib/validation.ts`
**avant** d'être envoyées à Supabase ou à une API externe.

| Fonction | Usage |
|----------|-------|
| `sanitizeText(input, maxLen)` | Champs texte libres (notes, commentaires) |
| `sanitizeBarcode(input)` | Code-barres caméra / manuel |
| `sanitizeEmail(input)` | Email lors de l'onboarding |
| `sanitizeName(input, maxLen)` | Prénom, nom de marque |
| `sanitizePartnerCode(input)` | Code de liaison co-parent |
| `sanitizeChatMessage(input)` | Messages chatbot IA |

### Règles appliquées

1. **Strip HTML** — suppression des balises `<tag>` pour prévenir XSS
2. **Caractères dangereux** — suppression de `< > { } [ ] \ | = + * & ^ % $ # @ ! \` ~`
3. **Longueur maximale** — troncature avant stockage
4. **Barcodes** — uniquement des chiffres, longueur 8 ou 13

---

## 4. Error Reporting

Les erreurs sont loggées via `lib/errorReporting.ts`.

### V1 — AsyncStorage local

- Les 50 dernières erreurs sont stockées sous la clé `@helo_error_log`
- Le `user_id` est anonymisé (8 premiers caractères seulement)
- Aucun log en production (`console.*` gardé derrière `if (__DEV__)`)

### V2 — Sentry (prévu)

Le code de migration vers Sentry est documenté dans `lib/errorReporting.ts` :

```typescript
// TODO: Sentry integration
import * as Sentry from '@sentry/react-native';
Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
});
// Remplacer le corps de logError() par :
// Sentry.captureException(error, { extra: { screen: context.screen } });
```

---

## 5. Principes généraux

- **Moindre privilège** : la clé Supabase anon ne peut que ce que RLS autorise
- **Défense en profondeur** : validation côté client + RLS côté serveur
- **Pas de secrets dans le code** : toutes les clés via variables d'environnement
- **Logs de production** : zéro `console.log` hors `if (__DEV__)`
- **Dépendances** : maintenir à jour, surveiller `pnpm audit`
