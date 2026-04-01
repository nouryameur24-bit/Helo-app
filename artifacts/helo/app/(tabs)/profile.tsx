import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Switch,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { JournalEntry } from '@/app/(tabs)/journal';
import { useShelfData } from '@/hooks/useShelfData';
import { calculateGlowScore } from '@/lib/glowscore';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';
import { GlowScoreMini } from '@/components/GlowScoreMini';
import { NotificationPermissionScreen } from '@/components/NotificationPermissionScreen';
import { PartnerCodeChip, SettingRow } from '@/components/profile/SettingRow';
import styles from '@/components/profile/profileStyles';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useBabyMode } from '@/hooks/useBabyMode';
import { useBreastfeeding, BREASTFEEDING_PALETTE } from '@/hooks/useBreastfeeding';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile, setUserRole } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { PREMIUM_KEY } from '@/lib/purchases';
import {
  checkAndSendWeekMilestoneNotification,
  createCircle,
  getCircle,
  joinCircle,
  type CircleData,
} from '@/lib/circleUtils';
import { exportJournalToPdf } from '@/lib/exportJournalPdf';
import { loadEarnedBadges, PACT_BADGES, type PactBadgeId } from '@/lib/pact';
import { regeneratePartnerCode, unlinkPartner } from '@/lib/partnerUtils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function computeWeekFromDueDate(dueDate: string | null): number | null {
  if (!dueDate) return null;
  try {
    const due = new Date(dueDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksRemaining = (due.getTime() - now.getTime()) / msPerWeek;
    const week = Math.round(40 - weeksRemaining);
    if (week < 1) return null;
    return week;
  } catch {
    return null;
  }
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

  const {
    userId,
    role,
    firstName,
    trimester,
    dueDate,
    partnerCode,
    linkedUserId,
    linkedFirstName,
    refresh,
  } = useProfile();
  const isPartner = role === 'partner';
  const { babyMode, enableBabyMode, disableBabyMode } = useBabyMode();
  const {
    isBreastfeeding,
    enableBreastfeeding,
    disableBreastfeeding,
    showTransition: showBFTransition,
    changedProductsCount: bfChangedCount,
    dismissTransition: dismissBFTransition,
  } = useBreastfeeding();

  useEffect(() => {
    if (isBreastfeeding && !babyMode) enableBabyMode();
  }, [isBreastfeeding, babyMode, enableBabyMode]);

  const { isPremium, requirePremium, refresh: refreshPremium } = usePremium();
  const { shelf: profileShelf } = useShelfData(userId || undefined);
  const { score: glowScore } = calculateGlowScore(profileShelf);

  const [circleData, setCircleData] = useState<CircleData | null | undefined>(undefined);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);

  // Hidden dev shortcut: 5 taps on version number toggles premium (testing only)
  const [devTapCount, setDevTapCount] = useState(0);
  const devTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVersionTap = React.useCallback(async () => {
    if (devTapTimer.current) clearTimeout(devTapTimer.current);
    const next = devTapCount + 1;
    setDevTapCount(next);
    devTapTimer.current = setTimeout(() => setDevTapCount(0), 2000);
    if (next >= 5) {
      setDevTapCount(0);
      if (devTapTimer.current) clearTimeout(devTapTimer.current);
      const next_premium = !isPremium;
      await AsyncStorage.setItem(PREMIUM_KEY, next_premium ? 'true' : 'false');
      await refreshPremium();
      Alert.alert(
        '🛠 Dev Mode',
        next_premium ? 'Premium activé ✓' : 'Premium désactivé',
        [{ text: 'OK' }],
      );
    }
  }, [devTapCount, isPremium, refreshPremium]);

  useEffect(() => {
    if (!userId || isPartner) return;
    getCircle(userId).then(setCircleData).catch(() => setCircleData(null));
  }, [userId, isPartner]);

  useEffect(() => {
    if (!userId || isPartner || !firstName) return;
    const week = computeWeekFromDueDate(dueDate);
    if (week && week >= 1 && week <= 42) {
      checkAndSendWeekMilestoneNotification({ userId, firstName, currentWeek: week }).catch(() => {});
    }
  }, [userId, isPartner, firstName, dueDate]);

  const [contributionCount, setContributionCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [safeCount, setSafeCount] = useState(0);
  const [pactBadges, setPactBadges] = useState<PactBadgeId[]>([]);

  useEffect(() => { loadEarnedBadges().then(setPactBadges); }, []);

  useEffect(() => {
    if (!userId || isPartner || !isSupabaseConfigured) return;
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const { count: contributions } = await supabase
          .from('community_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'approved');
        if (!cancelled && contributions !== null) setContributionCount(contributions);

        const { count: scans } = await supabase
          .from('scan_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (!cancelled && scans !== null) setScanCount(scans);

        const { count: safe } = await supabase
          .from('scan_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('safety_level', 'safe');
        if (!cancelled && safe !== null) setSafeCount(safe);
      } catch {
        // Stats are non-critical — profile still renders without them
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [userId, isPartner]);

  const [localPartnerCode, setLocalPartnerCode] = useState<string | null>(partnerCode);
  useEffect(() => { setLocalPartnerCode(partnerCode); }, [partnerCode]);

  const handleShareCode = async () => {
    const code = localPartnerCode ?? partnerCode;
    if (!code) return;
    try {
      await Share.share({
        message: `Rejoins-moi sur Hēlo ! Entre mon code partenaire : ${code}`,
      });
    } catch {
      // Share not supported (web) — fallback to clipboard
      try {
        await Clipboard.setStringAsync(code);
        Alert.alert('Code copié', `Le code ${code} a été copié dans le presse-papiers.`);
      } catch {
        Alert.alert('Code partenaire', code);
      }
    }
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
    Alert.alert(
      'Déconnecter',
      isPartner
        ? `Voulez-vous vous déconnecter du compte de ${linkedFirstName ?? 'votre proche'} ?`
        : `Voulez-vous déconnecter ${linkedFirstName ?? 'votre partenaire'} ?`,
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
              if (isPartner) router.replace('/onboarding/role');
            } catch {
              Alert.alert('Erreur', 'Impossible de déconnecter.');
            }
          },
        },
      ],
    );
  };

  const handleExportData = async () => {
    try {
      const profileRaw = await AsyncStorage.getItem('user_profile');
      const localProfile = profileRaw ? JSON.parse(profileRaw) : {};

      let supabaseData: Record<string, unknown> = {};
      if (isSupabaseConfigured && userId) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
        const { data: scans } = await supabase.from('scan_history').select('*').eq('user_id', userId);
        const { data: submissions } = await supabase.from('community_submissions').select('*').eq('user_id', userId);
        supabaseData = {
          profile: profile ?? {},
          scan_history: scans ?? [],
          community_submissions: submissions ?? [],
        };
      }

      await Share.share({
        message: JSON.stringify({ exported_at: new Date().toISOString(), local_profile: localProfile, supabase: supabaseData }, null, 2),
        title: 'Mes données Hēlo',
      });
    } catch {
      Alert.alert('Erreur', "Impossible d'exporter les données.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Attention : cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Êtes-vous sûr ?',
              'Cette action supprimera définitivement toutes vos données.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AsyncStorage.clear();
                      if (isSupabaseConfigured && userId) {
                        await supabase.from('scan_history').delete().eq('user_id', userId);
                        await supabase.from('community_submissions').delete().eq('user_id', userId);
                        await supabase.from('partner_links').delete().eq('pregnant_user_id', userId);
                        await supabase.from('partner_links').delete().eq('partner_user_id', userId);
                        await supabase.from('profiles').delete().eq('user_id', userId);
                      }
                      router.replace('/onboarding');
                    } catch {
                      Alert.alert('Erreur', 'Impossible de supprimer le compte. Réessayez.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous réinitialiser votre session ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              router.replace('/onboarding');
            } catch {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            }
          },
        },
      ],
    );
  };

  const displayName = firstName || (isPartner ? 'Partenaire' : 'Utilisateur');
  const displayCode = localPartnerCode ?? partnerCode;
  const trimesterLabel = trimester ? `${trimester}e trimestre` : null;
  const currentWeek = computeWeekFromDueDate(dueDate);
  const isPostPartum = currentWeek !== null && currentWeek > 40;
  const weekProgress = currentWeek ? Math.min(1, currentWeek / 40) : 0;

  const weekAndTrimesterLabel = (() => {
    if (isBreastfeeding) return 'Mode allaitement 🤱';
    if (isPostPartum) return "Après l'accouchement";
    if (currentWeek && trimesterLabel) return `Semaine ${currentWeek} · ${trimesterLabel}`;
    if (trimesterLabel) return trimesterLabel;
    return null;
  })();

  const initial = displayName.charAt(0).toUpperCase();
  const safePercent = scanCount > 0 ? Math.round((safeCount / scanCount) * 100) : 0;

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
      <BreastfeedingTransition
        visible={showBFTransition}
        changedProductsCount={bfChangedCount}
        onDismiss={dismissBFTransition}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + Spacing.lg, paddingBottom: bottomPadding + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header Avatar */}
        <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.avatarSection}>
          <LinearGradient
            colors={isPartner ? ['#A8C4E0', '#6B9BBF'] : [Colors.accentLight, Colors.accent]}
            style={styles.avatar}
            accessibilityRole="image"
            accessibilityLabel={`Avatar de ${displayName}`}
          >
            <ThemedText variant="headlineLarge" style={styles.avatarInitial}>
              {initial}
            </ThemedText>
          </LinearGradient>
          <View style={styles.avatarInfo}>
            <ThemedText variant="headlineLarge" color="textPrimary">{displayName}</ThemedText>
            {isPartner ? (
              <ThemedText variant="bodyMedium" color="textSecondary">
                {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
              </ThemedText>
            ) : weekAndTrimesterLabel ? (
              <ThemedText variant="bodyMedium" color="textSecondary">{weekAndTrimesterLabel}</ThemedText>
            ) : null}
            {!isPartner && contributionCount > 5 && (
              <View style={styles.contributriceBadge}>
                <ThemedText variant="labelSmall" style={styles.contributriceBadgeText}>
                  Contributrice ✦
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Pregnancy progress bar */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.progressSection}>
            <View
              style={styles.progressBar}
              accessibilityRole="progressbar"
              accessibilityLabel={`Semaine ${currentWeek ?? 0} sur 40`}
              accessibilityValue={{ min: 0, max: 40, now: currentWeek ?? 0 }}
            >
              <View style={[styles.progressFill, { width: `${weekProgress * 100}%` }]} />
            </View>
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.progressLabel}>
              {currentWeek ? `${currentWeek} / 40 semaines` : '0 / 40 semaines'}
            </ThemedText>
          </Animated.View>
        )}

        {/* GlowScoreMini */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Card style={styles.glowCard} padding={Spacing.xl}>
              <View style={styles.glowCardInner}>
                <GlowScoreMini score={glowScore} trend="stable" />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Stats grid */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <Card style={styles.statCard} padding={Spacing.lg}>
                <ThemedText variant="headlineLarge" color="accent">{String(scanCount)}</ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">Scans</ThemedText>
              </Card>
              <Card style={styles.statCard} padding={Spacing.lg}>
                <ThemedText variant="headlineLarge" color="accent">{String(safeCount)}</ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">Produits sûrs</ThemedText>
              </Card>
            </View>
            <View style={styles.statsRow}>
              <Card style={styles.statCard} padding={Spacing.lg}>
                <ThemedText variant="headlineLarge" color="accent">{`${safePercent}%`}</ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">% safe</ThemedText>
              </Card>
              <Card style={styles.statCard} padding={Spacing.lg}>
                <ThemedText variant="headlineLarge" color="accent">{String(contributionCount)}</ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">Contributions</ThemedText>
              </Card>
            </View>
          </Animated.View>
        )}

        {/* Mon Cercle */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(190).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              MON CERCLE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              {circleData ? (
                <SettingRow
                  icon="users"
                  title="Mon Cercle"
                  subtitle={`${circleData.members.length} membre${circleData.members.length > 1 ? 's' : ''} · Voir le fil d'activité`}
                  onPress={() => router.push('/circle' as never)}
                />
              ) : (
                <>
                  <SettingRow
                    icon="users"
                    title="Créer mon cercle"
                    subtitle={isPremium ? "Invitez jusqu'à 8 proches" : 'Fonctionnalité Premium ✦'}
                    onPress={async () => {
                      if (!isPremium) { requirePremium('circle'); return; }
                      setIsCreatingCircle(true);
                      try {
                        await createCircle(userId, firstName || 'Anonyme');
                        const data = await getCircle(userId);
                        setCircleData(data);
                        router.push('/circle' as never);
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Erreur';
                        if (msg !== 'PREMIUM_REQUIRED') Alert.alert('Erreur', msg);
                      } finally {
                        setIsCreatingCircle(false);
                      }
                    }}
                  />
                  <Divider />
                  <SettingRow
                    icon="link"
                    title="Rejoindre un cercle"
                    subtitle="Entrez un code d'invitation"
                    onPress={() => setShowJoinModal(true)}
                  />
                </>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Join circle modal */}
        <Modal
          visible={showJoinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowJoinModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowJoinModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ThemedText variant="headlineMedium" style={styles.modalTitle}>
              Rejoindre un cercle
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.xl }}>
              Entrez le code à 8 caractères partagé par la créatrice du cercle.
            </ThemedText>
            <TextInput
              style={styles.circleCodeInput}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="EX: AB3C7DEF"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
              autoFocus
              accessibilityLabel="Code d'invitation"
            />
            <Pressable
              onPress={async () => {
                if (!joinCode.trim() || isJoining) return;
                setIsJoining(true);
                try {
                  await joinCircle(userId, firstName || 'Anonyme', joinCode.trim());
                  const data = await getCircle(userId);
                  setCircleData(data);
                  setShowJoinModal(false);
                  setJoinCode('');
                  router.push('/circle' as never);
                } catch (err) {
                  Alert.alert('Erreur', err instanceof Error ? err.message : 'Code invalide');
                } finally {
                  setIsJoining(false);
                }
              }}
              disabled={isJoining || !joinCode.trim()}
              style={({ pressed }) => [styles.joinBtn, { opacity: pressed || isJoining ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Rejoindre le cercle"
            >
              <ThemedText variant="labelLarge" style={{ color: '#fff' }}>
                {isJoining ? 'Rejoindre…' : 'Rejoindre'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setShowJoinModal(false)} style={styles.cancelModalBtn}>
              <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
            </Pressable>
          </View>
        </Modal>

        {/* Partner section — pregnant user */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              PARTENAIRE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              {displayCode ? (
                <>
                  <View style={styles.settingRow}>
                    <View style={[styles.settingIcon, { backgroundColor: Colors.accentLight }]}>
                      <Feather name="key" size={18} color={Colors.accentDark} />
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
                      <SettingRow icon="user-x" title={`Déconnecter ${linkedFirstName ?? 'le partenaire'}`} danger onPress={handleDisconnectPartner} />
                    </>
                  )}
                </>
              ) : (
                <SettingRow icon="users" title="Inviter un partenaire" subtitle="Générez un code après avoir créé votre profil" />
              )}
            </Card>
          </Animated.View>
        )}

        {/* Partner disconnection — partner role */}
        {isPartner && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              PARTENAIRE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.accentLight }]}>
                  <Feather name="heart" size={18} color={Colors.accentDark} />
                </View>
                <View style={styles.settingContent}>
                  <ThemedText variant="bodyLarge" color="textPrimary">
                    {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">Vous voyez le placard partagé</ThemedText>
                </View>
              </View>
              <Divider />
              <SettingRow icon="user-x" title="Déconnecter" subtitle="Revenir à la sélection du rôle" danger onPress={handleDisconnectPartner} />
            </Card>
          </Animated.View>
        )}

        {/* MODE — breastfeeding */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              MODE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: isBreastfeeding ? BREASTFEEDING_PALETTE.accentLight : Colors.accentLight }]}>
                  <ThemedText style={{ fontSize: 18 }}>🤱</ThemedText>
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
        )}

        {/* MODE BÉBÉ */}
        {!isPartner && (
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
        )}

        {/* Pact badges */}
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

        {/* COMPTE menu */}
        <Animated.View entering={FadeInDown.delay(270).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            COMPTE
          </ThemedText>
          <Card padding={0} style={styles.settingGroup}>
            <SettingRow icon="zap" title="Mon Pacte" subtitle="Engagement quotidien · Streak 🔥" onPress={() => router.push('/pact' as never)} />
            <Divider />
            <SettingRow icon="package" title="Hēlo Memories" subtitle="Capsules temporelles de grossesse" onPress={() => router.push('/memories' as never)} />
            <Divider />
            <SettingRow icon="heart" title="Ma Nutrition" onPress={() => router.push('/nutrition' as never)} />
            <Divider />
            <SettingRow icon="home" title="Mon Environnement" onPress={() => router.push('/home-score' as never)} />
            <Divider />
            <SettingRow icon="user" title="Mon profil" onPress={() => router.push('/profile/edit' as never)} />
            <Divider />
            <SettingRow icon="heart" title="Mode Partenaire" onPress={() => router.push('/onboarding/role' as never)} />
            <Divider />
            <SettingRow icon="bell" title="Notifications" onPress={() => router.push('/notifications-settings' as never)} />
            <Divider />
            <SettingRow icon="star" title="Hēlo Premium" onPress={() => router.push('/premium' as never)} />
            <Divider />
            <SettingRow icon="book-open" title="Méthodologie" onPress={() => router.push('/methodology' as never)} />
            <Divider />
            <SettingRow icon="file-text" title="CGU" onPress={() => router.push('/legal/terms' as never)} />
            <Divider />
            <SettingRow icon="shield" title="Confidentialité" onPress={() => router.push('/legal/privacy' as never)} />
            <Divider />
            <SettingRow icon="calendar" title="Ma Timeline de Grossesse" subtitle="Fresque visuelle de vos 40 semaines" onPress={() => router.push('/timeline' as never)} />
            <Divider />
            <SettingRow icon="camera" title="Mode Miroir AR" subtitle="Halos colorés sur vos produits en temps réel" onPress={() => router.push('/ar-mirror' as never)} />
            <Divider />
            <SettingRow icon="smartphone" title="Widget & Apple Watch" subtitle="Glow Score sur l'écran d'accueil" onPress={() => router.push('/widget-preview' as never)} />
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

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.footer}>
          <Pressable onPress={handleVersionTap} accessibilityRole="button" accessibilityLabel="Version">
            <ThemedText variant="bodySmall" color="textTertiary" style={styles.version}>
              {devTapCount > 0 && devTapCount < 5
                ? `Version 1.0.0 · dev (${devTapCount}/5)`
                : `Version 1.0.0${isPremium ? ' · Premium ✓' : ''}`}
            </ThemedText>
          </Pressable>
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
      </ScrollView>
    </View>
  );
}
