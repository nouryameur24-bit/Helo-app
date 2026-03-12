import React from 'react';
import {
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

type ScanStatus = 'safe' | 'caution' | 'danger';

interface ScanItem {
  id: string;
  name: string;
  brand: string;
  status: ScanStatus;
  statusLabel: string;
  time: string;
  ingredientCount: number;
}

const HISTORY_DATA: { title: string; data: ScanItem[] }[] = [
  {
    title: "Aujourd'hui",
    data: [
      { id: '1', name: 'Crème hydratante Nuxe', brand: 'NUXE', status: 'safe', statusLabel: 'Sûr', time: '14h32', ingredientCount: 12 },
      { id: '2', name: 'Shampooing doux', brand: 'KLORANE', status: 'caution', statusLabel: 'Vigilance', time: '10h15', ingredientCount: 8 },
      { id: '3', name: 'Gel douche aloe vera', brand: 'GARNIER', status: 'safe', statusLabel: 'Sûr', time: '09h44', ingredientCount: 9 },
    ],
  },
  {
    title: 'Hier',
    data: [
      { id: '4', name: 'Sérum vitamine C', brand: 'VICHY', status: 'safe', statusLabel: 'Sûr', time: '20h12', ingredientCount: 15 },
      { id: '5', name: 'Fond de teint Bourjois', brand: 'BOURJOIS', status: 'danger', statusLabel: 'Déconseillé', time: '16h07', ingredientCount: 22 },
    ],
  },
  {
    title: '10 mars',
    data: [
      { id: '6', name: 'Lait corporel Bioderma', brand: 'BIODERMA', status: 'safe', statusLabel: 'Sûr', time: '11h23', ingredientCount: 7 },
    ],
  },
];

const statusIconMap: Record<ScanStatus, { icon: 'check-circle' | 'alert-circle' | 'x-circle'; color: string; bg: string }> = {
  safe: { icon: 'check-circle', color: Colors.safe, bg: Colors.safeBg },
  caution: { icon: 'alert-circle', color: Colors.caution, bg: Colors.cautionBg },
  danger: { icon: 'x-circle', color: Colors.danger, bg: Colors.dangerBg },
};

function ScanRow({ item }: { item: ScanItem }) {
  const { icon, color, bg } = statusIconMap[item.status];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.rowContent}>
        <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary">
          {item.brand} · {item.time}
        </ThemedText>
      </View>
      <Badge variant={item.status}>{item.statusLabel}</Badge>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <SectionList
        sections={HISTORY_DATA}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: topPadding + Spacing.lg,
          paddingBottom: bottomPadding + 120,
          paddingHorizontal: Spacing.xl,
          gap: 0,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.listHeader}>
            <ThemedText variant="headlineLarge" color="textPrimary">Historique</ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
              {HISTORY_DATA.reduce((acc, s) => acc + s.data.length, 0)} produits scannés
            </ThemedText>
          </Animated.View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <ThemedText variant="labelSmall" color="textTertiary">{section.title}</ThemedText>
          </View>
        )}
        renderItem={({ item }) => <ScanRow item={item} />}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: Colors.borderLight, marginLeft: 72 }} />
        )}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listHeader: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
});
