import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const pactStyles = StyleSheet.create({
  root: { flex: 1 },

  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },

  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  handsIllustration: {
    width: 120,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },

  handArc: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  handCenter: {
    position: 'absolute',
  },

  heroTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: Colors.accent,
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  heroSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.sm,
  },

  section: {
    gap: Spacing.md,
  },

  sectionTitle: {
    marginBottom: Spacing.sm,
  },

  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 2,
  },

  durationChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  durationLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },

  durationSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
  },

  witnessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  witnessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  witnessChipSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight + '44',
  },

  witnessAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  witnessAvatarSelected: {
    backgroundColor: Colors.accent,
  },

  witnessInitial: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Colors.accentDark ?? '#B8945A',
  },

  witnessName: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: Colors.textPrimary,
    maxWidth: 80,
  },

  linkShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  linkShareText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },

  rewardsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },

  rewardPreview: {
    alignItems: 'center',
    gap: 2,
  },

  signSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },

  signBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },

  signBtnSigned: {},

  signBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: Spacing.md,
  },

  signBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: 'white',
    letterSpacing: 0.2,
  },

  signatureRow: {
    alignItems: 'center',
    height: 24,
  },

  signatureLine: {
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },

  signatureText: {
    position: 'absolute',
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 3,
    top: 4,
  },

  signNote: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xl,
  },

  flameCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.soft,
  },

  flameGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },

  dayLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: Colors.accent,
    letterSpacing: -0.3,
  },

  streakLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },

  progressSection: {
    gap: Spacing.sm,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  progressFill: {
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },

  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  badgeTile: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: 4,
  },

  badgeTileLocked: {
    opacity: 0.45,
    borderColor: Colors.border,
  },

  badgeEmoji: {
    fontSize: 28,
  },

  badgeLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  badgeSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  witnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  witnessAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  witnessInitialSmall: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Colors.accentDark ?? '#B8945A',
  },

  witnessStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CB69F',
    marginLeft: 'auto',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.soft,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },

  statNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: Colors.accent,
    letterSpacing: -0.5,
  },

  scanCTA: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },

  scanCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
  },

  scanCTAText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: 'white',
  },
});

export default pactStyles;
