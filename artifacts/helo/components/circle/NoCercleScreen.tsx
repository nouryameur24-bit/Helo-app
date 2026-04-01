import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import styles from './circleStyles';

interface NoCercleScreenProps {
  onCreateCircle: () => void;
  onJoinCircle: () => void;
  isPremium: boolean;
}

function NoCercleScreen({ onCreateCircle, onJoinCircle, isPremium }: NoCercleScreenProps) {
  return (
    <View style={styles.noCercleRoot}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.noCercleInner}>
        <View style={styles.noCercleEmoji}>
          <ThemedText style={{ fontSize: 48 }}>🫂</ThemedText>
        </View>
        <ThemedText variant="headlineLarge" color="textPrimary" style={styles.centeredText}>
          Mon Cercle
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={[styles.centeredText, { marginTop: 4 }]}>
          Invitez jusqu'à 8 proches pour partager vos scans, vos réactions et vous motiver ensemble.
        </ThemedText>

        <View style={styles.noCercleActions}>
          <Pressable
            onPress={onCreateCircle}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={isPremium ? 'Créer mon cercle' : 'Créer mon cercle — Premium requis'}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={styles.primaryBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="users" size={18} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>
                Créer mon cercle{!isPremium ? ' ✦ Premium' : ''}
              </ThemedText>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onJoinCircle}
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Rejoindre un cercle avec un code"
          >
            <Feather name="link" size={18} color={Colors.accentDark} />
            <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>
              Rejoindre un cercle
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default React.memo(NoCercleScreen);
