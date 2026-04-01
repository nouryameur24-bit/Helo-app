import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },

  scrollContent: { flex: 1, paddingHorizontal: Spacing.xxl },
  centerSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxl },

  circleContainer: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  ripple: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2 },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1.5 },
  coreCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', ...Shadows.medium },

  labelContainer: { minHeight: 32, alignItems: 'center' },
  recognizedCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },

  examplesContainer: { width: '100%', alignItems: 'center', gap: Spacing.sm },
  examplePill: { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border, width: '100%', alignItems: 'center' },

  responseCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', borderWidth: 1, borderColor: Colors.accentLight, ...Shadows.soft, maxHeight: 220 },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  aiAvatarText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: Colors.surface },
  speakingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.safe, marginLeft: Spacing.xs },
  responseText: { lineHeight: 22 },

  limitCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xxl, width: '100%', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.accentLight },
  premiumBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm },

  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.dangerLight, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%' },

  controls: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  textInput: { flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },

  micRow: { alignItems: 'center', gap: Spacing.md },
  micWrap: { alignItems: 'center', gap: 4 },
  micButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', ...Shadows.elevated },

  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  nativeHint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
});

export default styles;
