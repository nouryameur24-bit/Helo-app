import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { useBabyMode } from '@/hooks/useBabyMode';
import { BREASTFEEDING_PALETTE, useBreastfeeding } from '@/hooks/useBreastfeeding';
import { usePremium } from '@/hooks/usePremium';
import { PREMIUM_KEY } from '@/lib/purchases';
import { resetScanLimit } from '@/lib/scanLimit';
import { sendSentryTestEvent } from '@/lib/sentry';
import { useProfile } from './ProfileContext';

import styles from './profileStyles';

export function PreferencesSection() {
  const { role } = useProfile();
  const isPartner = role === 'partner';

  const { babyMode, enableBabyMode, disableBabyMode } = useBabyMode();
  const {
    isBreastfeeding,
    enableBreastfeeding,
    disableBreastfeeding,
  } = useBreastfeeding();
  const { isPremium, refresh: refreshPremium } = usePremium();

  const toggleDevPremium = React.useCallback(async (val: boolean) => {
    await AsyncStorage.setItem(PREMIUM_KEY, val ? 'true' : 'false');
    await refreshPremium();
  }, [refreshPremium]);

  const resetScansDev = React.useCallback(async () => {
    await resetScanLimit();
    await refreshPremium();
  }, [refreshPremium]);

  const triggerSentryTest = React.useCallback(() => {
    const ok = sendSentryTestEvent();
    Alert.alert(
      ok ? 'Test envoyé' : 'Sentry non configuré',
      ok
        ? 'Ouvre helo-54.sentry.io/issues — l\'événement devrait apparaître dans les 30 secondes.'
        : 'Aucun DSN trouvé. Vérifie EXPO_PUBLIC_SENTRY_DSN.',
    );
  }, []);

  React.useEffect(() => {
    if (isBreastfeeding && !babyMode) enableBabyMode();
  }, [isBreastfeeding, babyMode, enableBabyMode]);

  if (isPartner) return null;

  return (
    <>
      {/* MODE — breastfeeding */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)}>
        <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
          MODE
        </ThemedText>
        <Card padding={0} style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: isBreastfeeding ? BREASTFEEDING_PALETTE.accentLight : Colors.accentLight }]}>
              <Feather name="heart" size={18} color={isBreastfeeding ? BREASTFEEDING_PALETTE.accent : Colors.accent} />
            </View>
            <View style={styles.settingContent}>
              <ThemedText variant="labelLarge" color="textPrimary">Mode allaitement</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">
                {isBreastfeeding ? "Actif — analyses adaptées à l'allaitement" : "Analyse tes produits pour l'allaitement"}
              </ThemedText>
            </View>
            <Switch
              value={isBreastfeeding}
              onValueChange={async (val) => { if (val) await enableBreastfeeding(); else await disableBreastfeeding(); }}
              trackColor={{ false: Colors.borderLight, true: BREASTFEEDING_PALETTE.accent }}
              thumbColor={isBreastfeeding ? '#FFF' : Colors.textTertiary}
              accessibilityLabel="Mode allaitement"
            />
          </View>
        </Card>
      </Animated.View>

      {/* MODE BÉBÉ */}
      <Animated.View entering={FadeInDown.delay(230).duration(500)}>
        <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
          MODE BÉBÉ
        </ThemedText>
        <Card padding={0} style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#FFF0E8' }]}>
              <ThemedText style={{ fontSize: 18 }}>👶</ThemedText>
            </View>
            <View style={styles.settingContent}>
              <ThemedText variant="bodyLarge" color="textPrimary">Scanner aussi pour bébé</ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">
                {isBreastfeeding ? 'Activé automatiquement avec le mode allaitement' : 'Analyse les ingrédients selon les risques bébé (0-3 ans)'}
              </ThemedText>
            </View>
            <Switch
              value={babyMode}
              onValueChange={(val) => val ? enableBabyMode() : disableBabyMode()}
              disabled={isBreastfeeding}
              trackColor={{ false: Colors.borderLight, true: Colors.accent }}
              thumbColor={babyMode ? Colors.accentDark : '#f4f3f4'}
              accessibilityLabel="Mode bébé"
            />
          </View>
        </Card>
      </Animated.View>

      {/* Push S+ : le toggle "Lune de minuit" a été retiré — c'était une
          promesse cassée (aucun écran ne consommait useColors(), 185 fichiers
          importent Colors en statique). L'infra useAppTheme + ColorsDark reste
          dans le codebase, dormante, pour une future migration dark mode dédiée
          (réécriture structurelle des styles). Mieux vaut pas de toggle qu'un
          toggle qui ne fait rien. */}

      {/* DEV — Premium toggle (visible uniquement en dev) */}
      {__DEV__ ? (
        <Animated.View entering={FadeInDown.delay(280).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            DEV
          </ThemedText>
          <Card padding={0} style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: '#FFF7DC' }]}>
                <Feather name="star" size={18} color="#C9A96E" />
              </View>
              <View style={styles.settingContent}>
                <ThemedText variant="labelLarge" color="textPrimary">Premium (dev)</ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  {isPremium ? 'Actif — accès à toutes les fonctionnalités' : 'Active Premium pour tester sans payer'}
                </ThemedText>
              </View>
              <Switch
                value={isPremium}
                onValueChange={toggleDevPremium}
                trackColor={{ false: Colors.borderLight, true: Colors.accent }}
                thumbColor={isPremium ? Colors.accentDark : '#f4f3f4'}
                accessibilityLabel="Premium dev"
              />
            </View>
            <Pressable
              onPress={resetScansDev}
              style={({ pressed }) => [
                styles.settingRow,
                { borderTopWidth: 1, borderTopColor: Colors.borderLight, opacity: pressed ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Réinitialiser le compteur de scans"
            >
              <View style={[styles.settingIcon, { backgroundColor: '#FFF7DC' }]}>
                <Feather name="refresh-ccw" size={18} color="#C9A96E" />
              </View>
              <View style={styles.settingContent}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  Réinitialiser le compteur de scans
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Remet à 0 le quota quotidien gratuit
                </ThemedText>
              </View>
            </Pressable>
            <Pressable
              onPress={triggerSentryTest}
              style={({ pressed }) => [
                styles.settingRow,
                { borderTopWidth: 1, borderTopColor: Colors.borderLight, opacity: pressed ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Envoyer un événement test à Sentry"
            >
              <View style={[styles.settingIcon, { backgroundColor: '#FFE8E8' }]}>
                <Feather name="alert-triangle" size={18} color="#C27B7B" />
              </View>
              <View style={styles.settingContent}>
                <ThemedText variant="labelLarge" color="textPrimary">
                  Envoyer un test Sentry
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Crée une fausse erreur visible sur le dashboard
                </ThemedText>
              </View>
            </Pressable>
          </Card>
        </Animated.View>
      ) : null}
    </>
  );
}
