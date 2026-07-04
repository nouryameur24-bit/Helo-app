// Styles extraits de restaurant-results.tsx (push S+ découpe).
import { StyleSheet } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  backBtn: { padding: Spacing.xs },
  shareBtn: { padding: Spacing.xs },

  // Summary
  summaryCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  summaryTitle: {
    ...Typography.headlineLarge,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statNumber: { ...Typography.displayMedium, fontFamily: 'PlusJakartaSans_700Bold' },
  statLabel: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Tabs
  tabsScroll: { marginBottom: Spacing.md },
  tabsContent: { paddingRight: Spacing.xl, gap: Spacing.sm },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { flex: 1 },
  empty: { textAlign: 'center', marginVertical: Spacing.xl },

  // Dish card
  dishCard: { marginBottom: Spacing.sm, ...Shadows.soft },
  dishHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dishNameRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dishName: { fontFamily: 'PlusJakartaSans_500Medium' },
  dishRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  riskBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  riskBadgeText: { ...Typography.labelSmall, fontFamily: 'PlusJakartaSans_600SemiBold' },
  dishDetail: { marginTop: Spacing.xs },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: 4 },
  bullet: { color: Colors.textTertiary, marginTop: 1 },
  reasonText: { flex: 1, lineHeight: 18 },
  questionsBlock: { marginTop: Spacing.md },
  questionsLabel: { marginBottom: Spacing.sm },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  questionText: { flex: 1, lineHeight: 18, fontStyle: 'italic' },

  // Safe section
  safeCard: { borderWidth: 1 },
  safeDishRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  safeDishText: { flex: 1 },

  // Questions for waiter
  questionsHint: { marginBottom: Spacing.md },
  questionsList: { gap: Spacing.sm },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  questionCardCopied: {
    backgroundColor: Colors.safe + '11',
    borderColor: Colors.safe + '44',
  },
  questionCardText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Disclaimer
  disclaimer: { paddingTop: Spacing.sm },
  disclaimerText: { lineHeight: 18, textAlign: 'center' },

  // Premium gate
  premiumEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  premiumTitle: { textAlign: 'center', marginBottom: Spacing.sm },
  premiumBody: { textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },
  premiumBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxl,
    ...Shadows.medium,
  },
  premiumBtnText: { ...Typography.labelLarge, color: '#fff' },
  retryText: { ...Typography.labelLarge, color: Colors.accent },
});
