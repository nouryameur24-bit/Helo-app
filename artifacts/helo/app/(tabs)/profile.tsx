import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NotificationPermissionScreen } from '@/components/NotificationPermissionScreen';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile, setUserRole } from '@/hooks/useProfile';
import { regeneratePartnerCode, unlinkPartner } from '@/lib/partnerUtils';

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  rightContent?: React.ReactNode;
}

function SettingRow({ icon, title, subtitle, onPress, danger, rightContent }: SettingRowProps) {
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
      {rightContent ?? <Feather name="chevron-right" size={16} color={Colors.textTertiary} />}
    </Pressable>
  );
}

function PartnerCodeChip({ code }: { code: string }) {
  const handleCopy = () => {
    Clipboard.setStringAsync(code);
  };
  return (
    <Pressable onPress={handleCopy} style={styles.codeChip}>
      <ThemedText variant="headlineMedium" color="accent" style={styles.codeText}>
        {code}
      </ThemedText>
      <Feather name="copy" size={16} color={Colors.accent} />
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

  const { userId, role, firstName, trimester, partnerCode, linkedUserId, linkedFirstName, refresh } = useProfile();
  const isPartner = role === 'partner';
  const [localPartnerCode, setLocalPartnerCode] = useState<string | null>(partnerCode);

  useEffect(() => {
    setLocalPartnerCode(partnerCode);
  }, [partnerCode]);

  const handleShareCode = () => {
    const code = localPartnerCode ?? partnerCode;
    if (!code) return;
    Share.share({
      message: `Rejoins-moi sur Hēlo ! Entre mon code partenaire pour suivre mon placard et scanner des produits pour moi : ${code}`,
    });
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      'Régénérer le code',
      'Cela va créer un nouveau code et déconnecter votre partenaire actuel.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer',
          style: 'destructive',
          onPress: async () => {
            try {
              const newCode = await regeneratePartnerCode(userId);
              setLocalPartnerCode(newCode);
              const profileRaw = await AsyncStorage.getItem('user_profile');
              if (profileRaw) {
                const profile = JSON.parse(profileRaw);
                profile.partnerCode = newCode;
                await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
              }
              await refresh();
            } catch {
              Alert.alert('Erreur', 'Impossible de régénérer le code.');
            }
          },
        },
      ],
    );
  };

  const handleDisconnectPartner = () => {
    const name = isPartner ? linkedFirstName : linkedFirstName;
    Alert.alert(
      'Déconnecter',
      isPartner
        ? `Voulez-vous vous déconnecter du compte de ${name ?? 'votre proche'} ?`
        : `Voulez-vous déconnecter ${name ?? 'votre partenaire'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkPartner({ userId, role });
              await setUserRole('pregnant');
              await AsyncStorage.removeItem('@helo_linked_user_id');
              await AsyncStorage.removeItem('@helo_linked_first_name');
              await refresh();
              if (isPartner) {
                router.replace('/onboarding/role');
              }
            } catch {
              Alert.alert('Erreur', 'Impossible de déconnecter.');
            }
          },
        },
      ],
    );
  };

  const displayName = firstName || (isPartner ? 'Partenaire' : 'Utilisateur');
  const displayCode = localPartnerCode ?? partnerCode;
  const trimesterLabel = trimester ? `${trimester}e trimestre` : 'Non défini';

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
            colors={isPartner ? ['#A8C4E0', '#6B9BBF'] : [Colors.accentLight, Colors.accent]}
            style={styles.avatar}
          >
            <Feather name={isPartner ? 'heart' : 'user'} size={36} color="#fff" />
          </LinearGradient>
          <View style={styles.avatarInfo}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              {displayName}
            </ThemedText>
            {isPartner ? (
              <ThemedText variant="bodyMedium" color="textSecondary">
                {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
              </ThemedText>
            ) : (
              <ThemedText variant="bodyMedium" color="textSecondary">
                {trimesterLabel}
              </ThemedText>
            )}
          </View>
          {!isPartner && trimester && (
            <View style={[styles.weekBadge, { backgroundColor: Colors.accentLight }]}>
              <ThemedText variant="labelSmall" color="accentDark">T{trimester}</ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Stats */}
        {!isPartner && (
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
        )}

        {/* Partner section - pregnant user */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              PARTENAIRE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              {displayCode ? (
                <>
                  <View style={styles.settingRow}>
                    <View style={[styles.settingIcon, { backgroundColor: Colors.backgroundSecondary }]}>
                      <Feather name="key" size={18} color={Colors.textSecondary} />
                    </View>
                    <View style={styles.settingContent}>
                      <ThemedText variant="bodyLarge" color="textPrimary">Mon code</ThemedText>
                      <ThemedText variant="bodySmall" color="textTertiary">Partagez ce code avec votre partenaire</ThemedText>
                    </View>
                    <PartnerCodeChip code={displayCode} />
                  </View>
                  <Divider />
                  <SettingRow icon="share-2" title="Partager mon code" onPress={handleShareCode} />
                  <Divider />
                  <SettingRow icon="refresh-cw" title="Régénérer le code" subtitle="Déconnecte le partenaire actuel" onPress={handleRegenerateCode} />
                  {linkedUserId && (
                    <>
                      <Divider />
                      <SettingRow
                        icon="user-x"
                        title={`Déconnecter ${linkedFirstName ?? 'le partenaire'}`}
                        danger
                        onPress={handleDisconnectPartner}
                      />
                    </>
                  )}
                </>
              ) : (
                <SettingRow icon="users" title="Inviter un partenaire" subtitle="Générez un code après avoir créé votre profil" />
              )}
            </Card>
          </Animated.View>
        )}

        {/* Partner disconnection for partner role */}
        {isPartner && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              PARTENAIRE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.backgroundSecondary }]}>
                  <Feather name="heart" size={18} color={Colors.textSecondary} />
                </View>
                <View style={styles.settingContent}>
                  <ThemedText variant="bodyLarge" color="textPrimary">
                    {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">Vous voyez le placard partagé</ThemedText>
                </View>
              </View>
              <Divider />
              <SettingRow
                icon="user-x"
                title="Déconnecter"
                subtitle="Revenir à la sélection du rôle"
                danger
                onPress={handleDisconnectPartner}
              />
            </Card>
          </Animated.View>
        )}

        {/* Settings — pregnancy (only for pregnant users) */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(260).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              GROSSESSE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              <SettingRow icon="heart" title="Semaine de grossesse" subtitle={trimesterLabel} />
              <Divider />
              <SettingRow icon="alert-triangle" title="Allergies connues" subtitle="Aucune renseignée" />
              <Divider />
              <SettingRow icon="user" title="Profil médical" />
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(320).duration(500)}>
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

        <Animated.View entering={FadeInDown.delay(380).duration(500)}>
          <Card padding={0} style={styles.settingGroup}>
            <SettingRow icon="log-out" title="Se déconnecter" danger />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(440).duration(500)}>
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
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  codeText: {
    letterSpacing: 3,
  },
  version: {
    textAlign: 'center',
  },
});
