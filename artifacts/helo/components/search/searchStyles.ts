import { Dimensions, StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

export const scr = StyleSheet.create({
  root: { flex: 1 },
  header: { backgroundColor: Colors.background, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, zIndex: 10, ...Shadows.soft },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  premBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accentLight, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  premText: { ...Typography.labelSmall, color: Colors.accentDark },
  barWrap: { marginBottom: Spacing.xs },
  hint: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xl },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catHeader: { alignItems: 'center', paddingBottom: Spacing.xl },
  catHeaderEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  sep: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.xl },
});

export const bar = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.lg, height: 50, ...Shadows.soft },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, ...Typography.bodyMedium, color: Colors.textPrimary, paddingVertical: 0, height: 50 },
  clear: { padding: Spacing.xs, marginLeft: Spacing.xs },
});

export const cat = StyleSheet.create({
  wrap: {},
  title: { marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  item: { width: (W - Spacing.xl * 2 - Spacing.md * 4) / 5, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderLight, ...Shadows.soft },
  itemActive: { borderColor: Colors.accent, backgroundColor: Colors.accentLight },
  emoji: { fontSize: 24, marginBottom: 4 },
  label: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center', fontSize: 10 },
  labelActive: { color: Colors.accentDark },
});

export const pc = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, backgroundColor: Colors.surface },
  iconWrap: { width: 46, height: 46, borderRadius: Radius.md, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 22 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  shelfBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accentLight, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  shelfText: { ...Typography.labelSmall, color: Colors.accent, fontSize: 9 },
});

export const top = StyleSheet.create({
  root: {},
  title: { marginBottom: Spacing.md },
  list: { gap: Spacing.md, paddingRight: Spacing.xl },
  card: { width: 140, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.soft },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  cardEmoji: { fontSize: 28 },
  cardShelfDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  cardName: { marginBottom: 2 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.safe },
  cardBadgeText: { ...Typography.labelSmall, color: Colors.safe, fontSize: 10 },
});

export const pay = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 20, paddingHorizontal: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xxl, width: '100%', alignItems: 'center', ...Shadows.elevated },
  crown: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  crownEmoji: { fontSize: 28 },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  body: { textAlign: 'center', marginBottom: Spacing.xxl, lineHeight: 22 },
  btn: { width: '100%', borderRadius: Radius.full, overflow: 'hidden' },
  btnGrad: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: Radius.full, alignItems: 'center' },
  btnText: { ...Typography.labelLarge, color: '#fff' },
});

export const empty = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  icon: { fontSize: 48, marginBottom: Spacing.lg },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  body: { textAlign: 'center', lineHeight: 22 },
});

export const CATEGORIES = [
  { id: 'visage', label: 'Soins visage', emoji: '🧴', dbCategory: 'cosmetic' as const },
  { id: 'corps', label: 'Corps', emoji: '🧼', dbCategory: 'cosmetic' as const },
  { id: 'cheveux', label: 'Cheveux', emoji: '💇', dbCategory: 'cosmetic' as const },
  { id: 'maquillage', label: 'Maquillage', emoji: '💄', dbCategory: 'cosmetic' as const },
  { id: 'fromages', label: 'Fromages', emoji: '🧀', dbCategory: 'food' as const },
  { id: 'viandes', label: 'Viandes', emoji: '🥩', dbCategory: 'food' as const },
  { id: 'poissons', label: 'Poissons', emoji: '🐟', dbCategory: 'food' as const },
  { id: 'plats', label: 'Plats', emoji: '🥗', dbCategory: 'food' as const },
  { id: 'medicaments', label: 'Médicaments', emoji: '💊', dbCategory: 'medication' as const },
  { id: 'complements', label: 'Compléments', emoji: '🌿', dbCategory: 'medication' as const },
];

export type CategoryDbType = 'cosmetic' | 'food' | 'medication';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: CategoryDbType;
  overall_risk: 'safe' | 'caution' | 'danger' | 'unknown';
  barcode: string | null;
}

export const RISK_CONFIG: Record<string, { label: string; variant: 'safe' | 'caution' | 'danger' | 'accent' }> = {
  safe: { label: 'Compatible', variant: 'safe' },
  caution: { label: 'Précaution', variant: 'caution' },
  danger: { label: 'À éviter', variant: 'danger' },
  unknown: { label: 'Inconnu', variant: 'accent' },
};
