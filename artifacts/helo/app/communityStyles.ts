// Styles extraits de community.tsx (push S+ découpe).
import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  listContent: {
    paddingBottom: 120,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },

  // ── Supabase unavailable banner ───────────────────────────────────────────────
  supabaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  supabaseBannerText: {
    flex: 1,
    lineHeight: 18,
  },

  header: {
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  titleRow: {
    marginBottom: Spacing.xs,
  },

  // ── Circle card ──────────────────────────────────────────────────────────────
  circleCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  circleDecor1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent,
    opacity: 0.08,
    right: -20,
    top: -30,
  },
  circleDecor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    opacity: 0.06,
    right: 40,
    bottom: -20,
  },
  circleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  circleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,169,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCardBody: { flex: 1 },
  circleCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  circleCardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  circleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFeatures: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  circleFeatureChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  circleFeatureText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'PlusJakartaSans_500Medium',
  },

  // ── Contribute card ──────────────────────────────────────────────────────────
  contributeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  contributeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributeBody: { flex: 1 },
  contributeSubtext: { marginTop: 2 },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // ── Product cards ──────────────────────────────────────────────────────────
  productCard: {
    overflow: 'hidden',
    ...Shadows.soft,
  },
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  productImage: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSecondary,
    flexShrink: 0,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submissionCardName: { marginTop: 3 },
  productCardInfo: {
    flex: 1,
    gap: 2,
  },
  productCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0,
    textTransform: 'none',
  },
  categoryChip: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.md,
  },
  categoryChipText: {
    color: Colors.accentDark,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0,
    textTransform: 'none',
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  howItWorksTitle: { marginBottom: Spacing.lg, textAlign: 'center' },
  stepText: { flex: 1, lineHeight: 20 },
  emptyWrap: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  stepBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
