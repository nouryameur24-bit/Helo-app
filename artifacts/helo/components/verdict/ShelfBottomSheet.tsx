import React, { useState } from 'react';
import { Modal, Pressable, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import styles from './verdictStyles';

const SHELF_OPTIONS = [
  { key: 'salle-de-bain', label: 'Salle de bain', icon: 'droplet' as const },
  { key: 'cuisine',       label: 'Cuisine',       icon: 'coffee'  as const },
  { key: 'pharmacie',     label: 'Pharmacie',     icon: 'plus-circle' as const },
];

const BABY_SHELF_OPTIONS = [
  { key: 'couches',        label: 'Couches',           icon: 'package'     as const },
  { key: 'lingettes-bebe', label: 'Lingettes bébé',    icon: 'wind'        as const },
  { key: 'creme-change',   label: 'Crème de change',   icon: 'sun'         as const },
  { key: 'lait-bebe',      label: 'Lait bébé',         icon: 'thermometer' as const },
  { key: 'shampoing-bebe', label: 'Shampoing bébé',    icon: 'droplet'     as const },
];

interface ShelfBottomSheetProps {
  visible: boolean;
  onSelect: (category: string) => void;
  onClose: () => void;
  babyMode?: boolean;
}

export function ShelfBottomSheet({ visible, onSelect, onClose, babyMode }: ShelfBottomSheetProps) {
  const checkScale = useSharedValue(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const handleSelect = (cat: string) => {
    setChosen(cat);
    checkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      onSelect(cat);
      setChosen(null);
      checkScale.value = 0;
    }, 700);
  };

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <ThemedText variant="headlineMedium" style={styles.sheetTitle}>
          Ajouter au placard
        </ThemedText>
        {chosen ? (
          <View style={styles.sheetSuccess}>
            <Animated.View style={checkStyle}>
              <Feather name="check-circle" size={52} color={Colors.safe} />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.sheetOptions}>
            {(babyMode ? BABY_SHELF_OPTIONS : SHELF_OPTIONS).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.sheetOption}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter dans ${opt.label}`}
              >
                <View style={styles.sheetOptionIcon}>
                  <Feather name={opt.icon} size={22} color={Colors.accent} />
                </View>
                <ThemedText variant="bodyLarge">{opt.label}</ThemedText>
                <Feather name="chevron-right" size={18} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          onPress={onClose}
          style={styles.sheetCancel}
          accessibilityRole="button"
          accessibilityLabel="Annuler"
        >
          <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
