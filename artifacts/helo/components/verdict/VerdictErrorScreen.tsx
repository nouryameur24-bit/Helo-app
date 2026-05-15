import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import styles from './verdictStyles';

interface VerdictErrorScreenProps {
  error: string;
  barcode: string;
  topInset: number;
}

export function VerdictErrorScreen({ error, barcode, topInset }: VerdictErrorScreenProps) {
  const isNotFound = error.startsWith('Produit non trouvé');

  return (
    <View style={[styles.root, { paddingTop: topInset + Spacing.lg }]}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        <ThemedText variant="bodyMedium" style={styles.backRowText}>Retour</ThemedText>
      </TouchableOpacity>

      <View style={styles.errorCenter}>
        <View style={[styles.iconCircle, { backgroundColor: isNotFound ? Colors.cautionBg : Colors.dangerLight }]}>
          <Feather
            name={isNotFound ? 'search' : 'wifi-off'}
            size={32}
            color={isNotFound ? Colors.caution : Colors.danger}
          />
        </View>

        <ThemedText variant="headlineMedium" style={styles.centeredText}>
          {isNotFound ? 'Produit non trouvé' : 'Erreur de chargement'}
        </ThemedText>

        <ThemedText
          variant="bodyMedium"
          color="textSecondary"
          style={[styles.centeredText, styles.errorSubtitle]}
        >
          {isNotFound
            ? "Ce produit n'est pas encore dans notre base de données."
            : error}
        </ThemedText>

        <View style={styles.errorActions}>
          {isNotFound && (
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                router.push({
                  pathname: '/submit-product',
                  params: { barcode },
                });
              }}
            >
              Contribuer — ajouter ce produit ✦
            </Button>
          )}
          <Button
            variant={isNotFound ? 'secondary' : 'primary'}
            fullWidth
            onPress={() => router.back()}
          >
            Scanner un autre produit
          </Button>
        </View>
      </View>
    </View>
  );
}
