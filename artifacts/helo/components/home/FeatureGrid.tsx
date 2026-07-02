import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { Colors, Spacing } from '@/constants/theme';
import { styles } from './homeStyles';

type Feature = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  route: string;
  premium?: boolean;
  badge?: string;
};

const ALL_FEATURES: Feature[] = [
  { label: 'Nutrition',   subtitle: 'Besoins du trimestre',    icon: 'heart',    iconBg: Colors.cautionLight, iconColor: Colors.caution, route: '/nutrition' },
  { label: 'Maison',      subtitle: 'Score environnement',     icon: 'home',     iconBg: Colors.safeBg,       iconColor: Colors.safe,    route: '/home-score' },
  { label: 'Restau',      subtitle: 'Analyse le menu',        icon: 'coffee',   iconBg: '#FFF0E8',           iconColor: '#C97B40',      route: '/(tabs)/scan' },
  { label: 'Voyage',      subtitle: 'Briefing santé',          icon: 'map',      iconBg: '#E8F0FF',           iconColor: '#6B8FDB',      route: '/travel', premium: true },
  { label: 'Timeline',    subtitle: 'Semaine par semaine',     icon: 'calendar', iconBg: '#E8F5EE',           iconColor: Colors.safe,    route: '/timeline' },
  { label: 'Widget Glow', subtitle: "Widget écran d'accueil",  icon: 'watch',    iconBg: '#F5F0FF',           iconColor: '#8B6BDB',      route: '/widget-preview' },
];

interface Props {
  isPremium: boolean;
}

export const FeatureGrid = React.memo(function FeatureGrid({ isPremium }: Props) {
  const [showAll, setShowAll] = useState(false);
  const enabledFeatures = ALL_FEATURES.filter(
    (f) => f.route !== '/travel' || isFeatureEnabled('travel'),
  );
  const features = showAll ? enabledFeatures : enabledFeatures.slice(0, 4);

  return (
    <Animated.View entering={FadeInDown.delay(155).duration(500)}>
      <View style={styles.featureSectionHeader}>
        <ThemedText variant="headlineMedium" color="textPrimary">Explorer</ThemedText>
      </View>
      <View style={styles.featureGrid}>
        {features.map((f) => (
          <Pressable
            key={f.label}
            style={({ pressed }) => [
              styles.featureCell,
              { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
            onPress={() => router.push(f.route as Href)}
            accessibilityRole="button"
            accessibilityLabel={f.label}
          >
            <View style={[styles.featureCellIcon, { backgroundColor: f.iconBg }]}>
              <Feather name={f.icon} size={20} color={f.iconColor} />
            </View>
            <ThemedText variant="labelLarge" color="textPrimary">{f.label}</ThemedText>
            <Text style={styles.featureCellSubtitle}>{f.subtitle}</Text>
            {f.badge && (
              <View style={styles.featureCellBadge}>
                <ThemedText style={styles.featureCellBadgeText}>{f.badge}</ThemedText>
              </View>
            )}
            {f.premium && !isPremium && (
              <View style={styles.featureCellPremiumDot}>
                <Feather name="star" size={9} color={Colors.accentDark} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => setShowAll((v) => !v)}
        style={({ pressed }) => ({
          alignSelf: 'center',
          marginTop: Spacing.md,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.lg,
          opacity: pressed ? 0.7 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel={showAll ? 'Voir moins' : 'Voir plus de fonctionnalités'}
      >
        <ThemedText variant="labelLarge" color="accent">
          {showAll ? 'Voir moins ↑' : 'Voir plus →'}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
});
