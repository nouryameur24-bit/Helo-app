import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import type { CachedLookup } from './arMirrorTypes';
import { VERDICT_COLOR, VERDICT_EMOJI, VERDICT_LABEL_FR } from './arMirrorTypes';
import styles from './arMirrorStyles';

interface QuickScanResultProps {
  lookup: CachedLookup | null;
  barcode: string;
  onDismiss: () => void;
}

function QuickScanResult({ lookup, barcode, onDismiss }: QuickScanResultProps) {
  const color = lookup ? VERDICT_COLOR[lookup.verdict] : Colors.textTertiary;
  const label = lookup ? VERDICT_LABEL_FR[lookup.verdict] : 'Non scanné';
  const emoji = lookup ? VERDICT_EMOJI[lookup.verdict] : '?';

  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={styles.quickResult}>
      <View style={[styles.quickEmoji, { backgroundColor: color + '33', borderColor: color }]}>
        <ThemedText style={[styles.quickEmojiText, { color }]}>{emoji}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.quickName} numberOfLines={1}>
          {lookup?.name ?? barcode}
        </ThemedText>
        {lookup?.brand ? (
          <ThemedText style={[styles.quickLabel, { color }]}>{label} · {lookup.brand}</ThemedText>
        ) : (
          <ThemedText style={[styles.quickLabel, { color: Colors.textTertiary }]}>
            {lookup ? label : 'Produit non trouvé dans le cache'}
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
}

export default React.memo(QuickScanResult);
