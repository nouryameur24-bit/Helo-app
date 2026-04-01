import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

const profileStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
  },
  avatarInfo: {
    flex: 1,
    gap: 4,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  progressLabel: {
    textAlign: 'right',
  },
  glowCard: {
    alignItems: 'center',
  },
  glowCardInner: {
    alignItems: 'center',
  },
  statsGrid: {
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  pactBadgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pactBadgeTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: 4,
  },
  pactBadgeLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  settingGroup: {
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 1,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  codeText: {
    letterSpacing: 3,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  version: {
    textAlign: 'center',
  },
  logoutText: {
    textAlign: 'center',
  },
  contributriceBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  contributriceBadgeText: {
    color: Colors.accentDark,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45,41,38,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  circleCodeInput: {
    width: '100%',
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginBottom: Spacing.xl,
  },
  joinBtn: {
    width: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cancelModalBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});

export default profileStyles;
