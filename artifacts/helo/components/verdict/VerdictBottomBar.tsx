import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Colors, Spacing } from '@/constants/theme';
import { useTrimester } from '@/hooks/useTrimester';
import type { ProductData, Trimester, VerdictResult } from '@/types';
import { BOTTOM_BAR_HEIGHT } from './verdictHelpers';
import styles from './verdictStyles';

interface VerdictBottomBarProps {
  verdict: VerdictResult;
  product: ProductData;
  barcode: string;
  onShelf: () => void;
  onShare: () => void;
  bottomPad: number;
}

export function VerdictBottomBar({
  verdict,
  product,
  barcode,
  onShelf,
  onShare,
  bottomPad,
}: VerdictBottomBarProps) {
  const { trimester } = useTrimester();
  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomPad + Spacing.lg }]}>
      <View style={styles.bottomActions}>
        {verdict.verdict !== 'safe' ? (
          <>
            <View style={styles.bottomBtn}>
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  const danger = verdict.flaggedIngredients
                    .filter((m) => m.riskLevel === 'danger')
                    .map((m) => m.ingredientName)
                    .filter(Boolean);
                  const caution = verdict.flaggedIngredients
                    .filter((m) => m.riskLevel === 'caution')
                    .map((m) => m.ingredientName)
                    .filter(Boolean);
                  const t: Trimester = (trimester ?? 2) as Trimester;
                  router.push({
                    pathname: '/alternatives',
                    params: {
                      barcode,
                      category: 'cosmetic',
                      productName: product.name,
                      productBrand: product.brand ?? '',
                      flaggedDanger: JSON.stringify(danger),
                      flaggedCaution: JSON.stringify(caution),
                      trimester: String(t),
                    },
                  });
                }}
              >
                Voir les alternatives →
              </Button>
            </View>
            <View style={styles.bottomBtn}>
              <Button variant="secondary" fullWidth onPress={onShelf}>
                Ajouter au placard
              </Button>
            </View>
          </>
        ) : (
          <Button variant="primary" fullWidth onPress={onShelf}>
            Ajouter au placard
          </Button>
        )}
      </View>

      <View style={styles.iconRow}>
        <IconButton onPress={onShare} size={44} accessibilityLabel="Partager">
          <Feather name="share-2" size={18} color={Colors.textSecondary} />
        </IconButton>
        <IconButton
          onPress={() =>
            router.push({
              pathname: '/compare',
              params: { barcode, slot: 'A' },
            })
          }
          size={44}
          accessibilityLabel="Comparer"
        >
          <Feather name="git-branch" size={18} color={Colors.textSecondary} />
        </IconButton>
        <IconButton onPress={() => router.back()} size={44} accessibilityLabel="Scanner un autre produit">
          <Feather name="camera" size={18} color={Colors.textSecondary} />
        </IconButton>
      </View>
    </View>
  );
}
