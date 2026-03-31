import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Radius, Shadows } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  haptic?: boolean;
  variant?: 'default' | 'elevated';
  disabled?: boolean;
}

export const PressableCard = React.memo(function PressableCard({
  children,
  onPress,
  style,
  padding = 16,
  haptic = true,
  variant = 'default',
  disabled = false,
}: PressableCardProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    translateY.value = withSpring(-1, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <AnimatedPressable
      style={[
        styles.base,
        variant === 'elevated' ? Shadows.medium : Shadows.soft,
        { padding },
        style,
        animStyle,
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      {children}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
  },
  disabled: {
    opacity: 0.6,
  },
});
