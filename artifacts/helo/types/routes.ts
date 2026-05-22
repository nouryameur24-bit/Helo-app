/**
 * Centralized typed route constants for Hēlo navigation.
 *
 * Use these constants instead of inline string literals to avoid
 * `as never` bypasses and to get a single point of truth for every
 * navigable screen.
 *
 * Example:
 *   import { ROUTES } from '@/types/routes';
 *   router.push(ROUTES.paywall);
 *   router.push(ROUTES.verdict(scanId));
 */

export const ROUTES = {
  // Tabs
  home: '/(tabs)/',
  scan: '/(tabs)/scan',
  shelf: '/(tabs)/shelf',
  chat: '/(tabs)/chat',
  profile: '/(tabs)/profile',
  history: '/history',
  community: '/community',
  journalTab: '/journal',
  partnerChecklistTab: '/partner-checklist-tab',

  // Dynamic
  verdict: (scanId: string) => `/verdict/${encodeURIComponent(scanId)}` as const,

  // Modal / stack screens
  ocrReview: '/ocr-review',
  guide: '/guide',
  timeline: '/timeline',
  journalEntry: '/journal-entry',
  travel: '/travel',
  travelBriefing: '/travel-briefing',
  restaurant: '/restaurant-results',
  paywall: '/paywall',
  premium: '/paywall', // alias — the paywall screen is the canonical pricing page
  weeklyBrief: '/weekly-brief',
  partnerWeeklyBrief: '/partner-weekly-brief',
  pact: '/pact',
  circle: '/circle',
  shelfScan: '/shelf-scan',
  shelfResults: '/shelf-results',
  basketScan: '/basket-scan',
  compare: '/compare',
  nutrition: '/nutrition',
  homeScore: '/home-score',
  memories: '/memories',
  arMirror: '/ar-mirror',
  widgetPreview: '/widget-preview',
  voice: '/voice',
  prescriptionScan: '/prescription-scan',
  prescriptionResults: '/prescription-results',
  submitProduct: '/submit-product',
  notificationsSettings: '/notifications-settings',
  profileEdit: '/profile/edit',
  onboardingRole: '/onboarding/role',
  methodology: '/methodology',
  termsLegal: '/legal/terms',
  privacyLegal: '/legal/privacy',
  alternatives: '/alternatives',
} as const;

export type RouteValue = string;
