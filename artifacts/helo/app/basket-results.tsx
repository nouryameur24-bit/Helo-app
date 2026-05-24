// ─── Résultats Mon Panier ─────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { loadLatestBasket, type BasketItem } from '@/lib/basket';
import { calculateGlowScore } from '@/lib/glowscore';
import { calculateTrimester } from '@/lib/trimester';
import { syncWidgetData, reloadWidgets } from '@/lib/widgetStorage';
import type { Verdict } from '@/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const SHELF_KEY = STORAGE_KEYS.shelf;

const VERDICT_COLORS: Record<Verdict, string> = {
  safe: Colors.safe,
  caution: Colors.caution,
  danger: Colors.danger,
};
const VERDICT_ICONS: Record<Verdict, keyof typeof Feather.glyphMap> = {
  safe: 'check-circle',
  caution: 'alert-triangle',
  danger: 'x-circle',
};
const VERDICT_BG: Record<Verdict, string> = {
  safe: Colors.safeBg,
  caution: Colors.cautionBg,
  danger: Colors.dangerBg,
};

// ─── Color bar ────────────────────────────────────────────────────────────────

function ColorBar({ safe, caution, danger, total }: {
  safe: number; caution: number; danger: number; total: number;
}) {
  if (total === 0) return null;
  return (
    <View style={styles.colorBar}>
      {safe > 0 && (
        <View style={[styles.barSegment, { flex: safe, backgroundColor: Colors.safe, borderRadius: Radius.sm }]} />
      )}
      {caution > 0 && (
        <View style={[styles.barSegment, { flex: caution, backgroundColor: Colors.caution }]} />
      )}
      {danger > 0 && (
        <View style={[styles.barSegment, { flex: danger, backgroundColor: Colors.danger, borderRadius: Radius.sm }]} />
      )}
    </View>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ item, index }: { item: BasketItem; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(ROUTES.verdict(item.scanId))}
      >
        <Card style={styles.productCard} padding={Spacing.lg}>
          <View style={[styles.productIcon, { backgroundColor: VERDICT_BG[item.verdict] }]}>
            <Feather
              name={VERDICT_ICONS[item.verdict]}
              size={18}
              color={VERDICT_COLORS[item.verdict]}
            />
          </View>
          <View style={styles.productInfo}>
            <ThemedText variant="labelLarge" numberOfLines={1}>{item.name}</ThemedText>
            {item.brand ? (
              <ThemedText variant="bodySmall" color="textTertiary">{item.brand}</ThemedText>
            ) : null}
          </View>
          <View style={[
            styles.verdictBadge,
            { backgroundColor: VERDICT_COLORS[item.verdict] + '22', borderColor: VERDICT_COLORS[item.verdict] + '55' },
          ]}>
            <ThemedText style={[styles.verdictBadgeText, { color: VERDICT_COLORS[item.verdict] }]}>
              {item.verdictLabel}
            </ThemedText>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BasketResultsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedToShelf, setAddedToShelf] = useState(false);

  useEffect(() => {
    (async () => {
      const basket = await loadLatestBasket();
      setItems(basket?.items ?? []);
      setLoading(false);
    })();
  }, []);

  const safeCount = items.filter((i) => i.verdict === 'safe').length;
  const cautionCount = items.filter((i) => i.verdict === 'caution').length;
  const dangerCount = items.filter((i) => i.verdict === 'danger').length;

  // ── Add all to shelf ──────────────────────────────────────────────────────
  const handleAddAllToShelf = useCallback(async () => {
    if (items.length === 0) return;
    try {
      const rawShelf = await AsyncStorage.getItem(SHELF_KEY) ?? '[]';
      const existing: unknown[] = JSON.parse(rawShelf);
      const existingBarcodes = new Set(
        (existing as Array<{ barcode?: string }>).map((e) => e.barcode).filter(Boolean),
      );
      const newItems = items
        .filter((i) => !existingBarcodes.has(i.barcode))
        .map((i) => ({
          barcode: i.barcode,
          productName: i.name,
          brand: i.brand,
          verdict: i.verdict,
          savedAt: Date.now(),
        }));
      const merged = [...existing, ...newItems];
      await AsyncStorage.setItem(SHELF_KEY, JSON.stringify(merged));
      setAddedToShelf(true);
      Alert.alert(
        'Placard mis à jour',
        `${newItems.length} produit${newItems.length > 1 ? 's' : ''} ajouté${newItems.length > 1 ? 's' : ''} à votre placard.`,
        [{ text: 'OK' }],
      );
      // Sync widget after bulk shelf add
      try {
        const { score } = calculateGlowScore(
          (merged as Array<{ verdict?: string }>).map((i, idx) => ({
            id: String(idx),
            name: '',
            brand: '',
            verdict: (i.verdict ?? 'safe') as 'safe' | 'caution' | 'danger',
            verdictLabel: '',
            category: 'salle-de-bain' as const,
            verdictChanged: false,
          })),
        );
        const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
        let weekOfPregnancy = 20;
        let trimesterNum = 2;
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          if (profile.dueDate) {
            const info = calculateTrimester(profile.dueDate);
            weekOfPregnancy = info.weekOfPregnancy;
            trimesterNum = info.trimester;
          }
        }
        await syncWidgetData({ glowScore: score, weekOfPregnancy, trimester: trimesterNum });
        await reloadWidgets();
      } catch {
        // Widget sync failure is non-critical — home screen widget falls back to last known data
      }
    } catch {
      // Shelf read/write failure — basket results still shown, widget update skipped
    }
  }, [items]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (items.length === 0) return;
    let text = `🛒 Mon Panier — Hēlo\n`;
    text += `${items.length} produits analysés · ${safeCount} compatibles · ${cautionCount + dangerCount} à vérifier\n\n`;
    if (safeCount > 0) {
      text += `✅ Compatibles :\n${items.filter(i => i.verdict === 'safe').map(i => `• ${i.name}`).join('\n')}\n\n`;
    }
    if (cautionCount > 0) {
      text += `⚠ À vérifier :\n${items.filter(i => i.verdict === 'caution').map(i => `• ${i.name}`).join('\n')}\n\n`;
    }
    if (dangerCount > 0) {
      text += `❌ Déconseillés :\n${items.filter(i => i.verdict === 'danger').map(i => `• ${i.name}`).join('\n')}\n\n`;
    }
    text += `Analysé avec Hēlo — l'app grossesse & sécurité produits`;
    try {
      await Share.share({ message: text });
    } catch {
      // Share not supported in web renderer — no-op for native mobile app
    }
  }, [items, safeCount, cautionCount, dangerCount]);

  if (loading) return <View style={[styles.root, { backgroundColor: Colors.background }]} />;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Header (Lot 15B3) — Back via router.replace pour sortir proprement
          du double-modal basket-scan + basket-results. Avant : `router.back()`
          unwind les deux modals d'un coup et jetait l'utilisatrice à l'accueil.
          Maintenant : retour explicite vers /(tabs) + titre enrichi avec le
          compteur "Mon Panier · X produits". */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Fermer et retourner à l'accueil"
        >
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText variant="headlineMedium">Mon Panier</ThemedText>
          {items.length > 0 && (
            <ThemedText variant="bodySmall" color="textTertiary">
              {items.length} produit{items.length > 1 ? 's' : ''} analysé{items.length > 1 ? 's' : ''}
            </ThemedText>
          )}
        </View>
        <TouchableOpacity onPress={handleShare} hitSlop={12} style={styles.shareBtn}>
          <Feather name="share-2" size={20} color={Colors.accent} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score card */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          <View style={styles.scoreCard}>
            <ThemedText style={styles.scoreNumber}>{safeCount}</ThemedText>
            <ThemedText style={styles.scoreSlash}>/</ThemedText>
            <ThemedText style={styles.scoreTotal}>{items.length}</ThemedText>
            <ThemedText style={styles.scoreLabel}>compatibles</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg }}>
            <Feather name="info" size={11} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ fontStyle: 'italic', fontSize: 11, textAlign: 'center' }}>
              Analyse basée sur les données CRAT, ANSM, EFSA
            </ThemedText>
          </View>
        </Animated.View>

        {/* Color bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.barSection}>
          <ColorBar safe={safeCount} caution={cautionCount} danger={dangerCount} total={items.length} />
          <View style={styles.barLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.safe }]} />
              <ThemedText variant="bodySmall" color="textSecondary">{safeCount} sûr{safeCount > 1 ? 's' : ''}</ThemedText>
            </View>
            {cautionCount > 0 && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.caution }]} />
                <ThemedText variant="bodySmall" color="textSecondary">{cautionCount} vigilance</ThemedText>
              </View>
            )}
            {dangerCount > 0 && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
                <ThemedText variant="bodySmall" color="textSecondary">{dangerCount} déconseillé{dangerCount > 1 ? 's' : ''}</ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Product list */}
        <View style={styles.section}>
          <ThemedText variant="labelLarge" color="textSecondary" style={styles.sectionLabel}>
            PRODUITS SCANNÉS
          </ThemedText>
          {items.map((item, i) => (
            <ProductCard key={item.barcode} item={item} index={i} />
          ))}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity
          style={[styles.addShelfBtn, addedToShelf && styles.addShelfBtnDone]}
          onPress={handleAddAllToShelf}
          activeOpacity={0.85}
          disabled={addedToShelf}
        >
          <Feather name={addedToShelf ? 'check' : 'archive'} size={18} color={addedToShelf ? Colors.safe : Colors.textPrimary} />
          <ThemedText style={[styles.addShelfBtnText, addedToShelf && { color: Colors.safe }]}>
            {addedToShelf ? 'Ajouté au placard' : 'Tout ajouter au placard'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newScanBtn}
          onPress={() => router.replace('/basket-scan')}
          activeOpacity={0.85}
        >
          <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
          <ThemedText style={styles.newScanBtnText}>Nouveau panier</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  shareBtn: { padding: Spacing.xs },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl },

  // Score
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.safe,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 64,
  },
  scoreSlash: {
    fontSize: 40,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  scoreTotal: {
    fontSize: 40,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  scoreLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginLeft: 4,
    alignSelf: 'flex-end',
    paddingBottom: 6,
  },

  // Color bar
  barSection: { marginBottom: Spacing.xxl },
  colorBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
    gap: 2,
    marginBottom: Spacing.sm,
  },
  barSegment: { minWidth: 4 },
  barLegend: {
    flexDirection: 'row',
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  // Product list
  section: { gap: Spacing.sm },
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productInfo: { flex: 1 },
  verdictBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    flexShrink: 0,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Actions
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  addShelfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    ...Shadows.soft,
  },
  addShelfBtnDone: {
    backgroundColor: Colors.safeLight,
    borderWidth: 1,
    borderColor: Colors.safe + '55',
  },
  addShelfBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  newScanBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
