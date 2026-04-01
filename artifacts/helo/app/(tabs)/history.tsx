import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type ScanStatus = 'safe' | 'caution' | 'danger';

interface ScanItem {
  id: string;
  name: string;
  brand: string;
  status: ScanStatus;
  statusLabel: string;
  time: string;
  date?: string;
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

function groupByDate(items: ScanItem[]): { title: string; data: ScanItem[] }[] {
  const groups: Record<string, ScanItem[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const d = item.date ? new Date(item.date) : null;
    let label = item.time;
    if (d) {
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) label = "Aujourd'hui";
      else if (d.getTime() === yesterday.getTime()) label = 'Hier';
      else label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const { role, userId, linkedUserId, linkedFirstName } = useProfile();
  const isPartner = role === 'partner';
  const historyUserId = isPartner && linkedUserId ? linkedUserId : userId;

  const [sections, setSections] = useState<{ title: string; data: ScanItem[] }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!historyUserId) return;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('scan_history')
          .select('id, verdict_at_shelf_add, scanned_at, products(name, brand)')
          .eq('user_id', historyUserId)
          .order('scanned_at', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          type HistRow = {
            id: string;
            verdict_at_shelf_add: string | null;
            scanned_at: string;
            products: { name: string | null; brand: string | null } | { name: string | null; brand: string | null }[] | null;
          };
          const items: ScanItem[] = (data as unknown as HistRow[]).map((row) => {
            const prod = Array.isArray(row.products) ? row.products[0] : row.products;
            return {
              id: String(row.id),
              name: prod?.name ?? 'Produit',
              brand: prod?.brand ?? '',
              status: (row.verdict_at_shelf_add ?? 'safe') as ScanStatus,
              statusLabel:
                row.verdict_at_shelf_add === 'danger'
                  ? 'Déconseillé'
                  : row.verdict_at_shelf_add === 'caution'
                  ? 'Vigilance'
                  : 'Sûr',
              time: new Date(row.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              date: row.scanned_at,
              ingredientCount: 0,
            };
          });
          setSections(groupByDate(items));
          setTotalCount(items.length);
          return;
        }
      } catch {
      }
    }

    try {
      const raw = await AsyncStorage.getItem('@helo_shelf') ?? '[]';
      const all = JSON.parse(raw) as Array<{
        barcode?: string;
        productName?: string;
        brand?: string;
        verdict?: string;
        savedAt?: number;
        userId?: string;
      }>;
      const filtered = all.filter((i) => !i.userId || i.userId === historyUserId);
      const items: ScanItem[] = filtered.map((i, idx) => ({
        id: i.barcode ?? String(idx),
        name: i.productName ?? 'Produit',
        brand: i.brand ?? '',
        status: (i.verdict ?? 'safe') as ScanStatus,
        statusLabel:
          i.verdict === 'danger' ? 'Déconseillé' : i.verdict === 'caution' ? 'Vigilance' : 'Sûr',
        time: i.savedAt
          ? new Date(i.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : '',
        date: i.savedAt ? new Date(i.savedAt).toISOString() : '',
        ingredientCount: 0,
      }));
      setSections(groupByDate(items));
      setTotalCount(items.length);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [historyUserId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const headerTitle = isPartner
    ? `Historique de ${linkedFirstName ?? 'votre proche'}`
    : 'Historique';

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <SectionList
        sections={sections}
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
            <ThemedText variant="headlineLarge" color="textPrimary">{headerTitle}</ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
              {isLoading ? 'Chargement…' : `${totalCount} produit${totalCount !== 1 ? 's' : ''} scann${totalCount !== 1 ? 'és' : 'é'}`}
            </ThemedText>
          </Animated.View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyIcon}>📋</ThemedText>
              <ThemedText variant="headlineMedium" color="textPrimary" style={styles.emptyTitle}>
                Aucun scan pour l'instant
              </ThemedText>
              <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptyBody}>
                Vos scans apparaîtront ici après votre première analyse.
              </ThemedText>
            </View>
          ) : null
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    lineHeight: 60,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
