import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { cfg } from './scanPartyStyles';
import { THEMES, type Theme } from './scanPartyTypes';

interface PhaseConfigProps {
  onStart: () => void;
  selectedTheme: Theme;
  onSelectTheme: (t: Theme) => void;
}

function PhaseConfig({ onStart, selectedTheme, onSelectTheme }: PhaseConfigProps) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={[cfg.root, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={cfg.header}>
        <Pressable
          onPress={() => router.back()}
          style={cfg.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Feather name="x" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={cfg.badge}>
          <ThemedText variant="labelSmall" style={{ color: Colors.surface }}>SCAN PARTY</ThemedText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={cfg.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={cfg.heroWrap}>
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent]}
            style={cfg.heroGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            <ThemedText style={cfg.heroEmoji}>🎉</ThemedText>
            <ThemedText variant="displayMedium" style={{ color: '#fff', textAlign: 'center' }}>
              Scan Party
            </ThemedText>
            <ThemedText variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 }}>
              Scannez tous vos produits d'un coup
            </ThemedText>
          </LinearGradient>
        </View>

        <Card padding={Spacing.xl} style={cfg.counterCard}>
          <ThemedText variant="displayLarge" color="accent" style={{ textAlign: 'center' }}>0</ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginTop: 2 }}>
            produits scannés
          </ThemedText>
        </Card>

        <View style={cfg.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={cfg.sectionTitle}>
            Choisissez un thème
          </ThemedText>
          <View style={cfg.themeGrid}>
            {THEMES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => onSelectTheme(t.id)}
                style={[cfg.themeCard, selectedTheme === t.id && cfg.themeCardActive]}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: selectedTheme === t.id }}
              >
                <ThemedText style={cfg.themeEmoji}>{t.emoji}</ThemedText>
                <ThemedText
                  variant="bodySmall"
                  style={{
                    color: selectedTheme === t.id ? Colors.accentDark : Colors.textSecondary,
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <Animated.View style={[pulseStyle, cfg.startWrap]}>
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [cfg.startBtn, { opacity: pressed ? 0.9 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Commencer le Scan Party"
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={cfg.startBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="zap" size={22} color="#fff" />
              <ThemedText style={cfg.startBtnLabel}>Commencer</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default React.memo(PhaseConfig);
