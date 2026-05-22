import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { styles } from './homeStyles';

export function HomeHeroCTA() {
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
      <LinearGradient
        colors={['#E8D5B0', '#C9A96E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroContent}>
          <ThemedText variant="headlineMedium" style={{ color: '#FFFFFF', marginBottom: 4 }}>
            Scanner un produit
          </ThemedText>
          <ThemedText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: Spacing.xl }}>
            Analysez la sécurité des ingrédients en quelques secondes
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.heroButton,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={() => router.push('/(tabs)/scan')}
            accessibilityRole="button"
            accessibilityLabel="Scanner maintenant"
          >
            <Feather name="camera" size={18} color={Colors.accentDark} />
            <Text style={styles.heroButtonText}>Scanner maintenant</Text>
          </Pressable>
        </View>
        <View style={styles.heroDecoration}>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
