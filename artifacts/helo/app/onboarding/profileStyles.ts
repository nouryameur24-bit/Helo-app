// Styles extraits de profile.tsx (push S+ découpe).
import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  stepDotDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stepDotActive: {
    backgroundColor: Colors.accentDark,
    borderColor: Colors.accentDark,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  stepLineEmpty: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 4,
  },
  header: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  inputFocused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceElevated,
  },
  input: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    padding: 0,
    flex: 1,
  },
  trimesterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  chipInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  chipLabel: {
    ...Typography.labelLarge,
    fontSize: 13,
  },
  ctaBlock: {
    gap: 0,
  },
  disclaimer: {
    lineHeight: 18,
    textAlign: "center",
  },
});

export const previewStyles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  headline: {
    fontWeight: '600',
    lineHeight: 24,
  },
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avoidDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
});
