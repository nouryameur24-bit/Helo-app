import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getTipForWeek } from '@/constants/weeklyTips';
import type { PregnancyEvent } from '@/constants/pregnancyEvents';
import { useTimelineData, type WeekData } from '@/hooks/useTimelineData';

const COLUMN_WIDTH = 76;
const COLUMN_GAP = 8;

function PulsingCircle({ color }: { color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }, animStyle]}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />
    </Animated.View>
  );
}

function WeekColumn({
  data,
  isCurrent,
  isPast,
  onPress,
}: {
  data: WeekData;
  isCurrent: boolean;
  isPast: boolean;
  onPress: () => void;
}) {
  const glowColor = data.glowScore !== null
    ? data.glowScore > 80 ? Colors.safe
      : data.glowScore >= 60 ? Colors.accent
      : data.glowScore >= 40 ? Colors.caution
      : Colors.danger
    : Colors.border;

  const circleColor = isCurrent
    ? Colors.accent
    : isPast
    ? (data.glowScore !== null ? glowColor : Colors.accentLight)
    : Colors.borderLight;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.column,
        isCurrent && styles.columnCurrent,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {isCurrent && (
        <View style={styles.hereBadge}>
          <ThemedText style={styles.hereBadgeText}>Vous êtes ici</ThemedText>
        </View>
      )}

      <ThemedText variant="labelSmall" style={[styles.weekNumber, isCurrent ? { color: Colors.accentDark } : undefined]}>
        S{data.week}
      </ThemedText>

      <View style={styles.circleWrapper}>
        {isCurrent ? (
          <PulsingCircle color={circleColor} />
        ) : (
          <View
            style={[
              styles.circle,
              {
                backgroundColor: isPast ? circleColor : 'transparent',
                borderColor: isPast ? circleColor : Colors.border,
                borderWidth: isPast ? 0 : 2,
              },
            ]}
          />
        )}
      </View>

      {data.glowScore !== null && (
        <ThemedText style={[styles.microScore, { color: glowColor }]}>
          {data.glowScore}
        </ThemedText>
      )}

      {data.scanCount > 0 && (
        <View style={styles.microRow}>
          <Feather name="camera" size={9} color={Colors.textTertiary} />
          <ThemedText style={styles.microText}>{data.scanCount}</ThemedText>
        </View>
      )}

      {data.moodEmoji && (
        <ThemedText style={styles.microEmoji}>{data.moodEmoji}</ThemedText>
      )}

      {data.events.length > 0 && (
        <View style={styles.eventIcons}>
          {data.events.slice(0, 2).map((evt, i) => (
            <ThemedText key={i} style={styles.eventIcon}>{evt.icon}</ThemedText>
          ))}
        </View>
      )}
    </Pressable>
  );
}

interface WeekDetailSheetProps {
  visible: boolean;
  data: WeekData | null;
  onClose: () => void;
}

