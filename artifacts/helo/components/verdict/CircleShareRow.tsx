import { swallow } from '@/lib/swallow';
import React from 'react';
import { Switch, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { sendCircleScanNotification } from '@/lib/notifications';
import { postScanToCircle } from '@/lib/circleUtils';
import type { ProductData, VerdictResult } from '@/types';
import styles from './verdictStyles';

interface CircleShareRowProps {
  circleId: string;
  isPartner: boolean;
  verdict: VerdictResult;
  product: ProductData;
  firstName: string;
  userId: string;
  sharedToCircle: boolean;
  setSharedToCircle: (v: boolean) => void;
}

export function CircleShareRow({
  circleId,
  isPartner,
  verdict,
  product,
  firstName,
  userId,
  sharedToCircle,
  setSharedToCircle,
}: CircleShareRowProps) {
  if (!circleId || isPartner) return null;

  const handleShareToggle = async (val: boolean) => {
    if (!val || sharedToCircle) return;
    const scanVerdict = (verdict.verdict ?? 'safe') as 'safe' | 'caution' | 'danger';
    const senderName = firstName || 'Anonyme';
    try {
      await postScanToCircle({
        circleId,
        firstName: senderName,
        productName: product.name,
        verdict: scanVerdict,
      });
      setSharedToCircle(true);
      sendCircleScanNotification({
        senderFirstName: senderName,
        productName: product.name,
        verdict: scanVerdict,
        circleId,
      }).catch(swallow);
    } catch {
      setSharedToCircle(false);
    }
  };

  return (
    <View style={styles.circleSectionWrap}>
      <Divider style={styles.sectionDivider} />
      <View style={styles.circleShareRow}>
        <View style={styles.circleShareIcon}>
          <Feather name="users" size={18} color={Colors.accentDark} />
        </View>
        <View style={styles.circleShareContent}>
          <ThemedText variant="bodyLarge" color="textPrimary">Partager dans mon cercle</ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary">
            {sharedToCircle
              ? 'Partagé ! Vos proches ont été notifiées.'
              : 'Notifie vos proches de ce scan'}
          </ThemedText>
        </View>
        <Switch
          value={sharedToCircle}
          onValueChange={handleShareToggle}
          trackColor={{ false: Colors.borderLight, true: Colors.accent }}
          thumbColor={sharedToCircle ? Colors.accentDark : '#f4f3f4'}
          disabled={sharedToCircle}
        />
      </View>
    </View>
  );
}
