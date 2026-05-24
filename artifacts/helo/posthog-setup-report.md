<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Helo Expo app. The integration adds a singleton PostHog client (`lib/posthog.ts`), wraps the app with `PostHogProvider` for autocapture and screen tracking, and instruments 9 new business events across 7 files. User identification fires at both onboarding completion and on every cold start when a Supabase anonymous session is restored. Environment variables are stored in `.env` and referenced via `EXPO_PUBLIC_` prefix — no credentials are hardcoded.

| Event | Description | File |
|---|---|---|
| `scan_started` | Fired when a barcode is detected and allowed through the scan limit | `app/(tabs)/scan.tsx` |
| `scan_verdict_shown` | Fired when a product verdict renders with score, verdict, and phase | `app/verdict/[scanId].tsx` |
| `product_added_to_shelf` | Fired after a product is saved to the user's shelf with category and verdict | `app/verdict/[scanId].tsx` |
| `ghost_capture_initiated` | Fired when OCR starts for an unknown-barcode ghost capture flow | `app/ocr-review.tsx` |
| `alternative_viewed` | Fired when the alternatives ("The Swap") screen loads with result count | `app/alternatives.tsx` |
| `alternative_swap_tapped` | Fired when the user taps "Voir le détail" to navigate to an alternative | `app/alternatives.tsx` |
| `paywall_dismissed` | Fired when the user closes the paywall without purchasing | `app/paywall.tsx` |
| `onboarding_step_completed` (role) | Fired after the user selects pregnant or partner role | `app/onboarding/role.tsx` |
| `onboarding_step_completed` (profile) | Fired after the user completes name + due-date profile setup | `app/onboarding/profile.tsx` |

Previously instrumented events (unchanged): `app_opened`, `paywall_viewed`, `paywall_purchased`, `chat_message_sent`, `ghost_capture_completed`.

Screen tracking is now automatic via a `usePathname` effect in `RootLayoutNav` — every screen transition is recorded as a PostHog `screen` call with the previous pathname. User `identify` is called at onboarding profile completion (with `$set` / `$set_once` properties) and on each cold start when `ensureAnonymousSession` resolves.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/702403)
- [Scan-to-Verdict Conversion Funnel](/insights/xYIprrZj) — drop-off between scan and result display
- [Onboarding Completion Funnel](/insights/ypmqZIUa) — app open → role selection → paywall exposure
- [Paywall Conversion Rate](/insights/Gtte0gEP) — viewed vs purchased vs dismissed per day
- [Daily Scan Volume](/insights/nLi37x5R) — unique users scanning and receiving verdicts
- [Shelf Saves & Ghost Captures](/insights/6pldK7iy) — deep engagement and community contribution

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
