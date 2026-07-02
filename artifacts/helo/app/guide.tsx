// ─── Guide des fonctionnalités — searchable accordion of all 18 modes ──────
import { router, Stack, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  DISCOVERIES,
  GUIDE_CATEGORIES,
  GUIDE_ENTRIES,
  resetAllDiscoveries,
  type DiscoveryCategory,
  type DiscoveryKey,
} from '@/lib/featureDiscovery';

// Strip diacritics for accent-insensitive search ("voyage" matches "Voyage")
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<DiscoveryKey | null>(null);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return GUIDE_ENTRIES;
    return GUIDE_ENTRIES.filter((e) => {
      const c = DISCOVERIES[e.key];
      return norm(c.title).includes(q) || norm(c.description).includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<DiscoveryCategory, typeof GUIDE_ENTRIES>();
    for (const cat of GUIDE_CATEGORIES) map.set(cat, []);
    for (const entry of filtered) map.get(entry.category)?.push(entry);
    return map;
  }, [filtered]);

  const handleTapCard = (entry: typeof GUIDE_ENTRIES[number]) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (expanded === entry.key) {
      // Already open — navigate
      router.push(entry.route as Href);
    } else {
      setExpanded(entry.key);
    }
  };

  const handleNavigate = (route: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as Href);
  };

  const handleResetTutorials = () => {
    Alert.alert(
      'Revoir tous les tutoriels ?',
      'Les fiches d\u2019explication réapparaîtront la prochaine fois que tu ouvriras chaque fonctionnalité.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await resetAllDiscoveries();
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert('C\u2019est fait', 'Les tutoriels réapparaîtront sur chaque écran.');
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
          hitSlop={12}
        >
          <Feather name="chevron-left" size={24} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">
          Guide
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une fonctionnalité"
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Effacer">
            <Feather name="x-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.emptyWrap}>
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ textAlign: 'center' }}>
              Aucun résultat pour « {query} »
            </ThemedText>
          </Animated.View>
        ) : (
          GUIDE_CATEGORIES.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <View key={cat} style={styles.section}>
                <ThemedText variant="labelSmall" style={styles.sectionLabel}>
                  {cat.toUpperCase()}
                </ThemedText>
                <Animated.View layout={LinearTransition.duration(220)}>
                  {items.map((entry, idx) => {
                    const content = DISCOVERIES[entry.key];
                    const isOpen = expanded === entry.key;
                    return (
                      <Animated.View
                        key={entry.key}
                        entering={FadeInDown.delay(idx * 30).duration(280)}
                        layout={LinearTransition.duration(220)}
                      >
                        <Card padding={0} style={styles.card}>
                          <Pressable
                            onPress={() => handleTapCard(entry)}
                            style={({ pressed }) => [
                              styles.cardHeader,
                              pressed && { opacity: 0.85 },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={content.title}
                            accessibilityState={{ expanded: isOpen }}
                          >
                            <View style={styles.iconCircle}>
                              <ThemedText style={styles.iconText}>{content.icon}</ThemedText>
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText variant="bodyLarge" color="textPrimary">
                                {content.title}
                              </ThemedText>
                            </View>
                            <Feather
                              name={isOpen ? 'chevron-up' : 'chevron-down'}
                              size={20}
                              color={Colors.textTertiary}
                            />
                          </Pressable>

                          {isOpen && (
                            <Animated.View
                              entering={FadeIn.duration(180)}
                              style={styles.cardBody}
                            >
                              <ThemedText
                                variant="bodyMedium"
                                color="textSecondary"
                                style={styles.cardDescription}
                              >
                                {content.description}
                              </ThemedText>
                              <View style={styles.tipBox}>
                                <ThemedText variant="bodySmall" color="textPrimary">
                                  {content.tip}
                                </ThemedText>
                              </View>
                              <Pressable
                                onPress={() => handleNavigate(entry.route)}
                                style={({ pressed }) => [
                                  styles.openBtn,
                                  pressed && { opacity: 0.92 },
                                ]}
                              >
                                <ThemedText style={styles.openBtnText}>
                                  Ouvrir
                                </ThemedText>
                                <Feather
                                  name="arrow-right"
                                  size={18}
                                  color={Colors.background}
                                />
                              </Pressable>
                            </Animated.View>
                          )}
                        </Card>
                      </Animated.View>
                    );
                  })}
                </Animated.View>
              </View>
            );
          })
        )}

        {/* ── Reset tutorials link ── */}
        {filtered.length > 0 && query.length === 0 && (
          <Pressable
            onPress={handleResetTutorials}
            style={({ pressed }) => [styles.resetLink, pressed && { opacity: 0.65 }]}
            accessibilityRole="button"
          >
            <Feather name="refresh-cw" size={14} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary">
              Revoir les tutoriels
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    padding: 0,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
  },
  emptyWrap: {
    paddingVertical: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    color: Colors.accentDark,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    lineHeight: 26,
  },
  cardBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  cardDescription: {
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 12,
    marginTop: Spacing.xs,
  },
  openBtnText: {
    color: Colors.background,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
});
