/**
 * components/points/PointsToast.tsx — Toast animé "+N ⭐" pour Hēlo Points.
 *
 * Inspiré de GlowScoreDeltaToast (Lot 16-12) mais paramétré : on lui dit
 * "show +25 ⭐ avec ce label" et il anime. Pas de detection de delta — c'est
 * un push impératif depuis le code Ghost Capture quand award_points réussit.
 *
 * Usage :
 *   const toastRef = useRef<PointsToastHandle>(null);
 *   <PointsToast ref={toastRef} />
 *   toastRef.current?.show({ points: 25, label: 'Photo des ingrédients' });
 *
 * Pourquoi un imperative handle plutôt que props : Ghost Capture déclenche
 * plusieurs toasts en cascade (photo INCI + bonus complétude + 1ère contrib).
 * En props on aurait race conditions. handle.show() est queue-safe.
 */
import * as Haptics from 'expo-haptics';
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export interface PointsToastHandle {
  show: (params: { points: number; label?: string; bonus?: boolean }) => void;
}

interface ToastItem {
  id: number;
  points: number;
  label: string;
  bonus: boolean;
}

let toastIdSeq = 0;

export const PointsToast = forwardRef<PointsToastHandle>((_props, ref) => {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [active, setActive] = useState<ToastItem | null>(null);

  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const dismiss = useCallback(() => {
    setActive(null);
  }, []);

  const playAnimation = useCallback(
    (item: ToastItem) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      opacity.value = 0;
      translateY.value = 30;
      scale.value = 0.85;

      opacity.value = withSequence(
        withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withDelay(
          1800,
          withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (done) => {
            if (done) runOnJS(dismiss)();
          }),
        ),
      );
      translateY.value = withSequence(
        withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withDelay(
          1800,
          withTiming(-18, { duration: 320, easing: Easing.in(Easing.cubic) }),
        ),
      );
      scale.value = withSequence(
        withTiming(1.12, { duration: 220, easing: Easing.out(Easing.back(1.6)) }),
        withDelay(
          80,
          withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
        ),
      );
    },
    [dismiss, opacity, scale, translateY],
  );

  useImperativeHandle(
    ref,
    () => ({
      show: (params) => {
        const item: ToastItem = {
          id: ++toastIdSeq,
          points: params.points,
          label: params.label ?? '',
          bonus: params.bonus ?? false,
        };
        setQueue((q) => [...q, item]);
      },
    }),
    [],
  );

  // Process queue
  React.useEffect(() => {
    if (active || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setActive(next);
    playAnimation(next);
  }, [queue, active, playAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!active) return null;

  const isBonus = active.bonus;
  const bgColor = isBonus ? '#FFE0B2' : Colors.safeBg;
  const fgColor = isBonus ? '#E65100' : Colors.safe;
  const emoji = isBonus ? '🎁' : '⭐';

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, animatedStyle]}>
      <View style={[styles.pill, { backgroundColor: bgColor }]}>
        <ThemedText style={[styles.pointsText, { color: fgColor }]}>
          +{active.points} {emoji}
        </ThemedText>
        {active.label ? (
          <ThemedText style={[styles.labelText, { color: fgColor }]}>
            {active.label}
          </ThemedText>
        ) : null}
      </View>
    </Animated.View>
  );
});

PointsToast.displayName = 'PointsToast';

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    zIndex: 1000,
  },
  pill: {
    paddingHorizontal: Spacing.lg + 4,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  pointsText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
});
