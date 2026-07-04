import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_LABELS,
  NotificationSettings,
  NotificationType,
  getNotificationSettings,
  saveNotificationSettings,
} from '@/lib/notifications';

const NOTIFICATION_TYPES: NotificationType[] = [
  'weekly_brief',
  'trimester_change',
  'product_reclassified',
  'partner_activity',
  'inactivity_reminder',
  'community_approved',
];

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    getNotificationSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSetting = useCallback(
    async (key: keyof NotificationSettings, value: boolean | number) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await saveNotificationSettings(updated);
    },
    [settings],
  );

  const handleTypeToggle = useCallback(
    (type: NotificationType, value: boolean) => {
      updateSetting(type, value);
    },
    [updateSetting],
  );

  const handleMaxChange = useCallback(
    (delta: number) => {
      const next = Math.max(1, Math.min(3, settings.maxPerWeek + delta));
      updateSetting('maxPerWeek', next);
    },
    [settings.maxPerWeek, updateSetting],
  );

  if (!loaded) return null;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineLarge" color="textPrimary">
            Notifications
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            TYPES DE NOTIFICATIONS
          </ThemedText>
          <Card padding={0} style={styles.group}>
            {NOTIFICATION_TYPES.map((type, idx) => {
              const label = NOTIFICATION_LABELS[type];
              const isLast = idx === NOTIFICATION_TYPES.length - 1;
              return (
                <View key={type}>
                  <View style={styles.row}>
                    <View style={styles.rowContent}>
                      <ThemedText variant="bodyLarge" color="textPrimary">
                        {label.title}
                      </ThemedText>
                      <ThemedText variant="bodySmall" color="textTertiary">
                        {label.description}
                      </ThemedText>
                    </View>
                    <Switch
                      value={settings[type]}
                      onValueChange={(v) => handleTypeToggle(type, v)}
                      trackColor={{ false: Colors.border, true: Colors.accentLight }}
                      thumbColor={settings[type] ? Colors.accent : Colors.textTertiary}
                      ios_backgroundColor={Colors.border}
                    />
                  </View>
                  {!isLast && <Divider />}
                </View>
              );
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            LIMITES
          </ThemedText>
          <Card padding={0} style={styles.group}>
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <ThemedText variant="bodyLarge" color="textPrimary">
                  Maximum par semaine
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Nombre maximum de notifications par semaine
                </ThemedText>
              </View>
              <View style={styles.stepper}>
                <Pressable accessibilityRole="button" accessibilityLabel="Retirer"
                  onPress={() => handleMaxChange(-1)}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    {
                      backgroundColor: settings.maxPerWeek <= 1 ? Colors.border : Colors.accentLight,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  disabled={settings.maxPerWeek <= 1}
                >
                  <Feather name="minus" size={14} color={settings.maxPerWeek <= 1 ? Colors.textTertiary : Colors.accent} />
                </Pressable>
                <ThemedText variant="bodyLarge" color="textPrimary" style={styles.stepperValue}>
                  {settings.maxPerWeek}
                </ThemedText>
                <Pressable accessibilityRole="button" accessibilityLabel="Ajouter"
                  onPress={() => handleMaxChange(1)}
                  style={({ pressed }) => [
                    styles.stepperBtn,
                    {
                      backgroundColor: settings.maxPerWeek >= 3 ? Colors.border : Colors.accentLight,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  disabled={settings.maxPerWeek >= 3}
                >
                  <Feather name="plus" size={14} color={settings.maxPerWeek >= 3 ? Colors.textTertiary : Colors.accent} />
                </Pressable>
              </View>
            </View>
            <Divider />
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <ThemedText variant="bodyLarge" color="textPrimary">
                  Heures silencieuses
                </ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Aucune notification de 22h à 8h
                </ThemedText>
              </View>
              <Switch
                value={settings.quietHours}
                onValueChange={(v) => updateSetting('quietHours', v)}
                trackColor={{ false: Colors.border, true: Colors.accentLight }}
                thumbColor={settings.quietHours ? Colors.accent : Colors.textTertiary}
                ios_backgroundColor={Colors.border}
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(400)}>
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.footer}>
            Les préférences sont sauvegardées automatiquement.
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
  },
});
