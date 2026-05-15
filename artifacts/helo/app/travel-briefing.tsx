/**
 * app/travel-briefing.tsx — Résultats du briefing santé voyage
 *
 * Affiche le briefing par sections avec checklist interactive, chargé depuis AsyncStorage.
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

import { ThemedText } from '@/components/ui/ThemedText';
import { logError } from '@/lib/logger';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  loadTravelBriefing,
  loadTravelBriefingsIndex,
  type TravelBriefing,
  type TravelBriefingSection,
  type ChecklistItem,
} from '@/lib/travel';

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: Colors.safeBg, text: Colors.safe, label: 'Faible' },
  medium: { bg: Colors.cautionBg, text: Colors.caution, label: 'Modéré' },
  high: { bg: Colors.dangerBg, text: Colors.danger, label: 'Élevé' },
};

function SectionCard({ section, index }: { section: TravelBriefingSection; index: number }) {
  const [expanded, setExpanded] = useState(index < 2);
  const risk = riskColors[section.riskLevel] ?? riskColors.low;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [sc.wrap, { opacity: pressed ? 0.95 : 1 }]}
      >
        <View style={sc.header}>
          <ThemedText style={sc.emoji}>{section.emoji}</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText variant="labelLarge" color="textPrimary">{section.title}</ThemedText>
          </View>
          <View style={[sc.riskBadge, { backgroundColor: risk.bg }]}>
            <ThemedText style={[sc.riskText, { color: risk.text }]}>{risk.label}</ThemedText>
          </View>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textTertiary}
            style={{ marginLeft: Spacing.xs }}
          />
        </View>

        {expanded && (
          <View style={sc.body}>
            <ThemedText variant="bodyMedium" color="textSecondary" style={sc.content}>
              {section.content}
            </ThemedText>
            {section.tips.length > 0 && (
              <View style={sc.tipsWrap}>
                {section.tips.map((tip, i) => (
                  <View key={i} style={sc.tipRow}>
                    <View style={[sc.tipDot, { backgroundColor: risk.text }]} />
                    <ThemedText variant="bodySmall" color="textPrimary" style={{ flex: 1 }}>
                      {tip}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const sc = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  emoji: { fontSize: 22 },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  riskText: { ...Typography.labelSmall, fontSize: 10 },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  content: {
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  tipsWrap: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tipDot: {
    width: 6, height: 6, borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
});

function ChecklistSection({
  items,
  onToggle,
}: {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}) {
  const done = items.filter((i) => i.checked).length;
  return (
    <Animated.View entering={FadeInDown.delay(400).duration(350)}>
      <View style={cl.wrap}>
        <View style={cl.header}>
          <ThemedText style={cl.emoji}>📋</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText variant="labelLarge" color="textPrimary">Checklist voyage</ThemedText>
          </View>
          <View style={cl.progressBadge}>
            <ThemedText style={cl.progressText}>{done}/{items.length}</ThemedText>
          </View>
        </View>
        <View style={cl.items}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onToggle(item.id)}
              style={({ pressed }) => [cl.item, { opacity: pressed ? 0.88 : 1 }]}
            >
              <View style={[cl.checkbox, item.checked && cl.checkboxChecked]}>
                {item.checked && <Feather name="check" size={12} color="#fff" />}
              </View>
              <ThemedText
                variant="bodyMedium"
                style={[cl.itemText, item.checked ? cl.itemTextChecked : undefined]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const cl = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  emoji: { fontSize: 22 },
  progressBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  progressText: { ...Typography.labelSmall, color: Colors.accentDark, fontSize: 11 },
  items: { padding: Spacing.lg, gap: Spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.safe,
    borderColor: Colors.safe,
  },
  itemText: {
    flex: 1,
    color: Colors.textPrimary,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
});

function SkeletonSection({ index }: { index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(350)}
      style={[sk.wrap, { height: 72 }]}
    >
      <View style={sk.inner}>
        <View style={sk.circle} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[sk.line, { width: '60%' }]} />
          <View style={[sk.line, { width: '40%', height: 10 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.borderLight },
  line: { height: 14, backgroundColor: Colors.borderLight, borderRadius: 6 },
});

export default function TravelBriefingScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const params = useLocalSearchParams<{
    briefingId?: string;
    storageKey?: string;
    country?: string;
    flag?: string;
  }>();

  const [briefing, setBriefing] = useState<TravelBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data: TravelBriefing | null = null;

        if (params.storageKey) {
          data = await loadTravelBriefing(params.storageKey);
        } else if (params.briefingId) {
          const index = await loadTravelBriefingsIndex();
          const meta = index.find((m) => m.id === params.briefingId);
          if (meta) {
            data = await loadTravelBriefing(meta.storageKey);
          }
        }

        if (!data) {
          setError('Briefing introuvable.');
          return;
        }

        setBriefing(data);
        setChecklist(data.checklist);
      } catch (err) {
        logError('travelBriefing.load', err);
        setError('Impossible de charger le briefing.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.briefingId, params.storageKey]);

  const handleToggle = useCallback(
    (id: string) => {
      setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
    },
    [],
  );

  const trimesterLabel =
    briefing?.trimester === 1 ? '1er trimestre'
    : briefing?.trimester === 2 ? '2ème trimestre'
    : '3ème trimestre';

  const sections = briefing
    ? [
        briefing.sections.water,
        briefing.sections.food,
        briefing.sections.mosquitoes,
        briefing.sections.vaccines,
        briefing.sections.sun,
        briefing.sections.emergency,
      ]
    : [];

  return (
    <View style={[b.root, { backgroundColor: Colors.background }]}>
      <View style={[b.header, { paddingTop: topPadding + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={b.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {briefing ? (
            <>
              <ThemedText style={b.flagText}>{briefing.flag}</ThemedText>
              <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>
                {briefing.country}
              </ThemedText>
            </>
          ) : (
            <ThemedText variant="headlineMedium" color="textPrimary">Briefing voyage</ThemedText>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ScrollView
          style={b.scroll}
          contentContainerStyle={[b.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonSection key={i} index={i} />)}
        </ScrollView>
      ) : error ? (
        <View style={b.errorWrap}>
          <Feather name="alert-circle" size={40} color={Colors.danger} />
          <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
            Oups
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
            {error}
          </ThemedText>
          <Pressable onPress={() => router.back()} style={b.retryBtn}>
            <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>Retour</ThemedText>
          </Pressable>
        </View>
      ) : briefing ? (
        <ScrollView
          style={b.scroll}
          contentContainerStyle={[b.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(0).duration(400)} style={b.metaCard}>
            <View style={b.metaRow}>
              <Feather name="calendar" size={14} color={Colors.textTertiary} />
              <ThemedText variant="bodySmall" color="textTertiary">
                {formatDateDisplay(briefing.departureDate)} → {formatDateDisplay(briefing.returnDate)}
              </ThemedText>
            </View>
            <View style={b.metaRow}>
              <Feather name="user" size={14} color={Colors.textTertiary} />
              <ThemedText variant="bodySmall" color="textTertiary">{trimesterLabel}</ThemedText>
            </View>
          </Animated.View>

          {sections.map((section, i) => (
            <SectionCard key={section.title} section={section} index={i + 1} />
          ))}

          {checklist.length > 0 && (
            <ChecklistSection items={checklist} onToggle={handleToggle} />
          )}

          <Animated.View entering={FadeInDown.delay(500).duration(350)} style={b.disclaimerCard}>
            <Feather name="info" size={14} color={Colors.caution} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1, lineHeight: 18 }}>
              Ces informations sont fournies à titre indicatif et générées par IA. Consultez votre médecin ou sage-femme avant tout voyage pendant la grossesse.
            </ThemedText>
          </Animated.View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const b = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  flagText: { fontSize: 28 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  metaCard: {
    flexDirection: 'row',
    gap: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.accentLight,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.cautionBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cautionLight,
  },
});
