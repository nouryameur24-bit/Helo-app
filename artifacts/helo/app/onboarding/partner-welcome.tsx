import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function PartnerWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [partnerName, setPartnerName] = useState('');
  const [myName, setMyName] = useState('');

  useEffect(() => {
    const load = async () => {
      const linked = await AsyncStorage.getItem('@helo_linked_first_name');
      if (linked) setPartnerName(linked);
      const partnerOwn = await AsyncStorage.getItem('@helo_partner_first_name');
      if (partnerOwn) {
        setMyName(partnerOwn);
      } else {
        const profile = await AsyncStorage.getItem('user_profile');
        if (profile) {
          try {
            const parsed = JSON.parse(profile);
            if (parsed.firstName) setMyName(parsed.firstName);
          } catch {
            // Malformed profile JSON — name stays empty, screen still renders
          }
        }
      }
    };
    load();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleContinue = () => {
    router.replace('/onboarding/partner-interests');
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: topPadding + Spacing.massive, paddingBottom: bottomPadding + Spacing.xxl },
      ]}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.heroWrap}>
        <ThemedText style={styles.emoji}>💙</ThemedText>
        <View style={styles.confettiRow}>
          <ThemedText style={styles.confetti}>🎉</ThemedText>
          <ThemedText style={styles.confetti}>🎊</ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.header}>
        <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
          {myName ? `Bienvenue, ${myName} !` : 'Bienvenue !'}
        </ThemedText>
        {partnerName ? (
          <ThemedText variant="headlineLarge" color="accent" style={styles.subtitle}>
            Vous accompagnez{'\n'}{partnerName}
          </ThemedText>
        ) : (
          <ThemedText variant="headlineLarge" color="accent" style={styles.subtitle}>
            Vous êtes maintenant co-parent
          </ThemedText>
        )}
        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.body}>
          Hēlo vous guide semaine après semaine pour soutenir votre partenaire au mieux tout au long de la grossesse.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.featuresWrap}>
        <FeatureItem
          emoji="📋"
          title="Checklist co-parent"
          description="Préparez la maison, les achats et les rendez-vous médicaux."
        />
        <FeatureItem
          emoji="💡"
          title="Tip de la semaine"
          description="Un conseil concret adapté à chaque étape de la grossesse."
        />
        <FeatureItem
          emoji="📊"
          title="Glow Score de votre partenaire"
          description="Suivez la sécurité de son placard en temps réel."
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(450).duration(400)} style={styles.cta}>
        <Button variant="primary" fullWidth onPress={handleContinue}>
          Continuer
        </Button>
      </Animated.View>
    </View>
  );
}

function FeatureItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View style={featureStyles.row}>
      <View style={featureStyles.iconWrap}>
        <ThemedText style={featureStyles.emoji}>{emoji}</ThemedText>
      </View>
      <View style={featureStyles.text}>
        <ThemedText variant="labelLarge" color="textPrimary">
          {title}
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 22,
  },
  text: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxxl,
  },
  heroWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
  },
  confettiRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  confetti: {
    fontSize: 28,
  },
  header: {
    gap: Spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 34,
  },
  body: {
    textAlign: 'center',
    lineHeight: 26,
    color: Colors.textSecondary,
  },
  featuresWrap: {
    gap: Spacing.lg,
  },
  cta: {
    width: '100%',
  },
});
