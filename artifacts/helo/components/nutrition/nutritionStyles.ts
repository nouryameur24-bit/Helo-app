import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },

  heroCard: { borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm, ...Shadows.medium },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  phaseTag: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: Spacing.sm },

  sectionTitle: { marginBottom: Spacing.md },
  sectionSubtitle: { marginBottom: Spacing.xl },

  nutrientsCard: { gap: Spacing.xl },
  dotsRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  fillTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.borderLight, overflow: 'hidden', width: '100%' },

  nutrientRow: { flexDirection: 'row', alignItems: 'flex-start' },
  nutrientLeft: { flexDirection: 'row', flex: 1, gap: Spacing.md },
  nutrientEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  nutrientInfo: { flex: 1, gap: 4 },
  nutrientTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nutrientMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },

  foodCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  foodEmoji: { fontSize: 32, width: 44, textAlign: 'center' },
  foodInfo: { flex: 1 },
  foodTags: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },

  nutrientTag: { backgroundColor: Colors.accentLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  nutrientTagText: { fontSize: 11, color: Colors.accentDark, fontFamily: 'PlusJakartaSans_600SemiBold' },

  safeBadge: { backgroundColor: Colors.safeBg, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  safeBadgeText: { fontSize: 11, color: Colors.safe, fontFamily: 'PlusJakartaSans_600SemiBold' },

  recipeCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.soft },
  recipeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  recipeEmoji: { fontSize: 32, width: 44, textAlign: 'center' },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  recipeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textTertiary },
  recipeTagsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.md },
  recipeBody: { marginTop: Spacing.sm },
  ingredientLine: { marginTop: 4, paddingLeft: 4 },
  recipeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.md, backgroundColor: Colors.safeBg, borderRadius: Radius.md, padding: Spacing.md },

  tipPill: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, ...Shadows.soft },
});

export default styles;
