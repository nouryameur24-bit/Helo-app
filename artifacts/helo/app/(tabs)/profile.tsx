import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBabyMode } from '@/hooks/useBabyMode';
import { useBreastfeeding, BREASTFEEDING_PALETTE } from '@/hooks/useBreastfeeding';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';

import type { JournalEntry } from '@/app/(tabs)/journal';

import { GlowScoreMini } from '@/components/GlowScoreMini';
import { NotificationPermissionScreen } from '@/components/NotificationPermissionScreen';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile, setUserRole } from '@/hooks/useProfile';
import { regeneratePartnerCode, unlinkPartner } from '@/lib/partnerUtils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
      <View style={[styles.settingIcon, { backgroundColor: danger ? Colors.dangerLight : Colors.accentLight }]}>
        <Feather name={icon} size={18} color={danger ? Colors.danger : Colors.accentDark} />
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

function computeWeekFromDueDate(dueDate: string | null): number | null {
  if (!dueDate) return null;
  try {
    const due = new Date(dueDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksRemaining = (due.getTime() - now.getTime()) / msPerWeek;
    const week = Math.round(40 - weeksRemaining);
    if (week < 1) return null;
    return week; // may be > 40 post-partum
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

  const { userId, role, firstName, trimester, dueDate, partnerCode, linkedUserId, linkedFirstName, refresh } = useProfile();
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
    if (isBreastfeeding && !babyMode) {
      enableBabyMode();
    }
  }, [isBreastfeeding, babyMode, enableBabyMode]);

  const [contributionCount, setContributionCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [safeCount, setSafeCount] = useState(0);

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
      } catch {}
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [userId, isPartner]);

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

  const handleExportJournal = async () => {
    try {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable && Platform.OS !== 'web') {
        Alert.alert('Non disponible', 'Le partage n\'est pas disponible sur cet appareil.');
        return;
      }

      const journalRaw = await AsyncStorage.getItem('journal_entries');
      const journalEntries: JournalEntry[] = journalRaw ? JSON.parse(journalRaw) : [];
      journalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const shelfRaw = await AsyncStorage.getItem('@helo_shelf');
      const shelfItems: Array<{ productName?: string; brand?: string; verdict?: string }> = shelfRaw
        ? JSON.parse(shelfRaw)
        : [];

      const totalShelf = shelfItems.length;
      const safeShelf = shelfItems.filter((i) => i.verdict === 'safe').length;
      const cautionShelf = shelfItems.filter((i) => i.verdict === 'caution').length;
      const dangerShelf = shelfItems.filter((i) => i.verdict === 'danger').length;
      let glowScore = 0;
      if (totalShelf > 0) {
        glowScore = (safeShelf * 100 + cautionShelf * 40) / totalShelf;
        if (dangerShelf === 0) glowScore = Math.min(100, glowScore + 5);
        glowScore = Math.max(0, Math.min(100, Math.round(glowScore)));
      }

      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const coverPage = `
        <div class="cover">
          <div class="cover-logo">Hēlo</div>
          <div class="cover-title">Mon Journal de Grossesse</div>
          ${firstName ? `<div class="cover-name">${escapeHtml(firstName)}</div>` : ''}
          <div class="cover-date">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div class="glow-score">
            <div class="glow-label">Glow Score</div>
            <div class="glow-value">${glowScore}</div>
          </div>
        </div>
      `;

      const entriesHtml = journalEntries.length === 0
        ? '<p class="empty">Aucune entrée dans le journal.</p>'
        : journalEntries.map((entry) => {
            const d = new Date(entry.date);
            const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const symptomsStr = entry.symptoms.length > 0
              ? `<div class="symptoms">${entry.symptoms.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>`
              : '';
            const noteStr = entry.note
              ? `<p class="entry-note">${escapeHtml(entry.note).replace(/\n/g, '<br/>')}</p>`
              : '';
            return `
              <div class="entry">
                <div class="entry-header">
                  <span class="mood">${entry.mood}</span>
                  <div class="entry-meta">
                    <div class="entry-date">${escapeHtml(dateStr)}</div>
                    ${entry.weekOfPregnancy ? `<div class="entry-week">Semaine ${entry.weekOfPregnancy}</div>` : ''}
                  </div>
                </div>
                ${symptomsStr}
                ${noteStr}
              </div>
            `;
          }).join('');

      const shelfHtml = shelfItems.length === 0
        ? '<p class="empty">Placard vide.</p>'
        : `<ul class="shelf-list">${shelfItems.map((item) => {
            const verdictColor = item.verdict === 'danger' ? '#C27B7B' : item.verdict === 'caution' ? '#D4A853' : '#7CB69F';
            const verdictLabel = item.verdict === 'danger' ? 'Déconseillé' : item.verdict === 'caution' ? 'Vigilance' : 'Sûr';
            return `<li><span class="product-name">${escapeHtml(item.productName ?? 'Produit')}</span>${item.brand ? ` — ${escapeHtml(item.brand)}` : ''} <span style="color:${verdictColor};font-weight:600;">${verdictLabel}</span></li>`;
          }).join('')}</ul>`;

      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Georgia, serif; color: #2D2926; background: #FFFAF5; }
            .cover {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: linear-gradient(160deg, #FFF5EE 0%, #E8D5B0 100%);
              padding: 60px 40px;
              page-break-after: always;
            }
            .cover-logo { font-size: 48px; font-weight: 700; letter-spacing: 4px; color: #A88B4A; margin-bottom: 16px; }
            .cover-title { font-size: 28px; font-weight: 400; color: #2D2926; margin-bottom: 12px; letter-spacing: 1px; }
            .cover-name { font-size: 22px; font-style: italic; color: #8C7E75; margin-bottom: 8px; }
            .cover-date { font-size: 14px; color: #B8ADA6; margin-bottom: 40px; letter-spacing: 0.5px; }
            .glow-score { text-align: center; background: white; padding: 24px 48px; border-radius: 16px; border: 1px solid #E8D5B0; }
            .glow-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #B8ADA6; margin-bottom: 8px; }
            .glow-value { font-size: 48px; font-weight: 700; color: #C9A96E; }
            .section { padding: 40px; max-width: 800px; margin: 0 auto; }
            .section-title { font-size: 20px; font-weight: 700; color: #A88B4A; border-bottom: 2px solid #E8D5B0; padding-bottom: 12px; margin-bottom: 24px; letter-spacing: 0.5px; }
            .entry { background: white; border: 1px solid #EDE7E1; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
            .entry-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
            .mood { font-size: 32px; }
            .entry-meta { flex: 1; }
            .entry-date { font-size: 15px; font-weight: 600; color: #2D2926; }
            .entry-week { font-size: 12px; color: #8C7E75; margin-top: 2px; }
            .symptoms { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
            .chip { background: #E8D5B0; color: #A88B4A; padding: 3px 10px; border-radius: 999px; font-size: 12px; }
            .entry-note { font-size: 14px; color: #8C7E75; line-height: 1.6; }
            .empty { color: #B8ADA6; font-style: italic; padding: 20px 0; }
            .shelf-list { list-style: none; padding: 0; }
            .shelf-list li { padding: 10px 0; border-bottom: 1px solid #F5F0EB; font-size: 14px; color: #2D2926; }
            .product-name { font-weight: 600; }
          </style>
        </head>
        <body>
          ${coverPage}
          <div class="section">
            <div class="section-title">Mes entrées de journal</div>
            ${entriesHtml}
          </div>
          <div class="section">
            <div class="section-title">Mon placard beauté</div>
            ${shelfHtml}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager mon journal de grossesse',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF. Réessayez.');
    }
  };

  const handleExportData = async () => {
    try {
      const profileRaw = await AsyncStorage.getItem('user_profile');
      const localProfile = profileRaw ? JSON.parse(profileRaw) : {};

      let supabaseData: Record<string, unknown> = {};
      if (isSupabaseConfigured && userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const { data: scans } = await supabase
          .from('scan_history')
          .select('*')
          .eq('user_id', userId);

        const { data: submissions } = await supabase
          .from('community_submissions')
          .select('*')
          .eq('user_id', userId);

        supabaseData = {
          profile: profile ?? {},
          scan_history: scans ?? [],
          community_submissions: submissions ?? [],
        };
      }

      const exportPayload = {
        exported_at: new Date().toISOString(),
        local_profile: localProfile,
        supabase: supabaseData,
      };

      await Share.share({
        message: JSON.stringify(exportPayload, null, 2),
        title: 'Mes données Hēlo',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible d\'exporter les données.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Attention : cette action est irréversible. Toutes vos données locales et en ligne seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Êtes-vous sûr ?',
              'Cette action supprimera définitivement toutes vos données. Vous ne pourrez pas récupérer votre compte.',
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
                      Alert.alert('Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
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
    if (isPostPartum) return 'Après l\'accouchement';
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
          >
            <ThemedText variant="headlineLarge" style={styles.avatarInitial}>
              {initial}
            </ThemedText>
          </LinearGradient>
          <View style={styles.avatarInfo}>
            <ThemedText variant="headlineLarge" color="textPrimary">
              {displayName}
            </ThemedText>
            {isPartner ? (
              <ThemedText variant="bodyMedium" color="textSecondary">
                {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
              </ThemedText>
            ) : (
              weekAndTrimesterLabel ? (
                <ThemedText variant="bodyMedium" color="textSecondary">
                  {weekAndTrimesterLabel}
                </ThemedText>
              ) : null
            )}
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
            <View style={styles.progressBar}>
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
                <GlowScoreMini score={75} trend="stable" />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Stats 2x2 grid */}
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

        {/* MODE — breastfeeding toggle */}
        {!isPartner && (
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
              MODE
            </ThemedText>
            <Card padding={0} style={styles.settingGroup}>
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, {
                  backgroundColor: isBreastfeeding ? BREASTFEEDING_PALETTE.accentLight : Colors.accentLight,
                }]}>
                  <ThemedText style={{ fontSize: 18 }}>🤱</ThemedText>
                </View>
                <View style={styles.settingContent}>
                  <ThemedText variant="labelLarge" color="textPrimary">
                    Mode allaitement
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">
                    {isBreastfeeding
                      ? 'Actif — analyses adaptées à l\'allaitement'
                      : 'Analyse vos produits pour l\'allaitement'}
                  </ThemedText>
                </View>
                <Switch
                  value={isBreastfeeding}
                  onValueChange={async (val) => {
                    if (val) {
                      await enableBreastfeeding();
                    } else {
                      await disableBreastfeeding();
                    }
                  }}
                  trackColor={{
                    false: Colors.borderLight,
                    true: BREASTFEEDING_PALETTE.accent,
                  }}
                  thumbColor={isBreastfeeding ? '#FFF' : Colors.textTertiary}
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
                    {isBreastfeeding
                      ? 'Activé automatiquement avec le mode allaitement'
                      : 'Analyse les ingrédients selon les risques bébé (0-3 ans)'}
                  </ThemedText>
                </View>
                <Switch
                  value={babyMode}
                  onValueChange={(val) => val ? enableBabyMode() : disableBabyMode()}
                  disabled={isBreastfeeding}
                  trackColor={{ false: Colors.borderLight, true: Colors.accent }}
                  thumbColor={babyMode ? Colors.accentDark : '#f4f3f4'}
                />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* COMPTE menu */}
        <Animated.View entering={FadeInDown.delay(270).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            COMPTE
          </ThemedText>
          <Card padding={0} style={styles.settingGroup}>
            <SettingRow
              icon="heart"
              title="Ma Nutrition"
              onPress={() => router.push('/nutrition' as never)}
            />
            <Divider />
            <SettingRow
              icon="home"
              title="Mon Environnement"
              onPress={() => router.push('/home-score' as never)}
            />
            <Divider />
            <SettingRow
              icon="user"
              title="Mon profil"
              onPress={() => {
                try { router.push('/profile/edit' as never); } catch {}
              }}
            />
            <Divider />
            <SettingRow
              icon="heart"
              title="Mode Partenaire"
              onPress={() => {
                try { router.push('/onboarding/role' as never); } catch {}
              }}
            />
            <Divider />
            <SettingRow
              icon="bell"
              title="Notifications"
              onPress={() => router.push('/notifications-settings' as never)}
            />
            <Divider />
            <SettingRow
              icon="star"
              title="Hēlo Premium"
              onPress={() => {
                try { router.push('/premium' as never); } catch {}
              }}
            />
            <Divider />
            <SettingRow
              icon="book-open"
              title="Méthodologie"
              onPress={() => router.push('/methodology' as never)}
            />
            <Divider />
            <SettingRow
              icon="file-text"
              title="CGU"
              onPress={() => router.push('/legal/terms' as never)}
            />
            <Divider />
            <SettingRow
              icon="shield"
              title="Confidentialité"
              onPress={() => router.push('/legal/privacy' as never)}
            />
            <Divider />
            <SettingRow
              icon="calendar"
              title="Ma Timeline de Grossesse"
              subtitle="Fresque visuelle de vos 40 semaines"
              onPress={() => router.push('/timeline' as never)}
            />
            <Divider />
            <SettingRow
              icon="book"
              title="Exporter mon journal"
              subtitle="Générer un PDF de votre journal de grossesse"
              onPress={handleExportJournal}
            />
            <Divider />
            <SettingRow
              icon="download"
              title="Exporter mes données"
              onPress={handleExportData}
            />
            <Divider />
            <SettingRow
              icon="trash-2"
              title="Supprimer mon compte"
              danger
              onPress={handleDeleteAccount}
            />
            <Divider />
            <SettingRow
              icon="mail"
              title="Contact"
              onPress={() => Linking.openURL('mailto:hello@helo-app.fr')}
            />
          </Card>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.footer}>
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.version}>
            Version 1.0.0
          </ThemedText>
          <Pressable onPress={handleLogout} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText variant="bodyLarge" color="danger" style={styles.logoutText}>
              Se déconnecter
            </ThemedText>
          </Pressable>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
  },
  avatarInfo: {
    flex: 1,
    gap: 4,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  progressLabel: {
    textAlign: 'right',
  },
  glowCard: {
    alignItems: 'center',
  },
  glowCardInner: {
    alignItems: 'center',
  },
  statsGrid: {
    gap: Spacing.md,
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
  footer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  version: {
    textAlign: 'center',
  },
  logoutText: {
    textAlign: 'center',
  },
  contributriceBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  contributriceBadgeText: {
    color: Colors.accentDark,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
