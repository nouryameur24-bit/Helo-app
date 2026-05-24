import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/types/routes';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { MaListeView } from '@/components/shelf/MaListeView';
import { MonPlacardView } from '@/components/shelf/MonPlacardView';
import { ShelfExplainerModal } from '@/components/shelf/ShelfExplainerModal';
import { PartnerModeBadge } from '@/components/partner/PartnerModeBadge';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { useProfile } from '@/hooks/useProfile';
import { STORAGE_KEYS } from '@/lib/storageKeys';

type Tab = 'placard' | 'liste';

function SegmentedControl({
  selected,
  onSelect,
}: {
  selected: Tab;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <View style={styles.segmented}>
      <Pressable
        style={[styles.segment, selected === 'placard' && styles.segmentActive]}
        onPress={() => onSelect('placard')}
        accessibilityRole="tab"
        accessibilityLabel="Mon placard — produits que j'ai déjà"
        accessibilityState={{ selected: selected === 'placard' }}
      >
        <ThemedText style={styles.segmentEmoji}>📦</ThemedText>
        <ThemedText
          variant="labelLarge"
          color={selected === 'placard' ? 'accentDark' : 'textTertiary'}
        >
          Mon placard
        </ThemedText>
      </Pressable>
      <Pressable
        style={[styles.segment, selected === 'liste' && styles.segmentActive]}
        onPress={() => onSelect('liste')}
        accessibilityRole="tab"
        accessibilityLabel="À acheter — ma liste de courses"
        accessibilityState={{ selected: selected === 'liste' }}
      >
        <ThemedText style={styles.segmentEmoji}>🛒</ThemedText>
        <ThemedText
          variant="labelLarge"
          color={selected === 'liste' ? 'accentDark' : 'textTertiary'}
        >
          À acheter
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function ShelfScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const [activeTab, setActiveTab] = useState<Tab>('placard');
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { isPremium } = usePremium();
  const { role, linkedFirstName } = useProfile();
  const isPartner = role === 'partner';

  // Lot 15A4 — Au tout premier visit de l'onglet Placard, on affiche un
  // explainer ("📦 Mon placard = j'ai déjà / 🛒 À acheter = je veux") pour
  // poser le mental model. Persisté en AsyncStorage pour ne plus jamais
  // re-show.
  const [explainerVisible, setExplainerVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.shelfExplainerSeen)
      .then((seen) => {
        if (seen !== '1') {
          // Petit délai pour laisser la transition de tab s'achever avant
          // de pop la modale (sinon ça flashe sur la transition).
          setTimeout(() => setExplainerVisible(true), 350);
        }
      })
      .catch(() => {});
  }, []);

  const handleExplainerClose = () => {
    setExplainerVisible(false);
    AsyncStorage.setItem(STORAGE_KEYS.shelfExplainerSeen, '1').catch(() => {});
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.headerContainer, { paddingTop: topPadding + Spacing.lg }]}
      >
        {/* Lot 15A2 — Mode accompagnant : pastille discrète au-dessus
            du segmented control pour rappeler que le placard affiché est
            celui de la maman (read-only pour le partner). */}
        {isPartner && (
          <PartnerModeBadge linkedFirstName={linkedFirstName} variant="compact" />
        )}
        <SegmentedControl selected={activeTab} onSelect={setActiveTab} />

        {/* Shelf scanner button */}
        <TouchableOpacity
          style={styles.shelfScanBtn}
          onPress={() => router.push(ROUTES.shelfScan)}
          activeOpacity={0.82}
        >
          <Feather name="layers" size={16} color={Colors.accentDark} />
          <ThemedText style={styles.shelfScanText}>Scanner une étagère</ThemedText>
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Feather name="star" size={9} color={Colors.accentDark} />
              <ThemedText style={styles.premiumBadgeText}>PREMIUM</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {activeTab === 'placard' ? (
        <MonPlacardView highlightBarcode={highlight} />
      ) : (
        <MaListeView />
      )}

      {/* Lot 15A4 — Explainer "Placard vs À acheter", first-visit only. */}
      <ShelfExplainerModal
        visible={explainerVisible}
        onClose={handleExplainerClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: Radius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  segmentEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shelfScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    ...Shadows.soft,
  },
  shelfScanText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '33',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.5,
  },
});
