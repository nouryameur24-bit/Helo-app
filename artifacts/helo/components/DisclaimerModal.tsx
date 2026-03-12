import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { GENERAL_DISCLAIMER } from '@/constants/legalTexts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY = 'disclaimer_accepted';

const BULLET_POINTS = [
  { icon: 'search' as const, text: 'Analyse des ingrédients basée sur des sources scientifiques reconnues' },
  { icon: 'alert-circle' as const, text: 'Informations à titre indicatif, ne remplaçant pas un avis médical' },
  { icon: 'user' as const, text: 'Consultez toujours votre professionnel de santé' },
  { icon: 'refresh-cw' as const, text: 'Données mises à jour régulièrement selon les dernières études' },
];

export function DisclaimerModal() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const check = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
        if (!onboardingCompleted) return;

        const accepted = await AsyncStorage.getItem(STORAGE_KEY);
        if (!accepted) {
          setVisible(true);
        }
      } catch {
      }
    };
    check();
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');

      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ disclaimer_accepted: true })
            .eq('id', user.id);
        }
      }
    } catch {
    } finally {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={styles.shieldIcon}>
                <Feather name="shield" size={32} color={Colors.accent} />
              </View>
            </View>

            <ThemedText variant="headlineLarge" color="textPrimary" style={styles.title}>
              Avant de commencer
            </ThemedText>

            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.body}>
              {GENERAL_DISCLAIMER}
            </ThemedText>

            <View style={styles.bulletList}>
              {BULLET_POINTS.map((item, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletIcon}>
                    <Feather name={item.icon} size={16} color={Colors.accent} />
                  </View>
                  <ThemedText variant="bodySmall" color="textSecondary" style={styles.bulletText}>
                    {item.text}
                  </ThemedText>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setChecked(!checked)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Feather name="check" size={14} color="#fff" />}
              </View>
              <ThemedText variant="bodySmall" color="textPrimary" style={styles.checkboxLabel}>
                J'ai lu et compris ces informations
              </ThemedText>
            </Pressable>

            <Button
              fullWidth
              disabled={!checked}
              onPress={handleAccept}
            >
              J'ai compris, continuer
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
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.md,
  },
  body: {
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  bulletList: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    paddingTop: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkboxLabel: {
    flex: 1,
  },
});
