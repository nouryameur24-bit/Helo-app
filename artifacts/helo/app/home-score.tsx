// ─── Score Environnement — Hēlo ──────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '@/types/routes';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { calculateGlowScore } from '@/lib/glowscore';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import type { ShelfProduct, ShelfCategory } from '@/components/shelf/ShelfCard';
import { STORAGE_KEYS, roomCelebratedKey } from '@/lib/storageKeys';

const { width: W, height: H } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const HOME_BADGE_KEY = STORAGE_KEYS.homeBadgeUnlocked;

const CONFETTI_COLORS = ['#C9A96E', '#E8D5B0', '#F5C842', '#FFD700', '#FFF8E1', '#D4AF6E'];
const PARTICLE_COUNT = 20;

// ─── Room definitions ─────────────────────────────────────────────────────────
export type RoomId = 'bathroom' | 'kitchen' | 'pharmacy' | 'nursery';

interface RoomDef {
  id: RoomId;
  emoji: string;
  name: string;
  categories: ShelfCategory[];
}

const ROOMS: RoomDef[] = [
  { id: 'bathroom', emoji: '🛁', name: 'Salle de bain', categories: ['salle-de-bain'] },
  { id: 'kitchen',  emoji: '🍳', name: 'Cuisine',        categories: ['cuisine'] },
  { id: 'pharmacy', emoji: '💊', name: 'Pharmacie',      categories: ['pharmacie'] },
  {
    id: 'nursery',
    emoji: '🛏️',
    name: 'Chambre bébé',
    categories: ['couches', 'lingettes-bebe', 'creme-change', 'lait-bebe', 'shampoing-bebe'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roomBg(score: number): string {
  if (score > 80) return Colors.safeBg;
  if (score >= 40) return Colors.cautionLight;
  return Colors.dangerLight;
}
function roomBorder(score: number): string {
  if (score > 80) return Colors.safeLight;
  if (score >= 40) return Colors.cautionLight;
  return Colors.dangerLight;
}
function scoreColor(score: number): string {
  if (score > 80) return Colors.safe;
  if (score >= 40) return Colors.caution;
  return Colors.danger;
}
function homeSummary(score: number): string {
  if (score > 80) return `Ta maison est safe à ${score}% 🏡`;
  if (score >= 40) return `Ta maison est safe à ${score}% — encore un effort !`;
  return `Ta maison nécessite attention — ${score}% safe`;
}

// ─── Confetti particle ────────────────────────────────────────────────────────
interface ParticleDot {
  x: number;
  delay: number;
  size: number;
  color: string;
  rotation: number;
}
function generateParticles(): ParticleDot[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: (Math.random() * 0.8 + 0.1) * W,
    delay: i * 60,
    size: 5 + Math.random() * 9,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
  }));
}
const PARTICLES = generateParticles();

function ConfettiParticle({ dot, visible }: { dot: ParticleDot; visible: boolean }) {
  const y = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      y.value = -20;
      opacity.value = 0;
      y.value = withDelay(dot.delay, withTiming(H * 0.65, { duration: 1400 }));
      opacity.value = withDelay(dot.delay, withTiming(1, { duration: 200 }));
      opacity.value = withDelay(dot.delay + 900, withTiming(0, { duration: 500 }));
    } else {
      y.value = -20;
      opacity.value = 0;
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dot.x,
    top: y.value,
    width: dot.size,
    height: dot.size,
    borderRadius: dot.size / 4,
    backgroundColor: dot.color,
    opacity: opacity.value,
    transform: [{ rotate: `${dot.rotation}deg` }],
  }));

  return <Animated.View pointerEvents="none" style={style} />;
}

function ConfettiOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((dot, i) => (
        <ConfettiParticle key={i} dot={dot} visible={visible} />
      ))}
    </View>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function RoomProgressBar({ score, color }: { score: number; color: string }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(score / 100, { duration: 800 });
  }, [score]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    backgroundColor: color,
    height: 4,
    borderRadius: 2,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={barStyle} />
    </View>
  );
}

