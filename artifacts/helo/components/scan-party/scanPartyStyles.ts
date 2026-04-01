import { Dimensions, StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

export const cfg = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center',
  },
  badge: { backgroundColor: Colors.accent, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  scrollContent: { paddingHorizontal: Spacing.xl, gap: Spacing.xxl, paddingBottom: 40 },
  heroWrap: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.medium },
  heroGradient: { padding: Spacing.xxl, alignItems: 'center', borderRadius: Radius.xl },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  counterCard: { alignItems: 'center' },
  section: {},
  sectionTitle: { marginBottom: Spacing.md },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  themeCard: {
    flex: 1, minWidth: '44%', alignItems: 'center', padding: Spacing.lg,
    borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1.5,
    borderColor: Colors.borderLight, ...Shadows.soft,
  },
  themeCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentLight },
  themeEmoji: { fontSize: 28 },
  startWrap: { alignItems: 'center' },
  startBtn: { borderRadius: Radius.full, overflow: 'hidden', ...Shadows.elevated },
  startBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 18, paddingHorizontal: 48, borderRadius: Radius.full,
  },
  startBtnLabel: { ...Typography.labelLarge, color: '#fff', fontSize: 18 },
});

export const scan = StyleSheet.create({
  permRoot: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xxl,
  },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  partBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.accent,
  },
  counterBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  vf: { position: 'absolute', top: H * 0.28, left: (W - 260) / 2, width: 260, height: 260 },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: Colors.accent },
  corner_tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  corner_tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  corner_bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  corner_br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  verdictFlash: { position: 'absolute', top: '30%', left: Spacing.xxl, right: Spacing.xxl, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', ...Shadows.elevated },
  verdictLabel: { textAlign: 'center', letterSpacing: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingTop: Spacing.xl, paddingHorizontal: Spacing.xl, backgroundColor: 'rgba(0,0,0,0.55)' },
  finishBtn: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.full },
});

export type CornerPos = 'tl' | 'tr' | 'bl' | 'br';
export const CORNER_STYLES: Record<CornerPos, object> = {
  tl: scan.corner_tl,
  tr: scan.corner_tr,
  bl: scan.corner_bl,
  br: scan.corner_br,
};

export const sum = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  backBtn: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.xl },
  scoreHero: { borderRadius: Radius.xl, padding: Spacing.xxxl, alignItems: 'center', ...Shadows.medium },
  card: { ...Shadows.soft },
  bigBar: { flexDirection: 'row', height: 14, borderRadius: Radius.full, overflow: 'hidden', backgroundColor: Colors.borderLight },
  barSeg: { height: 14 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  productDot: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  verdictChip: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  actions: { marginTop: Spacing.sm },
});

export const exp = StyleSheet.create({
  captureWrap: { position: 'absolute', top: 0, left: -9999, width: 1080 / 2, opacity: 0 },
  card: { width: 1080 / 2, minHeight: 1920 / 2, padding: 40, justifyContent: 'flex-start' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
  logoBadge: { backgroundColor: Colors.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  logoText: { ...Typography.labelLarge, color: '#fff', fontSize: 18 },
  headerRight: { alignItems: 'flex-end' },
  partLabel: { ...Typography.labelSmall, color: Colors.accent, letterSpacing: 2 },
  themeLabel: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scoreBlock: { alignItems: 'center', marginVertical: 32 },
  scoreMain: { fontSize: 72, fontWeight: '700', color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' },
  scoreSlash: { fontSize: 48, color: 'rgba(255,255,255,0.5)' },
  scoreLabel: { ...Typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  barWrap: { marginBottom: 32 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12 },
  barSeg: { height: 10 },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendTxt: { ...Typography.bodySmall, color: Colors.safe },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listDot: { fontSize: 16, width: 20 },
  listName: { flex: 1, ...Typography.bodySmall, color: 'rgba(255,255,255,0.85)' },
  listVerdict: { ...Typography.labelSmall, fontSize: 9 },
  listMore: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  watermark: { marginTop: 'auto', paddingTop: 32, alignItems: 'center' },
  watermarkText: { ...Typography.labelSmall, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 },
});

export const pay = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xxl, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: Spacing.xl },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: Spacing.lg },
  title: { textAlign: 'center', marginBottom: Spacing.md },
  body: { textAlign: 'center', marginBottom: Spacing.xl },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
});
