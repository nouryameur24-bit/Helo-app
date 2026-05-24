/**
 * Lot 16-11 — Changelog versionné affiché au cold start après update.
 *
 * Format : pour chaque version, un titre court + une liste de bullets
 * orientés bénéfice user (pas "fix bug XYZ", plutôt "Tes scans sont
 * 2× plus rapides").
 *
 * Convention : on incrémente `CURRENT_VERSION` ici à CHAQUE bump de
 * app.json `version`. Le WhatsNewModal lit cette valeur, la compare à
 * `lastSeenVersion` en AsyncStorage et déclenche le modal si delta.
 *
 * Pourquoi pas Application.nativeAppVersion ? Sur Expo Go cette valeur
 * reflète Expo Go, pas Hēlo. Une const TS = source of truth.
 */

export interface WhatsNewEntry {
  version: string;
  title: string;
  bullets: string[];
}

/** ⚠️ Synchronise avec `app.json` → `expo.version` à chaque release. */
export const CURRENT_VERSION = '1.0.0';

export const CHANGELOG: WhatsNewEntry[] = [
  {
    version: '1.0.0',
    title: 'Bienvenue dans Hēlo',
    bullets: [
      "🎯 Scanne plus de 16 000 produits adaptés à ta grossesse",
      "💛 Mode accompagnant pour ton/ta partenaire",
      "👨‍⚕️ Sage-Femme IA disponible 24/7",
      "📦 Ton placard organisé par pièce",
    ],
  },
];

/** Récupère l'entrée du changelog pour la version donnée, ou null. */
export function getChangelog(version: string): WhatsNewEntry | null {
  return CHANGELOG.find((e) => e.version === version) ?? null;
}
