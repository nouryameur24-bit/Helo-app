/**
 * ScanControls — ModeChip et ShutterButton.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

// ─── ModeChip ─────────────────────────────────────────────────────────────────
interface ModeChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function ModeChip({ label, active, onPress }: ModeChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[ctrl.chip, active ? ctrl.chipActive : ctrl.chipInactive]}
    >
      <Text style={[ctrl.chipText, { color: active ? '#fff' : Colors.textPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── ShutterButton ────────────────────────────────────────────────────────────
interface ShutterButtonProps {
  onPress: () => void;
}

export function ShutterButton({ onPress }: ShutterButtonProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.9, { duration: 80 }), withTiming(1, { duration: 120 }));
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={[ctrl.shutter, style]}>
        <View style={ctrl.shutterInner}>
          <Feather name="camera" size={26} color="#fff" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const ctrl = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    // iOS HIG / Material Design : 44pt minimum touch target. Important pour
    // les utilisatrices enceintes (motricité fine altérée en T3) qui pourraient
    // rater un mode tap si la chip est trop petite verticalement.
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.accent },
  chipInactive: { backgroundColor: 'rgba(255,255,255,0.82)' },
  chipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.bodySmall.fontSize,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
