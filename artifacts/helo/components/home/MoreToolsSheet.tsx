/**
 * Lot 15C2 — BottomSheet listant les outils secondaires du home.
 *
 * Pourquoi : le home actuel rendait 12+ sections en scroll vertical
 * (header / banniers / hero CTA / pact widget / quick actions /
 * feature grid / shelf scan CTA / stats / weekly brief / glow score /
 * recent scans / disclaimer). Surcharge cognitive : "trop d'info, je
 * sais pas où regarder, je passe à autre chose".
 *
 * Cette sheet récupère les sections "secondaires" (outils ponctuels —
 * Nutrition, Voyage, Timeline, etc.) et les groupe derrière un seul
 * bouton "Plus d'outils ▼" sur le home. Le home reste avec ses 4-5
 * sections essentielles ; les outils restent un tap.
 *
 * Liste contrôlée ici (vs récupérée dynamiquement depuis FeatureGrid)
 * pour pouvoir réordonner facilement sans toucher au composant existant.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/ThemedText';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface ToolItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  route: Href;
  iconBg: string;
  iconColor: string;
  premium?: boolean;
  /** Feature flag à respecter pour afficher l'item */
  flag?: 'travel' | 'circle' | 'community' | 'memories' | 'voice' | 'arMirror' | 'scanParty';
}

const TOOLS: ToolItem[] = [
  {
    id: 'timeline',
    icon: 'calendar',
    label: 'Timeline',
    description: 'Ta grossesse semaine par semaine',
    route: '/timeline',
    iconBg: '#E8F5EE',
    iconColor: Colors.safe,
  },
  {
    id: 'nutrition',
    icon: 'heart',
    label: 'Nutrition',
    description: 'Besoins du trimestre, aliments à privilégier',
    route: '/nutrition',
    iconBg: Colors.cautionLight,
    iconColor: Colors.caution,
  },
  {
    id: 'home-score',
    icon: 'home',
    label: 'Score Maison',
    description: 'Évalue la sécurité de ton intérieur',
    route: '/home-score',
    iconBg: Colors.safeBg,
    iconColor: Colors.safe,
  },
  {
    id: 'travel',
    icon: 'map',
    label: 'Mode Voyage',
    description: 'Briefing santé personnalisé par pays',
    route: '/travel',
    iconBg: '#E8F0FF',
    iconColor: '#6B8FDB',
    premium: true,
    flag: 'travel',
  },
  {
    id: 'widget',
    icon: 'watch',
    label: 'Widget Glow',
    description: "Le Glow Score sur l'écran d'accueil",
    route: '/widget-preview',
    iconBg: '#F5F0FF',
    iconColor: '#8B6BDB',
  },
];

interface MoreToolsSheetProps {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
}

export function MoreToolsSheet({ visible, onClose, isPremium }: MoreToolsSheetProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, [visible]);

  const handleNavigate = (tool: ToolItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
    // Petit délai pour laisser la sheet se fermer visuellement avant la nav
    setTimeout(() => {
      router.push(tool.route);
    }, 180);
  };

  const visibleTools = TOOLS.filter((t) => !t.flag || isFeatureEnabled(t.flag));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.duration(300).springify().damping(18)}
          exiting={SlideOutDown.duration(220)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Plus d'outils
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 4 }}>
              Tous les outils Hēlo en un coup d'œil.
            </ThemedText>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {visibleTools.map((tool, index) => (
              <Animated.View
                key={tool.id}
                entering={FadeInDown.delay(80 + index * 50).duration(280)}
              >
                <Pressable
                  onPress={() => handleNavigate(tool)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tool.label} — ${tool.description}${tool.premium && !isPremium ? ' (Premium)' : ''}`}
                  style={({ pressed }) => [
                    styles.row,
                    { opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: tool.iconBg }]}>
                    <Feather name={tool.icon} size={20} color={tool.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleLine}>
                      <ThemedText variant="labelLarge" color="textPrimary">
                        {tool.label}
                      </ThemedText>
                      {tool.premium && !isPremium && (
                        <View style={styles.premiumBadge}>
                          <Feather name="star" size={9} color={Colors.accentDark} />
                          <ThemedText style={styles.premiumBadgeText}>PREMIUM</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                      {tool.description}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.dismissBtn}
          >
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ textAlign: 'center' }}>
              Fermer
            </ThemedText>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 16, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: '85%',
    ...Shadows.soft,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary + '55',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '33',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.accentDark,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
});
