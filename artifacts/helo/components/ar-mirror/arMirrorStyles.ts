import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  haloContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  haloOuter: { position: 'absolute', borderWidth: 2.5, shadowRadius: 12, shadowOpacity: 0.7, elevation: 8 },
  haloInner: { position: 'absolute', borderWidth: 1.5 },
  haloDot: { width: 8, height: 8, borderRadius: 4 },
  haloLabel: {
    position: 'absolute', top: -28, borderWidth: 1, borderRadius: Radius.sm,
    paddingHorizontal: 7, paddingVertical: 3, maxWidth: 180,
  },
  haloLabelText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, letterSpacing: 0.2 },

  topHud: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
  },
  hudBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  counterBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7, maxWidth: 240,
  },
  counterDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF4444' },
  counterText: {
    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: 'white',
    letterSpacing: 0.3, flexShrink: 1,
  },
  modeToggleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },

  scoreBanner: {
    position: 'absolute', top: '15%', left: '50%',
    transform: [{ translateX: -80 }], flexDirection: 'row', gap: Spacing.sm,
  },
  scoreChip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  scoreChipText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },

  quickResult: {
    position: 'absolute', left: Spacing.xl, right: Spacing.xl, bottom: '20%',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(10,10,10,0.9)', borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  quickEmoji: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  quickEmojiText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22 },
  quickName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: 'white' },
  quickLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, marginTop: 2 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  legend: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.2 },
  captureBtn: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },

  capturedFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },

  quickModeHint: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  quickModeText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: Colors.accent, letterSpacing: 0.3 },

  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, gap: Spacing.xl },
  backBtn: {
    position: 'absolute', left: Spacing.xl, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  gateDemoRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md },
  gateDemo: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  gateDemoEmoji: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28 },
  gateTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: 'white', textAlign: 'center', letterSpacing: -0.5 },
  gateSubtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  gateFeatures: { alignSelf: 'stretch', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radius.lg, padding: Spacing.xl },
  gateFeatureItem: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  gatePremiumBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, marginTop: Spacing.sm,
  },
  gatePremiumText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#1A1A1A' },

  permCenter: { backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  permText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16, color: 'white', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  permBtn: { backgroundColor: Colors.accent, borderRadius: Radius.lg, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#1A1A1A' },
});

export default styles;
