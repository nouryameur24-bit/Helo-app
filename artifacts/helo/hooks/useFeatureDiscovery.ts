// ─── useFeatureDiscovery — first-use bottom sheet controller ────────────────
//
// Two usage patterns:
//
//   (A) AUTO on screen mount (most common):
//
//     const fd = useFeatureDiscovery('circle');
//     return (
//       <>
//         {/* screen content */}
//         <FeatureDiscoverySheet {...fd.sheetProps} />
//       </>
//     );
//
//   (B) MANUAL trigger (e.g. tab/chip taps inside a screen):
//
//     const fd = useFeatureDiscovery('barcode', { autoShow: false });
//     // later: fd.trigger() — opens the sheet ONCE per device
//     <FeatureDiscoverySheet {...fd.sheetProps} />

import { useCallback, useEffect, useState } from 'react';

import {
  DISCOVERIES,
  hasSeenDiscovery,
  markDiscoverySeen,
  type DiscoveryKey,
} from '@/lib/featureDiscovery';
import type { FeatureDiscoverySheetProps } from '@/components/ui/FeatureDiscoverySheet';

type Options = {
  /** Auto-show on mount if not seen. Defaults to true. */
  autoShow?: boolean;
  /** Delay before auto-show, ms. Defaults to 500. */
  delayMs?: number;
};

export type UseFeatureDiscoveryReturn = {
  visible: boolean;
  trigger: () => Promise<void>;
  dismiss: () => void;
  sheetProps: FeatureDiscoverySheetProps;
};

export function useFeatureDiscovery(
  key: DiscoveryKey,
  opts: Options = {},
): UseFeatureDiscoveryReturn {
  const { autoShow = true, delayMs = 500 } = opts;
  const [visible, setVisible] = useState(false);
  const content = DISCOVERIES[key];

  const trigger = useCallback(async () => {
    const seen = await hasSeenDiscovery(key);
    if (!seen) setVisible(true);
  }, [key]);

  const dismiss = useCallback(() => {
    setVisible(false);
    void markDiscoverySeen(key);
  }, [key]);

  useEffect(() => {
    if (!autoShow) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const seen = await hasSeenDiscovery(key);
      if (!cancelled && !seen) setVisible(true);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [autoShow, delayMs, key]);

  return {
    visible,
    trigger,
    dismiss,
    sheetProps: {
      visible,
      onDismiss: dismiss,
      ...content,
    },
  };
}
