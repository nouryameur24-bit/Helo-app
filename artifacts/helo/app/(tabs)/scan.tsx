import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View entering={FadeInDown.delay(0).duration(500)}>
          <ThemedText variant="headlineLarge" color="textPrimary" style={{ marginBottom: 4 }}>
            Scanner
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginBottom: Spacing.xxl }}>
            Photographiez le code-barre ou la liste d'ingrédients
          </ThemedText>
        </Animated.View>

        {/* Scanner viewfinder */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.viewfinderContainer}>
          <LinearGradient
            colors={[Colors.backgroundSecondary, Colors.background]}
            style={styles.viewfinder}
          >
            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            <View style={styles.viewfinderCenter}>
              <View style={styles.scanIconWrapper}>
                <Feather name="camera" size={32} color={Colors.accent} />
              </View>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                Appuyez pour activer la caméra
              </ThemedText>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.ctaGroup}>
          <Button variant="primary" fullWidth>
            Activer la caméra
          </Button>
          <Button variant="secondary" fullWidth>
            Entrer un code manuellement
          </Button>
        </Animated.View>

        {/* How it works */}
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <ThemedText variant="headlineMedium" color="textPrimary" style={{ marginBottom: Spacing.md }}>
            Comment ça marche ?
          </ThemedText>
          <View style={styles.stepsList}>
            {[
              { icon: 'camera' as const, title: 'Scannez', desc: 'Pointez votre caméra sur le code-barre ou les ingrédients' },
              { icon: 'search' as const, title: 'Analysez', desc: 'Hēlo identifie chaque ingrédient et vérifie sa sécurité' },
              { icon: 'check-circle' as const, title: 'Décidez', desc: 'Recevez une évaluation claire et fondée scientifiquement' },
            ].map((step, i) => (
              <Card key={i} style={styles.stepCard}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepIcon, { backgroundColor: Colors.accentLight }]}>
                    <Feather name={step.icon} size={18} color={Colors.accentDark} />
                  </View>
                  <View style={styles.stepText}>
                    <ThemedText variant="labelLarge" color="textPrimary">{step.title}</ThemedText>
                    <ThemedText variant="bodySmall" color="textSecondary">{step.desc}</ThemedText>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  viewfinderContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  viewfinder: {
    height: 260,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  topLeft: {
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 20,
    right: 20,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  viewfinderCenter: {
    alignItems: 'center',
  },
  scanIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGroup: {
    gap: Spacing.md,
  },
  stepsList: {
    gap: Spacing.md,
  },
  stepCard: {
    padding: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
});
