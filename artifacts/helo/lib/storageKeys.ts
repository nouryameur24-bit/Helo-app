/**
 * Central registry of every AsyncStorage key used in the Hēlo app.
 *
 * ⚠️  Production data lives behind these strings on real users' phones.
 *      NEVER rename a value (the RHS string) once shipped — doing so will
 *      orphan all previously persisted data. You may rename the JS-side
 *      key (the LHS) freely.
 *
 *  Why a central file rather than scattered string literals:
 *    • TypeScript autocompletion + compile-time typos catch bad keys.
 *    • One place to audit what we store and to wipe on logout.
 *    • Avoids two screens accidentally diverging (e.g. one writes
 *      "@helo_shelf", another reads "@helo-shelf").
 *
 *  When a key is parameterised (per-barcode, per-user, …), expose a
 *  builder function below instead of leaking the prefix.
 */

export const STORAGE_KEYS = {
  // ── Profile & onboarding ────────────────────────────────────────────
  profile: 'user_profile',
  onboardingCompleted: 'onboarding_completed',
  disclaimerAccepted: 'disclaimer_accepted',
  disclaimerAcceptedVersion: 'disclaimer_accepted_version',
  showWelcomeOverlay: '@helo_show_welcome_overlay',
  userRole: '@helo_user_role',
  linkedUserId: '@helo_linked_user_id',
  linkedFirstName: '@helo_linked_first_name',
  partnerFirstName: '@helo_partner_first_name',
  partnerInterests: '@helo_partner_interests',
  partnerChecklist: '@helo_partner_checklist',
  partnerBriefWeek: '@helo_partner_brief_week',

  // ── Shelf, scans, baskets ───────────────────────────────────────────
  shelf: '@helo_shelf',
  basket: '@helo_basket',
  lastScanDate: '@helo_last_scan_date',
  photoScanResult: '@helo_photo_scan_result',

  // ── Restaurant ─────────────────────────────────────────────────────
  restaurantUsed: '@helo_restaurant_used',
  menuResult: '@helo_menu_result',

  // ── Trimester & pregnancy state ────────────────────────────────────
  lastTrimester: '@helo_last_trimester',
  weekOfPregnancy: '@helo_week_of_pregnancy',
  bfSuggestionDismissed: '@helo_bf_suggestion_dismissed',
  breastfeedingMode: '@helo_breastfeeding_mode',
  babyMode: '@helo_baby_mode',

  // ── Weekly brief ───────────────────────────────────────────────────
  lastBriefRead: '@helo_last_brief_read',

  // ── Glow & home score ──────────────────────────────────────────────
  glow: '@helo_glow',
  homeBadgeUnlocked: '@helo_home_badge_unlocked',

  // ── Circle (community feed) ────────────────────────────────────────
  circleFeed: '@helo_circle_feed',
  circleCache: '@helo_circle_cache',
  circleFeedCache: '@helo_circle_feed_cache',

  // ── Premium / usage limits ─────────────────────────────────────────
  isPremium: '@helo_is_premium',
  scanLimit: '@helo_scan_limit',
  voiceLimit: '@helo_voice_limit',
  chatLimit: '@helo_chat_limit',
  scanPartyUsed: '@helo_scan_party_used',

  // ── AI / chat ──────────────────────────────────────────────────────
  chatHistory: '@helo_chat_history',

  // ── Product recalls (RappelConso) ──────────────────────────────────
  recallCache: '@helo_recall_cache',
  recallLastCheck: '@helo_recall_last_check',
  recallActiveAlert: '@helo_recall_active_alert',

  // ── Offline / sync ─────────────────────────────────────────────────
  offlineCache: '@helo_offline_cache',
  offlineQueue: '@helo_offline_queue',
  lastSync: '@helo_last_sync',
  ingredientsDb: '@helo_ingredients_db',
  errorLog: '@helo_error_log',

  // ── Travel ─────────────────────────────────────────────────────────
  travelBriefingsIndex: '@helo_travel_briefings_index',

  // ── Pact (daily streak) ────────────────────────────────────────────
  pact: '@helo_pact',
  pactBadges: '@helo_pact_badges',

  // ── Memories & journal ─────────────────────────────────────────────
  memoryCapsules: 'memory_capsules',
  journalEntries: 'journal_entries',

  // ── Notifications ──────────────────────────────────────────────────
  notificationSettings: 'notification_settings',
  notificationPermissionAsked: 'notification_permission_asked',
  notificationWeeklyCap: 'notification_weekly_cap',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Prefixes for dynamic keys. Never use these directly in `AsyncStorage`
 * calls — use the matching builder so the suffix is type-checked.
 */
export const STORAGE_PREFIXES = {
  scanCache: '@helo_scan_cache_',
  roomCelebrated: '@helo_room_celebrated_',
  featureDiscovery: '@helo_discovery_',
  circleWeekNotified: '@helo_circle_week_notified_',
  travelBriefing: '@helo_travel_briefing_',
  ocrResult: '@helo_ocr_',
} as const;

export const scanCacheKey = (barcode: string): string =>
  `${STORAGE_PREFIXES.scanCache}${barcode}`;

export const roomCelebratedKey = (roomId: string): string =>
  `${STORAGE_PREFIXES.roomCelebrated}${roomId}`;

export const featureDiscoveryKey = (key: string): string =>
  `${STORAGE_PREFIXES.featureDiscovery}${key}`;

export const circleWeekNotifiedKey = (userId: string): string =>
  `${STORAGE_PREFIXES.circleWeekNotified}${userId}`;

export const travelBriefingKey = (slug: string): string =>
  `${STORAGE_PREFIXES.travelBriefing}${slug}`;

export const ocrResultKey = (id: string): string =>
  `${STORAGE_PREFIXES.ocrResult}${id}`;
