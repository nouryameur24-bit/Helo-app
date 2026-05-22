import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { styles } from './homeStyles';

export function HomeDisclaimer() {
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(500)}>
      <Card style={styles.disclaimerCard} padding={Spacing.lg}>
        <View style={styles.disclaimerHeader}>
          <Feather name="info" size={14} color={Colors.textTertiary} />
          <ThemedText variant="labelSmall" color="textTertiary" style={{ marginLeft: 6 }}>
            INFORMATION MÉDICALE
          </ThemedText>
        </View>
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 6, lineHeight: 18 }}>
          Hēlo est un outil d&apos;information. Consultez votre médecin avant de modifier vos habitudes pendant la grossesse.
        </ThemedText>
      </Card>
    </Animated.View>
  );
}