// ─── Room card ────────────────────────────────────────────────────────────────
function RoomCard({
  room,
  products,
  onPress,
  index,
}: {
  room: RoomDef;
  products: ShelfProduct[];
  onPress: () => void;
  index: number;
}) {
  const { score, countSafe, total } = calculateGlowScore(products);
  const pct = total > 0 ? Math.round((countSafe / total) * 100) : 0;
  const bg = total > 0 ? roomBg(score) : Colors.surface;
  const border = total > 0 ? roomBorder(score) : Colors.border;
  const sColor = total > 0 ? scoreColor(score) : Colors.textTertiary;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80 + 200).duration(400)}
      style={{ flex: 1 }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.roomCard,
          { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ThemedText style={styles.roomEmoji}>{room.emoji}</ThemedText>
        <ThemedText variant="labelLarge" color="textPrimary" style={{ marginTop: 4, textAlign: 'center' }}>
          {room.name}
        </ThemedText>

        <View style={{ marginTop: Spacing.md }}>
          <GlowScoreCircle score={total > 0 ? score : 0} size="small" empty={total === 0} />
        </View>

        {total > 0 ? (
          <ThemedText variant="bodySmall" style={{ color: sColor, marginTop: Spacing.sm, textAlign: 'center' }}>
            {total} produit{total > 1 ? 's' : ''} · {pct}% safe
          </ThemedText>
        ) : (
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
            Aucun produit
          </ThemedText>
        )}

        {total > 0 && score === 100 && (
          <View style={styles.perfectBadge}>
            <ThemedText style={styles.perfectBadgeText}>✓ Parfait</ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScoreScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const { userId, role, linkedUserId } = useProfile();
  const isPartner = role === 'partner';
  const shelfUserId = isPartner && linkedUserId ? linkedUserId : userId;

  const { shelf } = useShelfData(shelfUserId || undefined);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [homeBadge, setHomeBadge] = useState(false);
  const celebratedRef = useRef(new Set<RoomId>());

  // ── Per-room products ──────────────────────────────────────────────────────
  const roomProducts = useMemo(() =>
    ROOMS.map((room) =>
      shelf.filter((p) => p.category && room.categories.includes(p.category as ShelfCategory))
    ),
    [shelf],
  );

  // ── Room scores ────────────────────────────────────────────────────────────
  const roomScores = useMemo(() =>
    roomProducts.map((prods) => calculateGlowScore(prods)),
    [roomProducts],
  );

  // ── Global home score (average of rooms that have products) ────────────────
  const globalScore = useMemo(() => {
    const active = roomScores.filter((_, i) => roomProducts[i].length > 0);
    if (active.length === 0) return 0;
    return Math.round(active.reduce((sum, r) => sum + r.score, 0) / active.length);
  }, [roomScores, roomProducts]);

  // ── Badge unlock + confetti logic ──────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const alreadyBadge = await AsyncStorage.getItem(HOME_BADGE_KEY);
      if (alreadyBadge === 'true') {
        setHomeBadge(true);
        return;
      }

      let newCelebration = false;
      for (let i = 0; i < ROOMS.length; i++) {
        const room = ROOMS[i];
        const score = roomScores[i];
        if (roomProducts[i].length === 0) continue;

        if (score.score === 100 && !celebratedRef.current.has(room.id)) {
          const key = roomCelebratedKey(room.id);
          const already = await AsyncStorage.getItem(key);
          if (already !== 'true') {
            await AsyncStorage.setItem(key, 'true');
            celebratedRef.current.add(room.id);
            newCelebration = true;
          }
        }
      }

      // Check if ALL active rooms are now 100%
      const activeRooms = ROOMS.filter((_, i) => roomProducts[i].length > 0);
      const allGreen = activeRooms.length > 0 &&
        activeRooms.every((_, i) => roomScores[ROOMS.indexOf(activeRooms[i])].score === 100);

      if (allGreen) {
        await AsyncStorage.setItem(HOME_BADGE_KEY, 'true');
        setHomeBadge(true);
        newCelebration = true;
      }

      if (newCelebration) {
        setConfettiVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setConfettiVisible(false), 2000);
      }
    };

    if (shelf.length > 0) check();
  }, [roomScores, roomProducts, shelf.length]);

  const handleRoomPress = useCallback((_room: RoomDef) => {
    router.push(ROUTES.shelf);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ConfettiOverlay visible={confettiVisible} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, {
          paddingTop: topPadding + Spacing.lg,
          paddingBottom: insets.bottom + 60,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="displayMedium" color="textPrimary">
            Mon Environnement
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: 4 }}>
            Analyse la sécurité de chaque pièce de ta maison
          </ThemedText>
        </Animated.View>

        {/* Global score hero */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <View style={styles.heroCard}>
            <GlowScoreCircle
              score={globalScore}
              size="large"
              animated
              breakdown={(() => {
                const all = roomProducts.flat();
                if (all.length === 0) return undefined;
                return {
                  safe: all.filter((p) => p.verdict === 'safe').length,
                  caution: all.filter((p) => p.verdict === 'caution').length,
                  danger: all.filter((p) => p.verdict === 'danger').length,
                };
              })()}
              breathing={globalScore > 0}
            />
            <View style={{ flex: 1, gap: Spacing.sm }}>
              <ThemedText variant="headlineLarge" color="textPrimary">
                {homeSummary(globalScore)}
              </ThemedText>

              {/* Per-room progress bars */}
              <View style={styles.barsSection}>
                {ROOMS.map((room, i) => {
                  const s = roomScores[i];
                  const hasProducts = roomProducts[i].length > 0;
                  return (
                    <View key={room.id} style={styles.barRow}>
                      <ThemedText style={styles.barLabel}>{room.emoji} {room.name}</ThemedText>
                      {hasProducts ? (
                        <View style={styles.barRight}>
                          <RoomProgressBar score={s.score} color={scoreColor(s.score)} />
                          <ThemedText style={[styles.barPct, { color: scoreColor(s.score) }]}>
                            {s.score}%
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText variant="bodySmall" color="textTertiary">—</ThemedText>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Home badge */}
        {homeBadge && (
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <View style={styles.badgeCard}>
              <ThemedText style={{ fontSize: 28 }}>🏡</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText variant="labelLarge" style={{ color: Colors.safe }}>
                  Maison 100% Safe ✨
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                  Toutes tes pièces sont au vert. Félicitations !
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Objectif */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <View style={styles.objectifCard}>
            <Feather name="target" size={16} color={Colors.accent} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
              Objectif : passe toutes tes pièces au vert en remplaçant les produits à risque !
            </ThemedText>
          </View>
        </Animated.View>

        {/* Rooms grid */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <ThemedText variant="labelLarge" color="textSecondary" style={{ marginBottom: Spacing.sm }}>
            Par pièce
          </ThemedText>
          <View style={styles.roomsGrid}>
            <View style={styles.roomsRow}>
              <RoomCard room={ROOMS[0]} products={roomProducts[0]} onPress={() => handleRoomPress(ROOMS[0])} index={0} />
              <RoomCard room={ROOMS[1]} products={roomProducts[1]} onPress={() => handleRoomPress(ROOMS[1])} index={1} />
            </View>
            <View style={styles.roomsRow}>
              <RoomCard room={ROOMS[2]} products={roomProducts[2]} onPress={() => handleRoomPress(ROOMS[2])} index={2} />
              <RoomCard room={ROOMS[3]} products={roomProducts[3]} onPress={() => handleRoomPress(ROOMS[3])} index={3} />
            </View>
          </View>
        </Animated.View>

        {/* Empty state */}
        {shelf.length === 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View style={styles.emptyCard}>
              <Feather name="home" size={40} color={Colors.textTertiary} />
              <ThemedText variant="bodyLarge" color="textTertiary" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
                Ton placard est vide
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
                Scanne des produits et ajoute-les à ton placard pour voir ton score par pièce.
              </ThemedText>
              <Pressable
                onPress={() => router.push(ROUTES.scan)}
                style={({ pressed }) => [styles.scanCTA, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="camera" size={15} color={Colors.accent} />
                <ThemedText variant="labelLarge" color="accent">Scanner un produit</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Tips */}
        <Animated.View entering={FadeInDown.delay(360).duration(400)}>
          <View style={styles.tipCard}>
            <Feather name="info" size={14} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1, lineHeight: 18 }}>
              Les scores sont calculés depuis ton placard. Attribuez une catégorie à chaque produit pour affiner l'analyse par pièce.
            </ThemedText>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_GAP = Spacing.md;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  header: { gap: 4 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.medium,
  },
  barsSection: { gap: Spacing.sm, width: '100%' },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  barLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    width: 110,
  },
  barRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  barPct: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.safeLight,
    padding: Spacing.lg,
  },
  objectifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  roomsGrid: { gap: CARD_GAP },
  roomsRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  roomCard: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 2,
    minHeight: 170,
    justifyContent: 'center',
    ...Shadows.soft,
  },
  roomEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  perfectBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.safeLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  perfectBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: Colors.safe,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: 4,
  },
  scanCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
