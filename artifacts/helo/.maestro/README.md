# Hēlo — Maestro E2E Tests

End-to-end UI tests for the Hēlo mobile app, written for [Maestro](https://maestro.mobile.dev).

## Why Maestro

- YAML-only flows — no JS test framework to maintain.
- Works against the real Expo Dev Client / TestFlight build.
- One command runs against iOS Simulator, Android Emulator, or real devices.
- Compatible with Maestro Cloud for CI.

## Install

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# verify
maestro --version
```

## Run (local)

```bash
# Build & install the dev client first (one time):
cd artifacts/helo
npx expo run:ios          # or: npx expo run:android

# Then from the helo artifact:
maestro test .maestro/01_disclaimer_accept.yaml          # one flow
maestro test .maestro/                                    # all flows
maestro test .maestro/ --include-tags=critical            # only critical tags
```

## CI (GitHub Actions snippet)

```yaml
- uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: artifacts/helo/build/Helo.app
    workspace: artifacts/helo/.maestro
    include-tags: critical
```

## Flows

| #  | File | What it covers | Tag |
|----|------|----------------|-----|
| 01 | `01_disclaimer_accept.yaml` | First-launch medical disclaimer modal | critical, first-launch |
| 02 | `02_onboarding.yaml` | Role → profile → interests onboarding | critical, onboarding |
| 03 | `03_home_navigation.yaml` | All 5 bottom tabs render | critical, navigation |
| 04 | `04_scan_barcode.yaml` | Scan tab UI + mode chips | critical, scan |
| 05 | `05_ocr_review.yaml` | OCR ingredients mode reachable | scan, ocr |
| 06 | `06_shelf_scan.yaml` | Shelf scan entry point | shelf |
| 07 | `07_chat_safe.yaml` | Safe question (paracétamol) goes to AI | chat, ai |
| 08 | `08_chat_blocked_medication.yaml` | Blocked med (Advil) returns hardcoded CRAT response | **critical**, chat, safety |
| 09 | `09_compare_products.yaml` | Comparator empty state renders | compare |
| 10 | `10_profile_menu.yaml` | Every profile menu entry navigates without crash (incl. /paywall alias + /profile/edit placeholder) | critical, navigation |

## Limitations

- **Camera-driven flows** (scan barcode, OCR, shelf scan) cannot exercise a real capture in CI. They validate the UI shell only. To test the full scan→verdict pipeline, use a manual run with the device pointed at a real product, or stub the camera output via Detox/Appium.
- **AI chat flows** require live Supabase + Anthropic API keys. The blocked-medication flow (08) is the only one that runs offline-deterministically because the safety filter short-circuits before the network call.
- Selectors use **visible French text** (no testIDs in the codebase). If you change copy, update the matching flow.

## Recommended next step

Add `testID` props to the most navigation-critical components (tab bar items, primary CTAs) so flows become resilient to copy changes. Suggested IDs:

- `tab-home`, `tab-scan`, `tab-shelf`, `tab-chat`, `tab-profile`
- `cta-scan-now`, `cta-shelf-scan`, `cta-compare`
- `chat-input`, `chat-send`
- `disclaimer-accept`
