import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  circleCard: { gap: Spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.accentLight, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  codeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, letterSpacing: 4, color: Colors.accent },
  memberAvatarRow: { flexDirection: 'row', gap: -(Spacing.sm), alignItems: 'center' },

  glowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  glowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  glowIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  glowCounterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },

  challengeCard: { gap: Spacing.md },
  challengeProgressBar: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.accentLight, overflow: 'hidden' },
  challengeProgress: { gap: Spacing.md },
  challengeMemberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  challengeMemberName: { width: 60, flexShrink: 0 },
  progressBarWrap: { flex: 1 },
  progressBarBg: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.accentLight, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: Radius.full, backgroundColor: Colors.accent },
  challengeCount: { width: 30, textAlign: 'right' as const },

  feedLabel: { marginBottom: Spacing.sm },
  feedCard: { gap: Spacing.md },
  feedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  feedAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface, flexShrink: 0 },
  feedAvatarInitial: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  verdictBadge: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  verdictBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', letterSpacing: 0.3 },
  reactionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.xs },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.borderLight },
  reactionBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentLight },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary },

  emptyFeed: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },

  inputBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface },
  messageInput: { flex: 1, height: 44, borderRadius: Radius.full, backgroundColor: Colors.borderLight, paddingHorizontal: Spacing.lg, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: Colors.textPrimary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', ...Shadows.soft },

  noCercleRoot: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  noCercleInner: { alignItems: 'center', gap: Spacing.md },
  noCercleEmoji: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  noCercleActions: { width: '100%', gap: Spacing.md, marginTop: Spacing.xl },
  primaryBtn: { width: '100%', borderRadius: Radius.full, overflow: 'hidden', ...Shadows.soft },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16, borderRadius: Radius.full },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', letterSpacing: 0.3 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.accentLight, backgroundColor: Colors.accentLight },
  centeredText: { textAlign: 'center' as const },

  joinInputWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  codeInput: { height: 56, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.accent, paddingHorizontal: Spacing.xl, fontSize: 22, letterSpacing: 6, textAlign: 'center' as const, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans_600SemiBold', ...Shadows.soft },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
});

export default styles;
