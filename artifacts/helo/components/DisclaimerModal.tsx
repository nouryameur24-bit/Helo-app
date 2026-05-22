import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const STORAGE_KEY = STORAGE_KEYS.disclaimerAcceptedVersion;
const CURRENT_VERSION = '1.0.0';

export function DisclaimerModal() {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const check = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.onboardingCompleted);
        if (!onboardingCompleted) return;

        const acceptedVersion = await AsyncStorage.getItem(STORAGE_KEY);
        if (acceptedVersion !== CURRENT_VERSION) {
          setVisible(true);
        }
      } catch (err) {
        // Non-critical
        logError('disclaimerModal.checkVersion', err);
      }
    };
    check();
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      // Backwards compat with previous boolean key
      await AsyncStorage.setItem(STORAGE_KEYS.disclaimerAccepted, 'true');

      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ disclaimer_accepted: true })
            .eq('id', user.id);
        }
      }
    } catch (err) {
      // Non-critical
      logError('disclaimerModal.acceptUpdate', err);
    } finally {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // No onRequestClose => Android back button cannot dismiss
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Spacing.xl }}>
            <View style={styles.iconContainer}>
              <View style={styles.shieldIcon}>
                <Feather name="shield" size={32} color={Colors.accent} />
              </View>
            </View>

            <ThemedText variant="headlineLarge" color="textPrimary" style={styles.title}>
              Avant de commencer
            </ThemedText>

            <ThemedText variant="bodyMedium" color="textPrimary" style={styles.paragraph}>
              Hēlo est un outil d'information et de vulgarisation scientifique.
            </ThemedText>

            <ThemedText variant="bodyMedium" color="textPrimary" style={styles.paragraphBold}>
              Il ne remplace EN AUCUN CAS l'avis de votre médecin, gynécologue, sage-femme ou pharmacien.
            </ThemedText>

            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraph}>
              Les analyses sont basées sur des données publiques (CRAT, ANSM, EFSA, SCCS). Elles sont indicatives et ne constituent pas un diagnostic médical.
            </ThemedText>

            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.paragraphLast}>
              Pour toute question médicale, consultez systématiquement un professionnel de santé.
            </ThemedText>

            <Button fullWidth onPress={handleAccept}>
              J'ai compris et j'accepte
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 41, 38, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    maxHeight: '90%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  shieldIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  paragraph: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  paragraphBold: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
    fontWeight: '600',
  },
  paragraphLast: {
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
});
