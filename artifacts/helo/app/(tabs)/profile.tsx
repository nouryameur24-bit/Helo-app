import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { NotificationPermissionScreen } from '@/components/NotificationPermissionScreen';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, title, subtitle, onPress, danger }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? Colors.dangerLight : Colors.backgroundSecondary }]}>
        <Feather name={icon} size={18} color={danger ? Colors.danger : Colors.textSecondary} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText variant="bodyLarge" color={danger ? 'danger' : 'textPrimary'}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="bodySmall" color="textTertiary">{subtitle}</ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;
  const {
    showPermissionScreen,
    setShowPermissionScreen,
    requestPermission,
    dismissPermissionScreen,
    triggerPermissionScreenIfNeeded,
  } = useNotifications();

  useEffect(() => {
    triggerPermissionScreenIfNeeded();
  }, [triggerPermissionScreenIfNeeded]);

  const handleNotificationsPress = () => {
    router.push('/notifications-settings' as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <NotificationPermissionScreen
        visible={showPermissionScreen}
        onAllow={async () => {
          await requestPermission();
          setShowPermissionScreen(false);
        }}
        onSkip={dismissPermissionScreen}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View entering={FadeInDown.delay(0).duration(500)}>
          <ThemedText variant="headlineLarge" color="textPrimary" style={{ marginBottom: Spacing.xxl }}>
            Profil
          </ThemedText>
        </Animated.View>

        {/* Avatar section */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.avatarSection}>
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent]}
            style={styles.avatar}
          >
            <Feather name="user" size={36} color="#fff" />
          </LinearGradient>
          <View style={styles.avatarInfo}>
            <ThemedText variant="headlineMedium" color="textPrimary">Sophie Martin</ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary">24 semaines de grossesse</ThemedText>
          </View>
          <View style={[styles.weekBadge, { backgroundColor: Colors.accentLight }]}>
            <ThemedText variant="labelSmall" color="accentDark">SA 24</ThemedText>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.statsRow}>
          {[
            { value: '47', label: 'Scans' },
            { value: '38', label: 'Sûrs' },
            { value: '9', label: 'Vigilance' },
          ].map((stat, i) => (
            <Card key={i} style={styles.statCard} padding={Spacing.lg}>
              <ThemedText variant="headlineLarge" color="accent">{stat.value}</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">{stat.label}</ThemedText>
            </Card>
          ))}
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            GROSSESSE
          </ThemedText>
          <Card padding={0} style={styles.settingGroup}>
            <SettingRow icon="heart" title="Semaine de grossesse" subtitle="Semaine 24" />
            <Divider />
            <SettingRow icon="alert-triangle" title="Allergies connues" subtitle="Aucune renseignée" />
            <Divider />
            <SettingRow icon="user" title="Profil médical" />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            APPLICATION
          </ThemedText>
          <Card padding={0} style={styles.settingGroup}>
            <SettingRow icon="bell" title="Notifications" onPress={handleNotificationsPress} />
            <Divider />
            <SettingRow icon="file-text" title="Mentions légales" onPress={() => router.push('/legal/terms')} />
            <Divider />
            <SettingRow icon="shield" title="Politique de confidentialité" onPress={() => router.push('/legal/privacy')} />
            <Divider />
            <SettingRow icon="info" title="Notre méthodologie" subtitle="Sources & données" onPress={() => router.push('/methodology')} />
            <Divider />
            <SettingRow icon="help-circle" title="Aide & support" />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(500)}>
          <Card padding={0} style={styles.settingGroup}>
            <SettingRow icon="log-out" title="Se déconnecter" danger />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(380).duration(500)}>
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.version}>
            Hēlo v1.0.0 · Pour votre bien-être et celui de votre bébé
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
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInfo: {
    flex: 1,
    gap: 2,
  },
  weekBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  settingGroup: {
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 1,
  },
  version: {
    textAlign: 'center',
  },
});
