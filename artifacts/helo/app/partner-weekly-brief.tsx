import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GlowScoreCircle } from '@/components/GlowScoreCircle';
import { GlowScoreMini } from '@/components/GlowScoreMini';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getPartnerTipForWeek } from '@/constants/partnerTips';
import { calculateGlowScore } from '@/lib/glowscore';
import { calculateTrimester } from '@/lib/trimester';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';

const { width: W } = Dimensions.get('window');
const SLIDE_COUNT = 3;
const PARTNER_BRIEF_KEY = '@helo_partner_brief_week';

function ProgressBar({ current }: { current: number }) {
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            progressStyles.segment,
            { backgroundColor: i <= current ? Colors.accent : Colors.borderLight },
          ]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: Radius.full,
  },
});

function SlideSemaine({
  week,
  momName,
  glowScore,
}: {
  week: number;
  momName: string;
  glowScore: number;
}) {
  const tip = getPartnerTipForWeek(week);
  return (
    <View style={[slide.root, { backgroundColor: Colors.background, width: W }]}>
      <View style={slide.content}>
        <View style={[slide.badge, { backgroundColor: Colors.accentLight }]}>
          <ThemedText variant="labelSmall" style={{ color: Colors.accentDark }}>
            SEMAINE {week}
          </ThemedText>
        </View>

        <ThemedText variant="displayLarge" color="textPrimary" style={{ marginTop: Spacing.xl }}>
          Semaine {week}
        </ThemedText>
        <ThemedText variant="headlineMedium" color="textSecondary" style={{ marginTop: Spacing.sm }}>
          Cette semaine chez {momName}
        </ThemedText>

        <Card padding={Spacing.xl} style={slide.card}>
          <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.sm }}>
            GLOW SCORE DE {momName.toUpperCase()}
          </ThemedText>
          <GlowScoreMini score={glowScore} animated />
        </Card>

        <View style={slide.tipPreview}>
          <Feather name="zap" size={16} color={Colors.accent} />
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ flex: 1, marginLeft: Spacing.sm }}>
            {tip.title}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function SlideMission({ week }: { week: number }) {
  const tip = getPartnerTipForWeek(week);
  return (
    <View style={[slide.root, { backgroundColor: Colors.safeBg, width: W }]}>
      <View style={slide.content}>
        <View style={[slide.badge, { backgroundColor: Colors.safeLight }]}>
          <Feather name="target" size={12} color={Colors.safe} />
          <ThemedText variant="labelSmall" style={{ color: Colors.safe, marginLeft: 4 }}>
            VOTRE MISSION
          </ThemedText>
        </View>

        <ThemedText variant="headlineLarge" color="textPrimary" style={slide.tipTitle}>
          {tip.title}
        </ThemedText>

        <ThemedText variant="bodyMedium" color="textSecondary" style={slide.tipBody}>
          {tip.body}
        </ThemedText>

        <Card padding={Spacing.xl} style={slide.missionCard}>
          <View style={slide.missionHeader}>
            <View style={slide.missionIconWrap}>
              <Feather name="check-circle" size={20} color={Colors.safe} />
            </View>
            <ThemedText variant="labelLarge" color="textPrimary">
              Mission de la semaine
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md }}>
            {tip.mission}
          </ThemedText>
        </Card>
      </View>
    </View>
  );
}

function SlideGlowScore({
  glowScore,
  momName,
  week,
  onClose,
}: {
  glowScore: number;
  momName: string;
  week: number;
  onClose: () => void;
}) {
  const score = glowScore;
  const encouragement =
    score >= 80
      ? `${momName} a un excellent placard ! Continuez à l'aider à scanner ses produits.`
      : score >= 60
      ? `Un bon score global ! Il reste quelques produits à vérifier ensemble.`
      : `Quelques produits méritent attention. Aidez ${momName} à scanner ses produits avec Hēlo.`;

  return (
    <View style={[slide.root, { backgroundColor: Colors.background, width: W }]}>
      <View style={slide.content}>
        <View style={[slide.badge, { backgroundColor: Colors.accentLight }]}>
          <Feather name="star" size={12} color={Colors.accentDark} />
          <ThemedText variant="labelSmall" style={{ color: Colors.accentDark, marginLeft: 4 }}>
            GLOW SCORE
          </ThemedText>
        </View>

        <ThemedText variant="headlineLarge" color="textPrimary" style={{ marginTop: Spacing.xl }}>
          Le score de {momName}
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.sm }}>
          Semaine {week}
        </ThemedText>

        <View style={slide.glowCircle}>
          <GlowScoreCircle score={glowScore} size="large" animated />
        </View>

        <Card padding={Spacing.xl} style={slide.encourageCard}>
          <View style={slide.encourageHeader}>
            <ThemedText style={{ fontSize: 20 }}>💙</ThemedText>
            <ThemedText variant="labelLarge" color="textPrimary" style={{ flex: 1, marginLeft: Spacing.sm }}>
              Message pour vous
            </ThemedText>
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md }}>
            {encouragement}
          </ThemedText>
        </Card>

        <View style={{ marginTop: Spacing.xl }}>
          <Button variant="primary" onPress={onClose} fullWidth>
            Fermer le brief
          </Button>
        </View>
      </View>
    </View>
  );
}

export default function PartnerWeeklyBriefScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const { linkedUserId, linkedFirstName, dueDate } = useProfile();
  const { shelf } = useShelfData(linkedUserId ?? undefined);
  const { score: glowScore } = calculateGlowScore(shelf.length > 0 ? shelf : []);

  const momName = linkedFirstName ?? 'votre partenaire';
  const week = dueDate ? calculateTrimester(dueDate).weekOfPregnancy : 20;

  const { markAsRead: markBriefRead } = useWeeklyBrief(week, PARTNER_BRIEF_KEY);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / W);
      setCurrentPage(page);
    },
    [],
  );

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={22} color={Colors.textSecondary} />
        </Pressable>
        <ThemedText variant="labelLarge" color="textPrimary">
          Brief co-parent · Semaine {week}
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <ProgressBar current={currentPage} />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <SlideSemaine week={week} momName={momName} glowScore={glowScore} />
        <SlideMission week={week} />
        <SlideGlowScore
          glowScore={glowScore}
          momName={momName}
          week={week}
          onClose={async () => {
            await markBriefRead();
            router.back();
          }}
        />
      </ScrollView>

      {currentPage < SLIDE_COUNT - 1 && (
        <Pressable
          style={[styles.nextBtn, { bottom: insets.bottom + 32 }]}
          onPress={() => {
            scrollRef.current?.scrollTo({ x: (currentPage + 1) * W, animated: true });
          }}
        >
          <Feather name="chevron-right" size={22} color={Colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const slide = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.massive,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  card: {
    marginTop: Spacing.xl,
  },
  tipTitle: {
    marginTop: Spacing.xl,
    lineHeight: 32,
  },
  tipBody: {
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  tipPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xl,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  missionCard: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.safeBg,
    borderWidth: 1,
    borderColor: Colors.safeLight,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  missionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.safeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  encourageCard: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '55',
  },
  encourageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    position: 'absolute',
    right: Spacing.xl,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
});
