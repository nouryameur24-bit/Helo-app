import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { ThemedText } from '@/components/ui/ThemedText';
import type { ShelfProduct } from '@/components/shelf/ShelfCard';
import { Colors, Spacing } from '@/constants/theme';
import { ROUTES } from '@/types/routes';
import { styles } from './homeStyles';

type SafeBadgeVariant = 'safe' | 'caution' | 'danger' | 'accent';

const STATUS_COLORS: Record<string, { bg: string; accent: string; icon: 'check-circle' | 'alert-circle' | 'x-circle' | 'help-circle' }> = {
  safe:    { bg: Colors.safeBg,     accent: Colors.safe,         icon: 'check-circle' },
  caution: { bg: Colors.cautionBg,  accent: Colors.caution,      icon: 'alert-circle' },
  danger:  { bg: Colors.dangerBg,   accent: Colors.danger,       icon: 'x-circle'     },
  unknown: { bg: Colors.background, accent: Colors.textTertiary, icon: 'help-circle'  },
};

function verdictToBadge(v: string): SafeBadgeVariant {
  if (v === 'safe' || v === 'caution' || v === 'danger') return v;
  return 'accent';
}

function ScanCard({ item, index }: { item: ShelfProduct; index: number }) {
  const { bg, accent, icon } = STATUS_COLORS[item.verdict] ?? STATUS_COLORS.unknown;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          styles.scanCard,
          { backgroundColor: Colors.surface, opacity: pressed ? 0.9 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.verdictLabel}`}
      >
        <View style={[styles.scanCardIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={20} color={accent} />
        </View>
        <View style={styles.scanCardContent}>
          <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary">
            {item.brand}
          </ThemedText>
        </View>
        <Badge variant={verdictToBadge(item.verdict)}>{item.verdictLabel}</Badge>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  shelf: ShelfProduct[];
}

export const HomeRecentScans = React.memo(function HomeRecentScans({ shelf }: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(320).duration(500)}>
      <View style={styles.sectionHeader}>
        <ThemedText variant="headlineMedium" color="textPrimary">Récents</ThemedText>
        <Pressable
          onPress={() => router.push(ROUTES.history)}
          accessibilityRole="button"
          accessibilityLabel="Voir l'historique complet"
        >
          <ThemedText variant="labelLarge" color="accent">Voir l&apos;historique</ThemedText>
        </Pressable>
      </View>

      <View style={styles.scanList}>
        {shelf.length === 0 ? (
          <Pressable
            onPress={() => router.push('/scan')}
            style={[styles.scanCard, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xl }]}
            accessibilityRole="button"
            accessibilityLabel="Scanner votre premier produit"
          >
            <Feather name="camera" size={24} color={Colors.accent} />
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              Scannez votre premier produit
            </ThemedText>
          </Pressable>
        ) : (
          shelf.slice(0, 3).map((item, index) => (
            <ScanCard key={item.id} item={item} index={index} />
          ))
        )}
      </View>
    </Animated.View>
  );
});
