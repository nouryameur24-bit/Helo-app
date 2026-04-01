import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import type { RenderItem } from './arMirrorTypes';
import { VERDICT_COLOR, VERDICT_EMOJI } from './arMirrorTypes';
import styles from './arMirrorStyles';

interface HaloProps {
  item: RenderItem;
}

function Halo({ item }: HaloProps) {
  const color = item.lookup ? VERDICT_COLOR[item.lookup.verdict] : Colors.textTertiary;
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900 }),
        withTiming(1.0, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: item.opacity,
  }));

  const haloSize = Math.max(70, Math.min(150, Math.max(item.w, item.h) + 28));
  const halfHalo = haloSize / 2;

  const labelText = item.lookup
    ? `${item.lookup.name.slice(0, 24)} ${VERDICT_EMOJI[item.lookup.verdict]}`
    : null;

  return (
    <Animated.View
      style={[
        styles.haloContainer,
        {
          left: item.x + item.w / 2 - halfHalo,
          top: item.y + item.h / 2 - halfHalo,
          width: haloSize,
          height: haloSize,
          opacity: item.opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.haloOuter,
          { borderColor: color, width: haloSize, height: haloSize, borderRadius: haloSize / 2 },
          pulseStyle,
        ]}
      />
      <View
        style={[
          styles.haloInner,
          {
            backgroundColor: color + '33',
            borderColor: color + 'CC',
            width: haloSize * 0.72,
            height: haloSize * 0.72,
            borderRadius: (haloSize * 0.72) / 2,
          },
        ]}
      />
      <View style={[styles.haloDot, { backgroundColor: color }]} />
      {labelText && (
        <View style={[styles.haloLabel, { borderColor: color + '99', backgroundColor: '#1A1A1A' + 'EE' }]}>
          <ThemedText style={[styles.haloLabelText, { color }]} numberOfLines={1}>
            {labelText}
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );
}

export default React.memo(Halo);
