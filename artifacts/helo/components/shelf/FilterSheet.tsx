import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type VerdictFilter = 'tous' | 'safe' | 'caution' | 'danger';
export type CategoryFilter = 'salle-de-bain' | 'cuisine' | 'pharmacie' | 'couches' | 'lingettes-bebe' | 'creme-change' | 'lait-bebe' | 'shampoing-bebe';
export type SortOrder = 'recent' | 'oldest';

export interface FilterState {
  verdicts: VerdictFilter[];
  categories: CategoryFilter[];
  sort: SortOrder;
}

export const DEFAULT_FILTERS: FilterState = {
  verdicts: ['tous'],
  categories: [],
  sort: 'recent',
};

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const VERDICT_OPTIONS: { key: VerdictFilter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'safe', label: 'Compatibles' },
  { key: 'caution', label: 'Précaution' },
  { key: 'danger', label: 'À éviter' },
];

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: 'salle-de-bain', label: 'Salle de bain' },
  { key: 'cuisine', label: 'Cuisine' },
  { key: 'pharmacie', label: 'Pharmacie' },
  { key: 'couches', label: '👶 Couches' },
  { key: 'lingettes-bebe', label: '👶 Lingettes bébé' },
  { key: 'creme-change', label: '👶 Crème de change' },
  { key: 'lait-bebe', label: '👶 Lait bébé' },
  { key: 'shampoing-bebe', label: '👶 Shampoing bébé' },
];

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: 'recent', label: 'Plus récents' },
  { key: 'oldest', label: 'Plus anciens' },
];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <ThemedText
        variant="bodySmall"
        color={selected ? 'accentDark' : 'textSecondary'}
        style={selected ? { fontFamily: 'PlusJakartaSans_600SemiBold' } : undefined}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function FilterSheet({ visible, onClose, filters, onApply }: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState<FilterState>(filters);

  React.useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const toggleVerdict = (key: VerdictFilter) => {
    if (key === 'tous') {
      setLocal((s) => ({ ...s, verdicts: ['tous'] }));
      return;
    }
    setLocal((s) => {
      const without = s.verdicts.filter((v) => v !== 'tous' && v !== key);
      const has = s.verdicts.includes(key);
      const next = has ? without : [...without, key];
      return { ...s, verdicts: next.length === 0 ? ['tous'] : next };
    });
  };

  const toggleCategory = (key: CategoryFilter) => {
    setLocal((s) => {
      const has = s.categories.includes(key);
      return {
        ...s,
        categories: has
          ? s.categories.filter((c) => c !== key)
          : [...s.categories, key],
      };
    });
  };

  const handleReset = () => {
    setLocal(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              Filtrer
            </ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <ThemedText variant="labelSmall" color="textTertiary">
                VERDICT
              </ThemedText>
              <View style={styles.chipsRow}>
                {VERDICT_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={local.verdicts.includes(opt.key)}
                    onPress={() => toggleVerdict(opt.key)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText variant="labelSmall" color="textTertiary">
                CATÉGORIE
              </ThemedText>
              <View style={styles.chipsRow}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={local.categories.includes(opt.key)}
                    onPress={() => toggleCategory(opt.key)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText variant="labelSmall" color="textTertiary">
                TRIER PAR
              </ThemedText>
              <View style={styles.chipsRow}>
                {SORT_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={local.sort === opt.key}
                    onPress={() => setLocal((s) => ({ ...s, sort: opt.key }))}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" onPress={handleReset} fullWidth>
                Réinitialiser
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="primary" onPress={handleApply} fullWidth>
                Appliquer
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundSecondary,
  },
  chipSelected: {
    backgroundColor: Colors.accentLight,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
