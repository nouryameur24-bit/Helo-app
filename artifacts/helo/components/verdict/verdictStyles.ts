import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { CIRCLE_RADIUS, CIRCLE_STROKE } from './verdictHelpers';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  loadingRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
  },
  loadingText: { marginTop: Spacing.md },

  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: { textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: {},

  hero: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },

  scoreCircleWrapper: {
    width: (CIRCLE_RADIUS + CIRCLE_STROKE) * 2,
    height: (CIRCLE_RADIUS + CIRCLE_STROKE) * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 40,
    letterSpacing: -1,
  },

  verdictLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: Typography.displayMedium.fontSize,
    letterSpacing: Typography.displayMedium.letterSpacing,
    textAlign: 'center',
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productInfo: { flex: 1, gap: 2 },
  trimesterBadgeRow: { alignItems: 'flex-start' },

  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  sectionTitle: { marginBottom: Spacing.sm },

  ingredientCard: { marginBottom: Spacing.sm },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  ingredientMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  ingredientDesc: {
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },

  noSignalTitle: { marginBottom: Spacing.sm },
  noSignalCard: {},
  noSignalItem: { paddingVertical: Spacing.xs },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.accent,
  },

  photoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.accent + '44',
  },
  photoBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent + '33',
    flexShrink: 0,
  },
  photoBannerText: {
    flex: 1,
    color: Colors.accent,
    lineHeight: 18,
  },

  recallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.danger + '44',
  },
  recallBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.danger + '33',
  },

  premiumGate: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  premiumGateCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
    ...Shadows.soft,
  },
  premiumGateEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  premiumGateTitle: { textAlign: 'center', marginBottom: Spacing.sm },
  premiumGateBody: { textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },
  premiumGateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xxl,
  },
  premiumGateBtnText: { ...Typography.labelLarge, color: '#fff' },

  disclaimerSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  disclaimerText: { lineHeight: 18 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bottomBtn: { flex: 1 },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.md,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  sheetOptions: { gap: Spacing.md },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSuccess: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.safe,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    zIndex: 999,
    ...Shadows.elevated,
  },
  toastText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: Typography.bodyMedium.fontSize,
    color: '#fff',
  },

  circleSectionWrap: {
    paddingHorizontal: Spacing.xl,
  },
  circleShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  circleShareIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default styles;
