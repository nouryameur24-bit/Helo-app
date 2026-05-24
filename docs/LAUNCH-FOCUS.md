# Launch Focus — Audit des écrans v1.0

**Objectif** : réduire la surface produit au strict nécessaire pour le launch App Store et éviter le feature creep. 30+ écrans existent dans `app/` — pas tous doivent être visibles en v1.0.

## Recommandation par écran

| Écran | Status | Justification |
|---|---|---|
| **Tabs principales** | | |
| `(tabs)/index.tsx` (Home) | ✅ KEEP | Cœur de l'expérience |
| `(tabs)/scan.tsx` | ✅ KEEP | Killer feature #1 |
| `(tabs)/shelf.tsx` (Placard) | ✅ KEEP | Engagement long terme |
| `(tabs)/chat.tsx` (Sage-Femme IA) | ✅ KEEP | Premium différenciant |
| `(tabs)/profile.tsx` | ✅ KEEP | Indispensable |
| **Core scan flow** | | |
| `alternatives.tsx` | ✅ KEEP | Killer feature Premium |
| `verdict/[scanId].tsx` | ✅ KEEP | Sortie scan |
| `ocr-review.tsx` | ✅ KEEP | Mode OCR Premium |
| `photo-result.tsx` | ✅ KEEP | Mode photo |
| `compare.tsx` | ✅ KEEP | Mode Comparateur (Premium) |
| **Premium features (KEEP)** | | |
| `restaurant-results.tsx` | ✅ KEEP | Killer Mode Restaurant |
| `prescription-scan.tsx` + `prescription-results.tsx` | ✅ KEEP | Différenciation médicale |
| `shelf-scan.tsx` + `shelf-results.tsx` | ✅ KEEP | Premium engagement |
| `basket-scan.tsx` + `basket-results.tsx` | ✅ KEEP | Premium engagement |
| `partner-checklist.tsx` + `partner-checklist-tab.tsx` + `partner-weekly-brief.tsx` | ✅ KEEP | **Killer Mode Partenaire** |
| `nutrition.tsx` | ✅ KEEP | Différenciation forte |
| `home-score.tsx` | ✅ KEEP | Engagement Glow Score |
| `weekly-brief.tsx` | ✅ KEEP | Engagement Premium |
| `timeline.tsx` | ✅ KEEP | Différenciation 40 semaines |
| `trimester-milestone.tsx` | ✅ KEEP | Engagement |
| `journal.tsx` + `journal-entry.tsx` | ✅ KEEP | Engagement long terme |
| **Onboarding + Legal** | | |
| `onboarding/*` | ✅ KEEP | Indispensable |
| `legal/*` | ✅ KEEP | Obligatoire App Store |
| `methodology.tsx` | ✅ KEEP | Apple review + trust |
| `paywall.tsx` | ✅ KEEP | Monétisation |
| `notifications-settings.tsx` | ✅ KEEP | Standard |
| `submit-product.tsx` | ✅ KEEP | UGC pour enrichir base |
| `search.tsx` | ✅ KEEP | Découverte produits |
| `history.tsx` | ✅ KEEP | Indispensable |
| `guide.tsx` | ✅ KEEP | Aide utilisatrice |
| **À HIDE pour v1.0 (réactiver en v1.1+)** | | |
| `circle.tsx` | 🟡 HIDE | Cercle social — déjà marqué V2 dans `replit.md` |
| `community.tsx` | 🟡 HIDE | Communauté — déjà marqué V2 |
| `memories.tsx` | 🟡 HIDE | Capsules temporelles — feature speculative |
| `pact.tsx` | 🟡 HIDE | Pacte grossesse — feature speculative |
| `voice.tsx` | 🟡 HIDE | Assistant vocal — coûteux + Apple Speech recognition demande perm spéciale |
| `ar-mirror.tsx` | 🟡 HIDE | AR Mirror — gimmick, pas core value |
| `scan-party.tsx` | 🟡 HIDE (Premium uniquement) | Engagement event-based — pas viable v1.0 |
| `travel.tsx` + `travel-briefing.tsx` | 🟡 HIDE | Mode Voyage — niche, pas v1.0 |
| **À SUPPRIMER (dead code)** | | |
| `test-scan.tsx` | 🔴 DELETE | Dev test screen, ne doit pas ship |
| `widget-preview.tsx` | 🔴 DELETE | Preview widget interne, pas user-facing |

## Pattern Feature Flags — recommandé

Au lieu de supprimer les écrans HIDE (qui casserait git history et potentiellement des deeplinks), utiliser un pattern feature flag :

### 1. Créer `artifacts/helo/constants/featureFlags.ts`

```typescript
/**
 * Feature flags — pilotage par écran pour le launch v1.0.
 *
 * Pattern minimaliste : un object FEATURES contre lequel on guard les
 * navigations et les rendering. Pas de service distant pour l'instant
 * (GrowthBook/LaunchDarkly = surdose pour le stage actuel).
 *
 * Pour activer une feature en prod, set la valeur à `true` puis build.
 */
export const FEATURES = {
  circle: false,
  community: false,
  memories: false,
  pact: false,
  voice: false,
  arMirror: false,
  scanParty: false,
  travel: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag];
}
```

### 2. Guard les navigations dans la tab bar / home

Partout où on `router.push('/circle')` ou `router.push('/voice')`, wrap :

```typescript
import { isFeatureEnabled } from '@/constants/featureFlags';

// Avant
<Pressable onPress={() => router.push('/circle')}>...</Pressable>

// Après
{isFeatureEnabled('circle') && (
  <Pressable onPress={() => router.push('/circle')}>...</Pressable>
)}
```

### 3. Garde-fou dans les écrans concernés

Au début de chaque écran HIDE, ajouter :

```typescript
// app/circle.tsx
import { isFeatureEnabled } from '@/constants/featureFlags';

export default function CircleScreen() {
  if (!isFeatureEnabled('circle')) {
    return <Redirect href="/" />;
  }
  // ... rest of the component
}
```

Comme ça même si un user a un deeplink direct vers `helo://circle`, il est redirigé vers home.

### 4. Pour les écrans à SUPPRIMER

`test-scan.tsx` et `widget-preview.tsx` peuvent être déplacés dans `app/_devtools/` (qui n'est pas exposé par Expo Router) ou simplement supprimés. Préfère la suppression pour réduire la confusion en review code.

## Impact estimé

| Avant launch | Après ce focus |
|---|---|
| 30+ écrans visibles | ~22 écrans focus |
| Surface UI à debugger | Réduite de ~25% |
| Code mort en bundle | Toujours là (pour réactivation v1.1) mais zéro accessible |
| Risque feature creep dans review user | Très réduit |

## Checklist d'application

- [ ] Créer `constants/featureFlags.ts` avec le pattern ci-dessus
- [ ] Wrapper les 8 entrées de navigation des features HIDE
- [ ] Ajouter le garde-fou `Redirect` dans les 8 écrans HIDE
- [ ] Supprimer `test-scan.tsx` et `widget-preview.tsx`
- [ ] Vérifier qu'aucune référence par texte (`'/voice'`, `'/circle'`) ne traîne
- [ ] Tester chaque écran v1.0 dans TestFlight beta avant App Store submit

Effort estimé : 2-3h. À faire avant la submit App Store.
