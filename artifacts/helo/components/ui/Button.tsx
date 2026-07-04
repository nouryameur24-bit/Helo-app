import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = 'primary',
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const containerStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
  ];

  const textStyle = [
    styles.label,
    variant === 'primary' && styles.primaryLabel,
    variant === 'secondary' && styles.secondaryLabel,
    variant === 'ghost' && styles.ghostLabel,
    (disabled || loading) && styles.disabledLabel,
  ];

  return (
    <AnimatedPressable
      style={[animatedStyle, containerStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : Colors.accent}
        />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...Typography.labelLarge,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: Colors.accent,
  },
  ghostLabel: {
    color: Colors.textSecondary,
  },
  disabledLabel: {
    opacity: 0.7,
  },
});
