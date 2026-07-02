import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import {
  CapsuleData,
  computeOpensAt,
  formatOpensDate,
  OpeningDatePreset,
} from '@/lib/memories';
import { styles } from './memoriesStyles';

// ── Opening presets ───────────────────────────────────────────────────────────

export const OPENING_PRESETS: Array<{
  id: OpeningDatePreset;
  emoji: string;
  label: string;
  sub: string;
}> = [
  { id: 'birth', emoji: '🤱', label: 'À la naissance', sub: 'Ta date prévue d\'accouchement' },
  { id: '1year', emoji: '🎂', label: '1er anniversaire', sub: 'Un an après la naissance' },
  { id: '5years', emoji: '🌟', label: '5 ans', sub: 'Pour son entrée en maternelle' },
  { id: '18years', emoji: '🎓', label: '18 ans', sub: 'À sa majorité' },
];

// ── Step 0 — Overview ─────────────────────────────────────────────────────────

function OverviewTile({ emoji, value, label }: { emoji: string; value: number | string; label: string }) {
  return (
    <View style={styles.overviewTile}>
      <ThemedText style={styles.overviewEmoji}>{emoji}</ThemedText>
      <ThemedText variant="headlineLarge" style={styles.overviewValue}>{String(value)}</ThemedText>
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.overviewLabel}>{label}</ThemedText>
    </View>
  );
}

interface StepOverviewProps {
  compiling: boolean;
  data: CapsuleData | null;
  onNext: () => void;
}

export function StepOverview({ compiling, data, onNext }: StepOverviewProps) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <ThemedText variant="headlineLarge" color="textPrimary" style={styles.stepTitle}>
        Ton trimestre en résumé
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepSub}>
        Hēlo a compilé tes données. Voici ce qui sera scellé dans ta capsule.
      </ThemedText>

      {compiling || !data ? (
        <View style={styles.compilingWrap}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md }}>
            Compilation en cours…
          </ThemedText>
        </View>
      ) : (
        <View style={styles.overviewGrid}>
          <OverviewTile emoji="🔍" value={data.scanCount} label="produits scannés" />
          <OverviewTile emoji="✨" value={data.avgGlowScore || '—'} label="Glow Score moyen" />
          <OverviewTile emoji="📓" value={data.journalCount} label="entrées journal" />
          <OverviewTile emoji="💬" value={data.circleMessages} label="messages cercle" />
          {data.topProduct && (
            <View style={styles.overviewHighlight}>
              <ThemedText variant="labelSmall" color="accentDark">Produit le plus scanné</ThemedText>
              <ThemedText variant="bodyLarge" color="textPrimary" numberOfLines={1}>{data.topProduct}</ThemedText>
            </View>
          )}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onNext}
        disabled={compiling}
        accessibilityRole="button"
        accessibilityLabel="Étape suivante"
      >
        <ThemedText style={styles.nextBtnLabel}>Personnaliser ma capsule →</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

// ── Step 1 — Personal touch ───────────────────────────────────────────────────

interface StepPersonalProps {
  photoUri: string | null;
  message: string;
  isPremium: boolean;
  firstName: string | null;
  onPickPhoto: () => void;
  onMessageChange: (v: string) => void;
  onNext: () => void;
}

export function StepPersonal({
  photoUri,
  message,
  isPremium,
  firstName,
  onPickPhoto,
  onMessageChange,
  onNext,
}: StepPersonalProps) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText variant="headlineLarge" color="textPrimary" style={styles.stepTitle}>
        Ta touche personnelle
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepSub}>
        Ajoute ce qui te tient à cœur. Ces contenus sont réservés aux membres premium.
      </ThemedText>

      <Pressable
        style={({ pressed }) => [styles.photoPickerBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onPickPhoto}
        accessibilityRole="button"
        accessibilityLabel="Choisir une photo"
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
        ) : (
          <>
            <View style={styles.photoIcon}>
              <Feather name="camera" size={24} color={Colors.accentDark} />
              {!isPremium && (
                <View style={styles.premiumBadgePill}>
                  <ThemedText style={styles.premiumBadgeText}>Premium</ThemedText>
                </View>
              )}
            </View>
            <ThemedText variant="bodyMedium" color="accentDark" style={{ marginTop: Spacing.sm }}>
              Ajouter une photo de ton ventre
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary">Portrait, 3:4 recommandé</ThemedText>
          </>
        )}
      </Pressable>

      <View style={styles.messageSection}>
        <View style={styles.messageLabelRow}>
          <ThemedText variant="labelSmall" color="accentDark">Un message pour ton bébé</ThemedText>
          {!isPremium && (
            <View style={styles.premiumBadgePill}>
              <ThemedText style={styles.premiumBadgeText}>Premium</ThemedText>
            </View>
          )}
        </View>
        <TextInput
          style={styles.messageInput}
          placeholder={`Cher(e) ${firstName || 'bébé'}…`}
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={message}
          onChangeText={isPremium ? onMessageChange : () => router.push('/paywall')}
          editable={isPremium}
          accessibilityLabel="Message pour bébé"
        />
      </View>

      <View style={styles.audioComingSoon}>
        <Feather name="mic" size={20} color={Colors.textTertiary} />
        <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1 }}>
          Message vocal — prochainement 🎙
        </ThemedText>
      </View>

      <Pressable
        style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="Choisir la date d'ouverture"
      >
        <ThemedText style={styles.nextBtnLabel}>Choisir la date d'ouverture →</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

// ── Step 2 — Seal ─────────────────────────────────────────────────────────────

interface StepSealProps {
  selectedPreset: OpeningDatePreset;
  onSelectPreset: (p: OpeningDatePreset) => void;
  dueDate: string | null;
  onSeal: () => void;
}

export function StepSeal({ selectedPreset, onSelectPreset, dueDate, onSeal }: StepSealProps) {
  const computedDate = computeOpensAt(selectedPreset, dueDate);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <ThemedText variant="headlineLarge" color="textPrimary" style={styles.stepTitle}>
        Quand s'ouvrira-t-elle ?
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepSub}>
        Choisis le moment magique où ta capsule sera déscellée.
      </ThemedText>

      <View style={styles.presetList}>
        {OPENING_PRESETS.map((preset) => {
          const active = selectedPreset === preset.id;
          return (
            <Pressable
              key={preset.id}
              style={({ pressed }) => [
                styles.presetCard,
                active && styles.presetCardActive,
                { opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => onSelectPreset(preset.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={preset.label}
            >
              <ThemedText style={styles.presetEmoji}>{preset.emoji}</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText
                  variant="bodyLarge"
                  style={active ? { color: Colors.accentDark, fontFamily: 'PlusJakartaSans_600SemiBold' } : undefined}
                  color={active ? undefined : 'textPrimary'}
                >
                  {preset.label}
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary">{preset.sub}</ThemedText>
              </View>
              {active && <Feather name="check-circle" size={20} color={Colors.accent} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dateSummary}>
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
          Ouverture prévue le
        </ThemedText>
        <ThemedText variant="headlineMedium" style={styles.dateSummaryDate}>
          {formatOpensDate(computedDate.toISOString())}
        </ThemedText>
      </View>

      <Pressable
        style={({ pressed }) => [styles.sealBtn, { opacity: pressed ? 0.88 : 1 }]}
        onPress={onSeal}
        accessibilityRole="button"
        accessibilityLabel="Sceller ma capsule"
      >
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={styles.sealBtnGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <ThemedText style={styles.sealBtnLabel}>🔒 Sceller ma capsule</ThemedText>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}
