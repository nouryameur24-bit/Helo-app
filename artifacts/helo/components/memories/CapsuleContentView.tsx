import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { formatSealedDate, MemoryCapsule } from '@/lib/memories';
import { styles } from './memoriesStyles';

// ── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <View style={styles.statTile}>
      <ThemedText style={styles.statEmoji}>{emoji}</ThemedText>
      <ThemedText variant="headlineLarge" style={styles.statValue}>{value}</ThemedText>
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

// ── Capsule content view ──────────────────────────────────────────────────────

interface CapsuleContentViewProps {
  capsule: MemoryCapsule;
  onBack: () => void;
}

export function CapsuleContentView({ capsule, onBack }: CapsuleContentViewProps) {
  const insets = useSafeAreaInsets();

  const verdictColor = (v: string): string => {
    if (v === 'safe') return Colors.safe;
    if (v === 'danger') return Colors.danger;
    return Colors.caution;
  };

  const verdictEmoji = (v: string): string => {
    if (v === 'safe') return '✅';
    if (v === 'danger') return '⚠️';
    return '🟡';
  };

  const handleShare = useCallback(async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Partage', 'Le partage n\'est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(capsule.photoUri ?? '', {
        dialogTitle: 'Partager ma capsule Hēlo',
      });
    } catch {
      Alert.alert('Partage', 'Impossible de partager cette capsule pour le moment.');
    }
  }, [capsule]);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <StatusBar style="dark" />

      <View style={[styles.contentHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">
          {capsule.trimesterLabel}
        </ThemedText>
        <Pressable
          onPress={handleShare}
          style={styles.shareBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Partager"
        >
          <Feather name="share" size={20} color={Colors.accentDark} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentScroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {capsule.photoUri ? (
          <View style={styles.contentPhotoWrap}>
            <Image source={{ uri: capsule.photoUri }} style={styles.contentPhoto} contentFit="cover" />
            <LinearGradient
              colors={['transparent', Colors.background]}
              style={styles.contentPhotoGradient}
            />
          </View>
        ) : (
          <LinearGradient colors={['#FFF5E0', Colors.background]} style={styles.contentHeroBanner}>
            <ThemedText style={styles.contentHeroEmoji}>🌿</ThemedText>
            <ThemedText variant="displayMedium" style={styles.contentHeroTitle}>
              {capsule.trimesterLabel}
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary">
              Scellée le {formatSealedDate(capsule.sealedAt)}
            </ThemedText>
          </LinearGradient>
        )}

        <View style={styles.contentSection}>
          <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
            Ta grossesse en chiffres
          </ThemedText>
          <View style={styles.contentStatsGrid}>
            <StatTile value={String(capsule.data.scanCount)} label="produits scannés" emoji="🔍" />
            <StatTile
              value={capsule.data.avgGlowScore > 0 ? String(capsule.data.avgGlowScore) : '—'}
              label="Glow Score moyen"
              emoji="✨"
            />
            <StatTile value={String(capsule.data.journalCount)} label="entrées journal" emoji="📓" />
            <StatTile value={String(capsule.data.circleMessages)} label="messages cercle" emoji="💬" />
          </View>
        </View>

        {capsule.data.topScans.length > 0 && (
          <View style={styles.contentSection}>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
              Tes scans marquants
            </ThemedText>
            <View style={styles.contentCard}>
              {capsule.data.topScans.map((scan, idx) => (
                <View key={idx} style={styles.scanRow}>
                  <ThemedText style={styles.scanEmoji}>{verdictEmoji(scan.verdict)}</ThemedText>
                  <ThemedText
                    variant="bodyMedium"
                    style={{ flex: 1, color: verdictColor(scan.verdict) }}
                    numberOfLines={1}
                  >
                    {scan.name}
                  </ThemedText>
                </View>
              ))}
              {capsule.data.firstDangerProduct && (
                <View style={styles.firstDangerRow}>
                  <Feather name="alert-triangle" size={14} color={Colors.caution} />
                  <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                    Premier produit surprenant :{' '}
                    <ThemedText variant="bodySmall" style={{ color: Colors.caution }}>
                      {capsule.data.firstDangerProduct}
                    </ThemedText>
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {capsule.data.journalEntries.length > 0 && (
          <View style={styles.contentSection}>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
              Ton journal
            </ThemedText>
            {capsule.data.journalEntries.map((entry, idx) => (
              <View key={idx} style={styles.journalEntryCard}>
                <View style={styles.journalEntryHeader}>
                  <ThemedText style={styles.journalMood}>{entry.mood}</ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </ThemedText>
                </View>
                {entry.note ? (
                  <ThemedText variant="bodyMedium" color="textSecondary" numberOfLines={3}>
                    {entry.note}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {capsule.message ? (
          <View style={styles.contentSection}>
            <ThemedText variant="labelSmall" color="accentDark" style={styles.contentSectionLabel}>
              Ton message
            </ThemedText>
            <LinearGradient colors={['#FFF9F0', '#FFFAF5']} style={styles.messageCard}>
              <ThemedText style={styles.messageQuote}>"</ThemedText>
              <ThemedText variant="bodyLarge" color="textPrimary" style={styles.messageText}>
                {capsule.message}
              </ThemedText>
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.contentFooter}>
          <ThemedText style={styles.footerLogo}>Hēlo</ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center' }}>
            Avec amour 💛
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}
