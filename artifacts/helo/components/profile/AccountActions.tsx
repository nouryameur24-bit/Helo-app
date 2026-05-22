import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { exportJournalToPdf } from '@/lib/exportJournalPdf';
import { loadEarnedBadges, PACT_BADGES, type PactBadgeId } from '@/lib/pact';
import { ROUTES } from '@/types/routes';

import { useProfile } from './ProfileContext';
import { SettingRow } from './SettingRow';
import { useAccountActions } from './useAccountActions';
import styles from './profileStyles';

export function AccountActions() {
  const router = useRouter();
  const { userId, firstName } = useProfile();
  const { isPremium } = usePremium();
  const { handleExportData, handleDeleteAccount, handleLogout } = useAccountActions(userId);

  const [pactBadges, setPactBadges] = useState<PactBadgeId[]>([]);
  useEffect(() => { loadEarnedBadges().then(setPactBadges); }, []);

  return (
    <>
      {pactBadges.length > 0 && (
        <Animated.View entering={FadeInDown.delay(265).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            MES BADGES PACTE
          </ThemedText>
          <View style={styles.pactBadgesRow}>
            {PACT_BADGES.map((b) => {
              const earned = pactBadges.includes(b.id);
              return (
                <View key={b.id} style={[styles.pactBadgeTile, !earned && { opacity: 0.35 }]}>
                  <ThemedText style={{ fontSize: 28 }}>{b.emoji}</ThemedText>
                  <ThemedText style={!earned ? [styles.pactBadgeLabel, { color: Colors.textTertiary }] : styles.pactBadgeLabel}>
                    {b.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(270).duration(500)}>
        <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
          COMPTE
        </ThemedText>
        <Card padding={0} style={styles.settingGroup}>
          <SettingRow icon="zap" title="Mon Pacte" subtitle="Engagement quotidien · Streak 🔥" onPress={() => router.push(ROUTES.pact)} />
          <Divider />
          <SettingRow icon="package" title="Hēlo Memories" subtitle="Capsules temporelles de grossesse" onPress={() => router.push(ROUTES.memories)} />
          <Divider />
          <SettingRow icon="heart" title="Ma Nutrition" onPress={() => router.push(ROUTES.nutrition)} />
          <Divider />
          <SettingRow icon="home" title="Mon Environnement" onPress={() => router.push(ROUTES.homeScore)} />
          <Divider />
          <SettingRow icon="user" title="Mon profil" onPress={() => router.push(ROUTES.profileEdit)} />
          <Divider />
          <SettingRow icon="heart" title="Mode Partenaire" onPress={() => router.push(ROUTES.onboardingRole)} />
          <Divider />
          <SettingRow icon="bell" title="Notifications" onPress={() => router.push(ROUTES.notificationsSettings)} />
          <Divider />
          {/* V1: Communauté masquée, réactiver pour V2
          <SettingRow icon="users" title="Communauté" subtitle="Contributions & produits signalés" onPress={() => router.push(ROUTES.community)} />
          <Divider />
          */}
          <SettingRow icon="star" title="Hēlo Premium" onPress={() => router.push(ROUTES.premium)} />
          <Divider />
          <SettingRow icon="help-circle" title="Guide des fonctionnalités" subtitle="Comment marche chaque mode" onPress={() => router.push(ROUTES.guide)} />
          <Divider />
          <SettingRow icon="book-open" title="Méthodologie" onPress={() => router.push(ROUTES.methodology)} />
          <Divider />
          <SettingRow icon="file-text" title="CGU" onPress={() => router.push(ROUTES.termsLegal)} />
          <Divider />
          <SettingRow icon="shield" title="Confidentialité" onPress={() => router.push(ROUTES.privacyLegal)} />
          <Divider />
          <SettingRow icon="calendar" title="Ma Timeline de Grossesse" subtitle="Fresque visuelle de vos 40 semaines" onPress={() => router.push(ROUTES.timeline)} />
          <Divider />
          <SettingRow icon="smartphone" title="Widget & Apple Watch" subtitle="Glow Score sur l'écran d'accueil" onPress={() => router.push(ROUTES.widgetPreview)} />
          <Divider />
          <SettingRow icon="book" title="Exporter mon journal" subtitle="Générer un PDF de votre journal de grossesse" onPress={() => exportJournalToPdf(firstName)} />
          <Divider />
          <SettingRow icon="download" title="Exporter mes données" onPress={handleExportData} />
          <Divider />
          <SettingRow icon="trash-2" title="Supprimer mon compte" danger onPress={handleDeleteAccount} />
          <Divider />
          <SettingRow icon="mail" title="Contact" onPress={() => Linking.openURL('mailto:hello@helo-app.fr')} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.footer}>
        <View style={{
          alignSelf: 'center',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: Colors.accentLight,
          borderWidth: 1,
          borderColor: Colors.accent,
          marginBottom: Spacing.md,
        }}>
          <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, letterSpacing: 0.8, fontSize: 11 }}>
            BÊTA OUVERTE
          </ThemedText>
        </View>
        <ThemedText variant="bodySmall" color="textTertiary" style={[styles.version, { textAlign: 'center', paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm }]}>
          Vous participez à la phase bêta. Vos retours nous aident à améliorer Hēlo.
        </ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary" style={styles.version}>
          {`Version 1.0.0${isPremium ? ' · Premium ✓' : ''}`}
        </ThemedText>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <ThemedText variant="bodyLarge" color="danger" style={styles.logoutText}>
            Se déconnecter
          </ThemedText>
        </Pressable>
      </Animated.View>
    </>
  );
}
