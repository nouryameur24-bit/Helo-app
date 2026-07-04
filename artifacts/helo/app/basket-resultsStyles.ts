// Styles extraits de basket-results.tsx (push S+ découpe).
import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  shareBtn: { padding: Spacing.xs },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl },

  // Score
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.safe,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 64,
  },
  scoreSlash: {
    fontSize: 40,
    color: Colors.textTertiary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  scoreTotal: {
    fontSize: 40,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  scoreLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginLeft: 4,
    alignSelf: 'flex-end',
    paddingBottom: 6,
  },

  // Color bar
  barSection: { marginBottom: Spacing.xxl },
  colorBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
    gap: 2,
    marginBottom: Spacing.sm,
  },
  barSegment: { minWidth: 4 },
  barLegend: {
    flexDirection: 'row',
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  // Product list
  section: { gap: Spacing.sm },
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productInfo: { flex: 1 },
  verdictBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    flexShrink: 0,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Actions
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  addShelfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    ...Shadows.soft,
  },
  addShelfBtnDone: {
    backgroundColor: Colors.safeLight,
    borderWidth: 1,
    borderColor: Colors.safe + '55',
  },
  addShelfBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  newScanBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
