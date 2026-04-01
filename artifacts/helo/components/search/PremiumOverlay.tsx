import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { pay } from './searchStyles';

interface PremiumOverlayProps {
  onUnlock: () => void;
}

function PremiumOverlay({ onUnlock }: PremiumOverlayProps) {
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={pay.root} pointerEvents="box-none">
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,250,245,0.88)' }]} />
      )}
      <View style={pay.card}>
        <View style={pay.crown}>
          <ThemedText style={pay.crownEmoji}>👑</ThemedText>
        </View>
        <ThemedText variant="headlineMedium" color="textPrimary" style={pay.title}>
          Recherche Premium
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={pay.body}>
          La recherche par nom est réservée aux abonnées Hēlo Premium.{'\n'}
          Parcourez les catégories et les tops gratuitement.
        </ThemedText>
        <Pressable
          style={({ pressed }) => [pay.btn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={onUnlock}
          accessibilityRole="button"
          accessibilityLabel="Débloquer Premium"
        >
          <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={pay.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <ThemedText style={pay.btnText}>Découvrir Premium — 4,99 €/mois</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default React.memo(PremiumOverlay);
