/**
 * featureFlags.ts — Pilotage par écran pour le launch v1.0.
 *
 * Pattern minimaliste : un object FEATURES contre lequel on guard les
 * navigations et les rendering. Pas de service distant pour l'instant
 * (GrowthBook / LaunchDarkly = surdose pour le stade actuel).
 *
 * Stratégie launch v1.0 : tout désactivé par défaut, on ré-active feature
 * par feature au fur et à mesure des releases (v1.1, v1.2...) une fois la
 * v1.0 stabilisée en App Store.
 *
 * Usage côté UI (cf. docs/LAUNCH-FOCUS.md) :
 *
 *   import { isFeatureEnabled } from '@/constants/featureFlags';
 *
 *   {isFeatureEnabled('circle') && <CircleEntry />}
 *
 * Et au top de chaque écran HIDE :
 *
 *   if (!isFeatureEnabled('circle')) return <Redirect href="/" />;
 */
export const FEATURES = {
  /** Cercle social privé entre proches. Reporté à v1.1. */
  circle: false,
  /** Feed communautaire. Reporté à v1.1. */
  community: false,
  /** Capsules temporelles de grossesse. Speculative — v1.2+. */
  memories: false,
  /** Pacte de grossesse. Speculative — v1.2+. */
  pact: false,
  /** Assistant vocal. Coûteux + Apple Speech Recognition permission. v1.1+. */
  voice: false,
  /** Mode AR Miroir. Gimmick — v1.2+. */
  arMirror: false,
  /** Scan Party (event-based). Premium future — v1.1+. */
  scanParty: false,
  /** Mode Voyage (briefing pays). Niche — v1.1+. */
  travel: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag];
}