function WeekDetailSheet({ visible, data, onClose }: WeekDetailSheetProps) {
  if (!data) return null;

  const tip = getTipForWeek(data.week);

  const glowColor = data.glowScore !== null
    ? data.glowScore > 80 ? Colors.safe
      : data.glowScore >= 60 ? Colors.accent
      : data.glowScore >= 40 ? Colors.caution
      : Colors.danger
    : Colors.textTertiary;

  const glowLabel = data.glowScore !== null
    ? data.glowScore > 80 ? 'Excellent'
      : data.glowScore >= 60 ? 'Bon'
      : data.glowScore >= 40 ? 'À améliorer'
      : 'Attention'
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Semaine {data.week}
            </ThemedText>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {data.glowScore !== null && (
            <View style={[styles.sheetCard, { borderColor: glowColor + '44' }]}>
              <View style={styles.sheetCardRow}>
                <View style={[styles.sheetCardIcon, { backgroundColor: glowColor + '22' }]}>
                  <Feather name="star" size={18} color={glowColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="labelLarge" color="textPrimary">Glow Score</ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">
                    Basé sur {data.scanCount} produit{data.scanCount > 1 ? 's' : ''} scanné{data.scanCount > 1 ? 's' : ''}
                  </ThemedText>
                </View>
                <View>
                  <ThemedText variant="headlineLarge" style={{ color: glowColor }}>
                    {data.glowScore}
                  </ThemedText>
                  {glowLabel && (
                    <ThemedText variant="bodySmall" style={{ color: glowColor, textAlign: 'right' }}>
                      {glowLabel}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          )}

          {data.scanCount > 0 && (
            <View style={styles.sheetCard}>
              <View style={styles.sheetCardRow}>
                <View style={[styles.sheetCardIcon, { backgroundColor: Colors.accentLight }]}>
                  <Feather name="camera" size={18} color={Colors.accentDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="labelLarge" color="textPrimary">Produits scannés</ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">
                    {data.scanCount} produit{data.scanCount > 1 ? 's' : ''} analysé{data.scanCount > 1 ? 's' : ''} cette semaine
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {data.hasJournalEntry && (
            <View style={styles.sheetCard}>
              <View style={styles.sheetCardRow}>
                <View style={[styles.sheetCardIcon, { backgroundColor: Colors.safeBg }]}>
                  <ThemedText style={{ fontSize: 18 }}>{data.moodEmoji ?? '📖'}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="labelLarge" color="textPrimary">Journal</ThemedText>
                  {data.journalSymptoms.length > 0 && (
                    <View style={styles.chipRow}>
                      {data.journalSymptoms.slice(0, 3).map((s, i) => (
                        <View key={i} style={styles.chip}>
                          <ThemedText style={styles.chipText}>{s}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                  {data.journalNote && (
                    <ThemedText variant="bodySmall" color="textTertiary" numberOfLines={3} style={{ marginTop: 4 }}>
                      {data.journalNote}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          )}

          {data.events.length > 0 && (
            <View>
              <ThemedText variant="labelSmall" color="textTertiary" style={styles.sheetSectionLabel}>
                ÉVÉNEMENTS MÉDICAUX
              </ThemedText>
              {data.events.map((evt, i) => (
                <View key={i} style={[styles.sheetCard, { marginTop: i === 0 ? 0 : Spacing.sm }]}>
                  <View style={styles.sheetCardRow}>
                    <ThemedText style={{ fontSize: 22 }}>{evt.icon}</ThemedText>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <ThemedText variant="labelLarge" color="textPrimary">{evt.label}</ThemedText>
                      <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
                        {evt.description}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {tip && (
            <View style={[styles.sheetCard, styles.tipCard]}>
              <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.sm }}>
                CONSEIL DE LA SEMAINE
              </ThemedText>
              <ThemedText variant="labelLarge" color="accentDark" style={{ marginBottom: Spacing.xs }}>
                {tip.title}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ lineHeight: 18 }}>
                {tip.body}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm }}>
                Source : {tip.source}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const { weeks, isLoading, currentWeek } = useTimelineData();
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (weeks.length > 0 && currentWeek && scrollRef.current) {
      const targetWeek = Math.max(1, Math.min(40, currentWeek));
      const offset = (targetWeek - 1) * (COLUMN_WIDTH + COLUMN_GAP) - 40;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
      }, 400);
    }
  }, [weeks, currentWeek]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (viewShotRef.current) {
        try {
          const uri = await (viewShotRef.current as { capture(): Promise<string> }).capture();
          if (uri && isSharingAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'Partager ma timeline de grossesse',
            });
            setExporting(false);
            return;
          }
        } catch {
        }
      }

      const journalRaw = await AsyncStorage.getItem('journal_entries');
      const journalEntries: Array<{ mood: string; weekOfPregnancy: number | null; note: string }> = journalRaw ? JSON.parse(journalRaw) : [];

      const weekRows = weeks.map((w) => {
        const isCur = w.week === currentWeek;
        const journal = journalEntries.find((e) => e.weekOfPregnancy === w.week);
        return `
          <tr style="${isCur ? 'background:#FFF5E8;font-weight:700;' : ''}">
            <td style="padding:6px 10px;text-align:center;font-weight:600;color:#A88B4A;">S${w.week}</td>
            <td style="padding:6px 10px;text-align:center;">${w.glowScore !== null ? w.glowScore : '—'}</td>
            <td style="padding:6px 10px;text-align:center;">${w.scanCount || '—'}</td>
            <td style="padding:6px 10px;text-align:center;">${journal?.mood ?? '—'}</td>
            <td style="padding:6px 10px;text-align:center;">${w.events.map((e) => e.icon).join(' ') || '—'}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8"/>
          <style>
            body { font-family: Georgia, serif; color: #2D2926; background: #FFFAF5; padding: 40px; }
            h1 { font-size: 32px; color: #A88B4A; margin-bottom: 8px; }
            p { color: #8C7E75; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #E8D5B0; color: #A88B4A; padding: 8px 10px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            tr:nth-child(even) { background: #FAFAFA; }
            td { border-bottom: 1px solid #F0EBE5; }
          </style>
        </head>
        <body>
          <h1>Ma Timeline de Grossesse</h1>
          <p>Exportée le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <table>
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Glow Score</th>
                <th>Scans</th>
                <th>Humeur</th>
                <th>Événements</th>
              </tr>
            </thead>
            <tbody>${weekRows}</tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager ma timeline de grossesse',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Export réussi', 'Le PDF a été généré dans vos fichiers.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'exporter la timeline. Réessayez.');
    } finally {
      setExporting(false);
    }
  }, [weeks, currentWeek]);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + Spacing.md }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="chevron-left" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText variant="headlineMedium" color="textPrimary">Ma Timeline</ThemedText>
          {currentWeek && (
            <ThemedText variant="bodySmall" color="textTertiary">
              Semaine {currentWeek} / 40
            </ThemedText>
          )}
        </View>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [styles.exportBtn, { opacity: pressed || exporting ? 0.7 : 1 }]}
        >
          <Feather name="share" size={16} color={Colors.accentDark} />
          <ThemedText style={styles.exportBtnText}>{exporting ? 'Export...' : 'Exporter'}</ThemedText>
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.safe }]} />
          <ThemedText variant="bodySmall" color="textTertiary">Passé</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
          <ThemedText variant="bodySmall" color="textTertiary">Semaine actuelle</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border }]} />
          <ThemedText variant="bodySmall" color="textTertiary">À venir</ThemedText>
        </View>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ThemedText variant="bodyMedium" color="textTertiary">Chargement...</ThemedText>
        </View>
      ) : (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
          >
            {weeks.map((weekData) => (
              <WeekColumn
                key={weekData.week}
                data={weekData}
                isCurrent={weekData.week === currentWeek}
                isPast={currentWeek !== null ? weekData.week < currentWeek : false}
                onPress={() => setSelectedWeek(weekData)}
              />
            ))}
          </ScrollView>
        </ViewShot>
      )}

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.exportFullBtn, { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + Spacing.lg }]}>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [
            styles.exportFullPressable,
            { opacity: pressed || exporting ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Feather name="share-2" size={18} color="#fff" />
          <ThemedText variant="labelLarge" style={{ color: '#fff' }}>
            {exporting ? 'Export en cours...' : 'Exporter ma timeline'}
          </ThemedText>
        </Pressable>
      </Animated.View>

      <WeekDetailSheet
        visible={selectedWeek !== null}
        data={selectedWeek}
        onClose={() => setSelectedWeek(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  exportBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.accentDark,
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    gap: COLUMN_GAP,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 130,
    gap: 4,
  },
  columnCurrent: {
    backgroundColor: Colors.accentLight + '88',
    borderColor: Colors.accent,
  },
  herebadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
  },
  hereBadge: {
    backgroundColor: Colors.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.full,
    marginBottom: 2,
  },
  hereBadgeText: {
    fontSize: 8,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  weekNumber: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
  },
  circleWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  microScore: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  microText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  microEmoji: {
    fontSize: 14,
  },
  eventIcons: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  eventIcon: {
    fontSize: 12,
  },
  exportFullBtn: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  exportFullPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45,41,38,0.5)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    paddingBottom: Spacing.xxxl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sheetContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sheetCardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSectionLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tipCard: {
    backgroundColor: Colors.accentLight + '55',
    borderColor: Colors.accentLight,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    backgroundColor: Colors.accentLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 11,
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
