/**
 * analytics.ts — Wrapper PostHog optionnel.
 *
 * Conçu pour être 100% no-op tant que la clé publique n'est pas fournie :
 *   - Aucun crash si `posthog-react-native` n'est pas (encore) installé.
 *   - Aucun crash si `EXPO_PUBLIC_POSTHOG_KEY` est absente.
 *   - Lazy-init : le module est importé dynamiquement à la première utilisation.
 *
 * Activation : voir `docs/POSTHOG-SETUP.md`.
 */

// ─── Typed event registry ─────────────────────────────────────────────────────
// Source unique des events critiques émis par l'app. Ajout ? Étendre cette
// union et adapter le dashboard PostHog en conséquence.
export type AnalyticsEvent =
  | 'app_opened'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_verdict_shown'
  | 'ghost_capture_initiated'
  | 'ghost_capture_completed'
  | 'alternative_viewed'
  | 'alternative_swap_tapped'
  | 'paywall_viewed'
  | 'paywall_purchased'
  | 'paywall_dismissed'
  | 'chat_message_sent'
  | 'onboarding_step_completed'
  | 'feature_discovered';

// ─── Minimal structural type for the PostHog client surface we use ────────────
// On évite `any` côté call-sites : ce typage local décrit uniquement les
// méthodes utilisées par ce wrapper. Cela garde `tsc --strict` heureux même
// quand `posthog-react-native` n'est pas (encore) installé dans node_modules.
interface PostHogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (
    distinctId: string,
    properties?: Record<string, unknown>,
  ) => void;
  screen: (name: string, properties?: Record<string, unknown>) => void;
}

// Constructeur attendu : `new PostHog(apiKey, options)`. On ne dépend pas du
// typage `posthog-react-native` (qui peut être absent) — on assume juste un
// constructeur qui renvoie quelque chose conforme à `PostHogLike`.
type PostHogCtor = new (apiKey: string, options: { host: string }) => PostHogLike;

// ─── Lazy init state ──────────────────────────────────────────────────────────
let _client: PostHogLike | null = null;
let _initialized = false;
let _initInFlight: Promise<PostHogLike | null> | null = null;

/**
 * Charge le SDK PostHog à la demande et instancie le client.
 *
 * Quatre cas où l'on renvoie `null` (silent no-op) :
 *   1. Pas de clé `EXPO_PUBLIC_POSTHOG_KEY` (mode dev/preview, scaffolding).
 *   2. Module `posthog-react-native` non installé (avant `pnpm install`).
 *   3. Erreur d'instanciation (mauvaise version, env JSC, etc.).
 *   4. Plateforme web où le SDK natif n'a pas de cible utile (best-effort).
 *
 * L'init est partagée entre tous les appelants concurrents via `_initInFlight`
 * pour éviter d'instancier plusieurs clients pendant le boot.
 */
async function getClient(): Promise<PostHogLike | null> {
  if (_initialized) return _client;
  if (_initInFlight) return _initInFlight;

  _initInFlight = (async () => {
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!key) {
      _initialized = true;
      return null;
    }
    try {
      // Import dynamique : si le module n'est pas installé, on tombe dans le
      // catch et on no-op silencieusement.
      //
      // On utilise `@ts-ignore` (et non `@ts-expect-error`) parce que la
      // dépendance peut être présente OU absente selon l'environnement :
      //   - Avant `pnpm install`  → module introuvable, suppression utile.
      //   - Après `pnpm install`  → module résolu, suppression "inutile".
      // `@ts-expect-error` ferait râler tsc dans le second cas (TS2578).
      // Le `@ts-ignore` est placé EXACTEMENT au-dessus de `await import(...)`
      // pour suppresser uniquement l'erreur "module not found". On part d'un
      // `unknown` puis on narrow proprement vers le shape attendu.
      type Mod = { PostHog?: PostHogCtor; default?: { PostHog?: PostHogCtor } | PostHogCtor };
      const mod = (await import(
        // @ts-ignore — posthog-react-native est une dép. optionnelle (cf. POSTHOG-SETUP.md)
        'posthog-react-native'
      )) as Mod;
      const ctor: PostHogCtor | undefined =
        mod.PostHog ??
        (typeof mod.default === 'function'
          ? (mod.default as PostHogCtor)
          : mod.default?.PostHog);
      if (!ctor) {
        _initialized = true;
        return null;
      }
      const host =
        process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
      _client = new ctor(key, { host });
    } catch {
      // Module absent, version incompatible, runtime sans `import()`, etc.
      _client = null;
    } finally {
      _initialized = true;
      _initInFlight = null;
    }
    return _client;
  })();

  return _initInFlight;
}

/**
 * Émet un event typé. No-op silencieux si PostHog n'est pas configuré.
 *
 * @param event - Un des events listés dans `AnalyticsEvent`.
 * @param props - Propriétés libres (sérialisables JSON).
 */
export async function track(
  event: AnalyticsEvent,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    client.capture(event, props);
  } catch {
    // Analytics ne doivent JAMAIS faire crasher l'app.
  }
}

/**
 * Associe l'utilisateur courant à un distinctId stable (ex: Supabase userId).
 * Appeler après authentification anonyme + chargement profil.
 */
export async function identify(
  userId: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    client.identify(userId, props);
  } catch {
    // Silent fail.
  }
}

/**
 * Enregistre une navigation d'écran (analogue à un `track` côté PostHog mais
 * indexé séparément dans le dashboard). À brancher sur le router si besoin
 * plus tard ; non utilisé pour l'instant.
 */
export async function screen(
  name: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    client.screen(name, props);
  } catch {
    // Silent fail.
  }
}
