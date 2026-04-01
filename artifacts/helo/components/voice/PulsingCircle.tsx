import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import styles from './voiceStyles';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'result' | 'error';

interface PulsingCircleProps {
  phase: VoicePhase;
}

function PulsingCircle({ phase }: PulsingCircleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    switch (phase) {
      case 'idle':
        scale.value = withRepeat(withSequence(
          withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ), -1, false);
        opacity.value = withRepeat(withSequence(
          withTiming(0.2, { duration: 1800 }),
          withTiming(0.1, { duration: 1800 }),
        ), -1);
        break;
      case 'listening':
        scale.value = withRepeat(withSequence(
          withTiming(1.22, { duration: 500, easing: Easing.out(Easing.ease) }),
          withTiming(1.05, { duration: 400, easing: Easing.in(Easing.ease) }),
        ), -1, false);
        opacity.value = withRepeat(withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(0.25, { duration: 400 }),
        ), -1);
        break;
      case 'thinking':
        scale.value = withRepeat(withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
        opacity.value = withRepeat(withTiming(0.3, { duration: 700 }), -1, true);
        break;
      case 'speaking':
        scale.value = withRepeat(withSequence(
          withTiming(1.12, { duration: 300 }),
          withTiming(1.0, { duration: 300 }),
          withTiming(1.08, { duration: 400 }),
          withTiming(1.0, { duration: 400 }),
        ), -1, false);
        opacity.value = withRepeat(withSequence(
          withTiming(0.35, { duration: 300 }),
          withTiming(0.15, { duration: 700 }),
        ), -1);
        break;
      case 'result':
      case 'error':
        scale.value = withTiming(1.0, { duration: 300 });
        opacity.value = withTiming(0.12, { duration: 300 });
        break;
    }
  }, [phase]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconColor =
    phase === 'listening' ? Colors.accent :
    phase === 'thinking' ? Colors.caution :
    phase === 'speaking' ? Colors.safe :
    phase === 'error' ? Colors.danger :
    Colors.accent;

  const innerBg =
    phase === 'listening' ? Colors.accent :
    phase === 'thinking' ? Colors.caution + 'CC' :
    phase === 'speaking' ? Colors.safe :
    phase === 'error' ? Colors.danger :
    Colors.surface;

  const iconName: 'mic' | 'loader' | 'volume-2' | 'check-circle' | 'alert-circle' =
    phase === 'listening' ? 'mic' :
    phase === 'thinking' ? 'loader' :
    phase === 'speaking' ? 'volume-2' :
    phase === 'result' ? 'check-circle' :
    phase === 'error' ? 'alert-circle' :
    'mic';

  return (
    <View style={styles.circleContainer}>
      <Animated.View style={[styles.ripple, { borderColor: Colors.accent }, rippleStyle]} />
      <View style={[styles.ring, { borderColor: Colors.accentLight }]} />
      <View style={[styles.coreCircle, { backgroundColor: innerBg }]}>
        <Feather name={iconName} size={36} color={phase === 'listening' ? Colors.surface : iconColor} />
      </View>
    </View>
  );
}

export default React.memo(PulsingCircle);
