// ─── Résultats Scan d'Étagère ──────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  DimensionValue,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { logError } from '@/lib/logger';
import { ShareBottomSheet } from '@/components/share/ShareBottomSheet';
import { ShelfScanShareCard } from '@/components/share/ShelfScanShareCard';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ShelfDetectedProduct } from '@/lib/visionScan';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const { width: W } = Dimensions.get('window');
const PHOTO_HEIGHT = W * (9 / 16);
const SHELF_KEY = STORAGE_KEYS.shelf;

const ROOMS = [
  'Salle de bain',
  'Cuisine',
  'Chambre',
  'Salon',
  'Bureau',
  'Pharmacie',
] as const;

type Verdict = 'safe' | 'caution' | 'danger' | 'unverified';

interface AnalyzedProduct extends ShelfDetectedProduct {
  verdict: Verdict;
  dotColor: string;
  dotX: number;
  dotY: number;
}

function verdictColor(v: Verdict): string {
  switch (v) {
    case 'safe': return Colors.safe;
    case 'caution': return Colors.caution;
    case 'danger': return Colors.danger;
    default: return Colors.textTertiary;
  }
}

function verdictLabel(v: Verdict): string {
  switch (v) {
    case 'safe': return 'Compatible';
    case 'caution': return 'Vigilance';
    case 'danger': return 'À éviter';
    default: return 'Non évalué';
  }
}

async function lookupProductInSupabase(name: string, brand: string): Promise<Verdict> {
  if (!isSupabaseConfigured) return 'unverified';

  try {
    const searchTerm = `%${name.toLowerCase()}%`;
    const { data } = await supabase
      .from('products')
      .select('verdict')
      .or(`name.ilike.${searchTerm},brand.ilike.%${brand.toLowerCase()}%`)
      .limit(1);

    if (data && data.length > 0 && data[0]?.verdict) {
      const v = data[0].verdict as string;
      if (v === 'safe' || v === 'caution' || v === 'danger') return v;
    }
  } catch (err) {
    // silent
    logError('shelfResults.fetchVerdict', err);
  }
  return 'unverified';
}

function distributeDotsUniformly(count: number): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  const cols = Math.ceil(Math.sqrt(count * 1.5));
  const rows = Math.ceil(count / cols);
  const positions: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (positions.length >= count) break;
      const x = (c + 0.5) / cols;
      const y = (r + 0.5) / rows;
      const jitterX = (Math.random() - 0.5) * 0.08;
      const jitterY = (Math.random() - 0.5) * 0.08;
      positions.push({
        x: Math.min(0.92, Math.max(0.08, x + jitterX)),
        y: Math.min(0.92, Math.max(0.08, y + jitterY)),
      });
    }
  }
  return positions;
}

function RoomPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (room: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <ThemedText variant="headlineMedium" style={modal.title}>
            Choisir une pièce
          </ThemedText>
          {ROOMS.map((room) => (
            <TouchableOpacity
              key={room}
              style={modal.roomRow}
              onPress={() => onSelect(room)}
              activeOpacity={0.7}
            >
              <Feather name="home" size={18} color={Colors.textSecondary} />
              <ThemedText variant="bodyMedium" color="textPrimary" style={{ flex: 1 }}>
                {room}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ShelfResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    products?: string;
    photoBase64?: string;
    error?: string;
  }>();

  const [products, setProducts] = useState<AnalyzedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [addedToShelf, setAddedToShelf] = useState(false);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dotsRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    if (params.error) {
      setError(params.error);
      setLoading(false);
      return;
    }

    const rawProducts: ShelfDetectedProduct[] = JSON.parse(params.products ?? '[]');

    if (params.photoBase64) {
      const decoded = decodeURIComponent(params.photoBase64);
      setPhotoUri(`data:image/jpeg;base64,${decoded}`);
    }

    dotsRef.current = distributeDotsUniformly(rawProducts.length);

    async function analyze() {
      const analyzed = await Promise.all(
        rawProducts.map(async (p, i) => {
          const verdict = await lookupProductInSupabase(p.name, p.brand);
          const dot = dotsRef.current[i] ?? { x: 0.5, y: 0.5 };
          const product: AnalyzedProduct = {
            ...p,
            verdict,
            dotColor: verdictColor(verdict),
            dotX: dot.x,
            dotY: dot.y,
          };
          return product;
        }),
      );
      setProducts(analyzed);
      setLoading(false);
    }

    analyze();
  }, []);

  const safeCount = useMemo(
    () => products.filter((p) => p.verdict === 'safe').length,
    [products],
  );

  const handleAddAllToShelf = useCallback(async (room: string) => {
    setRoomPickerVisible(false);
    if (products.length === 0) return;
    try {
      const rawShelf = await AsyncStorage.getItem(SHELF_KEY) ?? '[]';
      const existing: unknown[] = JSON.parse(rawShelf);
      const existingNames = new Set(
        (existing as Array<{ productName?: string }>).map((e) => e.productName).filter(Boolean),
      );
      const newItems = products
        .filter((p) => !existingNames.has(p.name))
        .map((p) => ({
          productName: p.name,
          brand: p.brand,
          category: room.toLowerCase().replace(/\s/g, '-'),
          verdict: p.verdict === 'unverified' ? 'safe' : p.verdict,
          savedAt: Date.now(),
          fromShelfScan: true,
        }));
      const merged = [...existing, ...newItems];
      await AsyncStorage.setItem(SHELF_KEY, JSON.stringify(merged));
      setAddedToShelf(true);
      Alert.alert(
        'Placard mis à jour',
        `${newItems.length} produit${newItems.length > 1 ? 's' : ''} ajouté${newItems.length > 1 ? 's' : ''} au placard (${room}).`,
        [{ text: 'OK' }],
      );
    } catch (err) {
      logError('shelfResults.addToShelf', err);
      Alert.alert('Erreur', "Impossible d'ajouter les produits au placard.");
    }
  }, [products]);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <View style={styles.loadingRoot}>
          <ThemedText variant="bodyMedium" color="textSecondary">
            Vérification des produits…
          </ThemedText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background, paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.errorCenter}>
          <View style={styles.errorIcon}>
            <Feather name="layers" size={36} color={Colors.danger} />
          </View>
          <ThemedText variant="headlineMedium" style={{ textAlign: 'center', marginBottom: Spacing.md }}>
            Analyse échouée
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.xxxl }}>
            {error}
          </ThemedText>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace(ROUTES.shelfScan)}>
            <ThemedText style={styles.retryBtnText}>Réessayer</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Share modal */}
      {shareVisible && (
        <ShareBottomSheet
          visible={shareVisible}
          onClose={() => setShareVisible(false)}
          card={
            <ShelfScanShareCard
              safeCount={safeCount}
              total={products.length}
              products={products.map((p) => ({ name: p.name, verdict: p.verdict }))}
            />
          }
        />
      )}

      {/* Room picker */}
      <RoomPickerModal
        visible={roomPickerVisible}
        onClose={() => setRoomPickerVisible(false)}
        onSelect={handleAddAllToShelf}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="headlineMedium">Étagère analysée</ThemedText>
        <TouchableOpacity onPress={() => setShareVisible(true)} hitSlop={12} style={styles.headerBtn}>
          <Feather name="share-2" size={20} color={Colors.accent} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          <View style={styles.scoreRow}>
            <ThemedText style={styles.scoreNumber}>{safeCount}</ThemedText>
            <ThemedText style={styles.scoreSlash}>/</ThemedText>
            <ThemedText style={styles.scoreTotal}>{products.length}</ThemedText>
            <ThemedText style={styles.scoreLabel}>compatibles</ThemedText>
          </View>
        </Animated.View>

        {/* Photo with dots overlay */}
        {photoUri && products.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(350)}
            style={styles.photoContainer}
          >
            <Image
              source={{ uri: photoUri }}
              style={styles.photo}
              resizeMode="cover"
            />
            {products.map((p, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.delay(200 + i * 40).duration(300)}
                style={[
                  styles.dot,
                  {
                    left: `${p.dotX * 100}%` as DimensionValue,
                    top: `${p.dotY * 100}%` as DimensionValue,
                    backgroundColor: p.dotColor,
                  },
                ]}
              />
            ))}
          </Animated.View>
        )}

        {/* Disclaimer */}
        <Animated.View entering={FadeInDown.delay(150).duration(350)}>
          <View style={styles.disclaimer}>
            <Feather name="alert-circle" size={14} color={Colors.caution} />
            <ThemedText style={styles.disclaimerText}>
              Résultats approximatifs — scannez individuellement pour plus de précision.
            </ThemedText>
          </View>
        </Animated.View>

        {/* Products list */}
        <View style={styles.section}>
          <ThemedText variant="labelLarge" color="textSecondary" style={styles.sectionLabel}>
            PRODUITS DÉTECTÉS ({products.length})
          </ThemedText>
          {products.length === 0 && (
            <Card padding={Spacing.xl}>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
                Aucun produit identifié. Réessayez avec une meilleure lumière et une photo plus nette.
              </ThemedText>
            </Card>
          )}
          {products.map((p, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(200 + i * 40).duration(280)}
            >
              <Card style={styles.productCard} padding={Spacing.lg}>
                <View
                  style={[
                    styles.productDot,
                    { backgroundColor: p.dotColor + '22', borderColor: p.dotColor + '55' },
                  ]}
                >
                  <View style={[styles.productDotInner, { backgroundColor: p.dotColor }]} />
                </View>
                <View style={styles.productInfo}>
                  <ThemedText variant="labelLarge" numberOfLines={1}>{p.name}</ThemedText>
                  {p.brand ? (
                    <ThemedText variant="bodySmall" color="textTertiary">{p.brand}</ThemedText>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.verdictBadge,
                    {
                      backgroundColor: p.dotColor + '22',
                      borderColor: p.dotColor + '55',
                    },
                  ]}
                >
                  <ThemedText style={[styles.verdictBadgeText, { color: p.dotColor }]}>
                    {verdictLabel(p.verdict)}
                  </ThemedText>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity
          style={[styles.addBtn, addedToShelf && styles.addBtnDone]}
          onPress={() => setRoomPickerVisible(true)}
          activeOpacity={0.85}
          disabled={addedToShelf || products.length === 0}
        >
          <Feather
            name={addedToShelf ? 'check' : 'archive'}
            size={18}
            color={addedToShelf ? Colors.safe : Colors.textPrimary}
          />
          <ThemedText style={[styles.addBtnText, addedToShelf ? { color: Colors.safe } : undefined]}>
            {addedToShelf ? 'Ajouté au placard' : 'Tout ajouter au placard'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.retrySmallBtn}
          onPress={() => router.replace(ROUTES.shelfScan)}
          activeOpacity={0.85}
        >
          <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
          <ThemedText style={styles.retrySmallBtnText}>Nouveau scan</ThemedText>
        </TouchableOpacity>

        {/* Permanent disclaimer bottom */}
        <View style={styles.disclaimerBottom}>
          <Feather name="info" size={12} color={Colors.textTertiary} />
          <ThemedText style={styles.disclaimerBottomText}>
            Résultats approximatifs — scannez individuellement pour plus de précision.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  retryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  backRow: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { padding: Spacing.xs, width: 36, alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, gap: Spacing.xl },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.safe,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 60,
  },
  scoreSlash: {
    fontSize: 36,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  scoreTotal: {
    fontSize: 36,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginLeft: 4,
    alignSelf: 'flex-end',
    paddingBottom: 4,
  },

  photoContainer: {
    width: W - Spacing.xl * 2,
    height: PHOTO_HEIGHT,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.medium,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    marginTop: -8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.soft,
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cautionBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cautionLight,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.caution,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 17,
  },

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
  productDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    ...Shadows.soft,
  },
  addBtnDone: {
    backgroundColor: Colors.safeLight,
    borderWidth: 1,
    borderColor: Colors.safe + '55',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  retrySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  retrySmallBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  disclaimerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  disclaimerBottomText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
    flex: 1,
  },
});

const modal = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
