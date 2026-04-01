import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xxl },

  section: { gap: Spacing.md },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconBlue: { backgroundColor: '#EEF4FF' },
  sectionIconGray: { backgroundColor: '#F0F0F5' },
  sectionFlex: { flex: 1 },
  emojiText: { fontSize: 20 },

  // Widget previews
  previewLabel: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  previewGroup: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewCaption: {
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
  },

  // Small widget (130×130 ≈ iOS systemSmall at 1.5× scale)
  smallWidget: {
    width: 120,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.soft,
  },
  widgetName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  circleWrap: { width: 44, height: 44 },
  circleCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scoreSmall: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  weekSmall: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: '#7A6F68',
    marginTop: 2,
  },

  // Medium widget (≈ iOS systemMedium 264×128)
  mediumWidget: {
    width: 230,
    height: 120,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.soft,
  },
  medLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  glowLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 9,
    color: '#807268',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreMedium: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  medCircleWrap: { width: 52, height: 52 },
  medDivider: { width: 1, height: '60%', backgroundColor: '#E8E2DC' },
  medRight: {
    flex: 1.2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  medWeekRow: { gap: 2 },
  scannerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  scannerLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Colors.textPrimary,
  },
  medHorizontalLine: { height: 1, backgroundColor: '#E8E2DC', marginVertical: 2 },
  weekMedium: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  trimesterMedium: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: '#7A6F68' },

  // Score badge row
  scoreBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scoreBadgeLabel: { fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Steps
  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.accent },
  stepBodyText: { flex: 1, lineHeight: 22 },
  stepDivider: { height: 1, backgroundColor: Colors.border },

  // Section headings
  sectionTitle: { marginBottom: Spacing.lg },
  sectionTitleMd: { marginBottom: Spacing.md },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardTop: { marginTop: Spacing.md },
  infoText: { flex: 1, lineHeight: 18 },

  // Data
  dataCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  dataIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataBody: { flex: 1 },

  // Watch
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    marginTop: 4,
  },
  comingSoonText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  watchIntro: { lineHeight: 22, marginBottom: Spacing.lg },
  watchFeaturesCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  watchFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  watchFeatureEmoji: { fontSize: 24 },
  watchFeatureBody: { flex: 1, gap: 2 },
  watchFeatureDesc: { lineHeight: 18 },

  // CTA
  ctaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'flex-start',
  },
  ctaSub: { marginTop: 4, marginBottom: Spacing.md },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  contactBtnText: { color: Colors.surface },
});

export default styles;
