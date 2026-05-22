import { swallow } from '@/lib/swallow';
import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import type { RappelConsoRecord } from '@/lib/rappelConso';
import styles from './verdictStyles';

interface RecallAlertBannerProps {
  recallMatch: RappelConsoRecord;
}

export function RecallAlertBanner({ recallMatch }: RecallAlertBannerProps) {
  return (
    <Pressable
      style={styles.recallBanner}
      onPress={() => Linking.openURL(recallMatch.lien_vers_la_fiche_rappel).catch(swallow)}
      accessibilityRole="button"
      accessibilityLabel="Voir le rappel officiel"
    >
      <View style={styles.recallBannerIcon}>
        <Feather name="alert-triangle" size={20} color={Colors.danger} />
      </View>
      <View style={styles.recallContent}>
        <ThemedText variant="labelLarge" style={styles.recallTitle}>
          RAPPEL OFFICIEL EN COURS
        </ThemedText>
        <ThemedText
          variant="bodySmall"
          color="textSecondary"
          style={styles.recallSubtitle}
          numberOfLines={2}
        >
          {recallMatch.motif_rappel}
        </ThemedText>
      </View>
      <Feather name="external-link" size={16} color={Colors.danger + '88'} />
    </Pressable>
  );
}
