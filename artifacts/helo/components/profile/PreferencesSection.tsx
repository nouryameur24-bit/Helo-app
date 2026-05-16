import React from 'react';
import { Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { useBabyMode } from '@/hooks/useBabyMode';
import { BREASTFEEDING_PALETTE, useBreastfeeding } from '@/hooks/useBreastfeeding';
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
                {isBreastfeeding ? "Actif — analyses adaptées à l'allaitement" : "Analyse vos produits pour l'allaitement"}
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
    </>
  );
}
