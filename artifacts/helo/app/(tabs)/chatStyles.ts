// Styles extraits de chat.tsx (push S+ découpe).
import { StyleSheet, Platform } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headerTitle: {
    color: Colors.textPrimary,
  },
  clearBtn: {
    padding: Spacing.sm,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.huge,
    paddingHorizontal: Spacing.xl,
  },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  emptyAvatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  emptyTitle: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentLight + '55',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  limitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  avatarPlaceholder: {
    width: 28,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.soft,
  },
  bubbleUser: {
    backgroundColor: Colors.surfaceElevated,
    borderBottomRightRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleAi: {
    backgroundColor: Colors.accentLight + '55',
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  typingBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  bubbleText: {
    lineHeight: 21,
    fontSize: 14,
  },
  bubbleTextUser: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bubbleTextAi: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Bottom area
  bottomArea: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },

  // Suggestions
  prescriptionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  prescriptionCTAText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textPrimary,
  },
  prescriptionBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  prescriptionBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  suggestionsScroll: {
    marginBottom: Spacing.sm,
  },
  suggestionsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Limit warning
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  limitWarningText: {
    fontSize: 12,
    color: Colors.caution,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Premium banner
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.accentLight + '44',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: Spacing.md,
  },
  premiumBannerLeft: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginBottom: 2,
  },
  premiumBannerBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 17,
  },
  premiumBannerBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexShrink: 0,
  },
  premiumBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    maxHeight: 120,
    ...Shadows.soft,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  sendBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
