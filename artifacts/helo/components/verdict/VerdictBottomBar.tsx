import { router } from 'expo-router';
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
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
  const { isPremium } = usePremium();

  // Étape 3 — M3 : navigation conditionnée par le statut Premium. En non-
  // premium on shortcut vers le paywall sans même construire les params
  // — économie d'une sérialisation JSON, et plus important, alignement
  // 1:1 avec le bouclier backend (qui refusera tout de toute façon).
  const goToAlternatives = () => {
    if (!isPremium) {
      router.push({ pathname: '/paywall', params: { trigger: 'feature' } });
      return;
    }
    const danger = verdict.flaggedIngredients
      .filter((m) => m.riskLevel === 'danger')
      .map((m) => m.ingredientName)
      .filter(Boolean);
    const caution = verdict.flaggedIngredients
      .filter((m) => m.riskLevel === 'caution')
      .map((m) => m.ingredientName)
      .filter(Boolean);
    const t: Trimester = (trimester ?? 2) as Trimester;
    // Audit final fix : avant, category était HARDCODÉ 'cosmetic' → un aliment
    // dangereux proposait des alternatives cosmétiques. On dérive depuis la
    // source (signal fiable : OBF=cosmétique, OFF/resto=food). Fallback cosmetic
    // (comportement historique) si source inconnue → zéro régression.
    const category =
      product.source === 'openfoodfacts' || product.source === 'helo_restaurant'
        ? 'food'
        : product.source === 'openbeautyfacts'
          ? 'cosmetic'
          : (product.categories ?? []).some((c) => /aliment|food|boisson|snack|drink/i.test(c))
            ? 'food'
            : 'cosmetic';
    router.push({
      pathname: '/alternatives',
      params: {
        barcode,
        category,
        productName: product.name,
        productBrand: product.brand ?? '',
        flaggedDanger: JSON.stringify(danger),
        flaggedCaution: JSON.stringify(caution),
        trimester: String(t),
      },
    });
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomPad + Spacing.lg }]}>
      <View style={styles.bottomActions}>
        {verdict.verdict !== 'safe' ? (
          <>
            <View style={styles.bottomBtn}>
              {isPremium ? (
                <Button
                  variant="primary"
                  fullWidth
                  onPress={goToAlternatives}
                >
                  Voir les alternatives →
                </Button>
              ) : (
                <LockedAlternativesCta onPress={goToAlternatives} />
              )}
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

// ─── Locked Alternatives CTA (Étape 3 — M3) ────────────────────────────────
// Remplace le bouton primaire "Voir les alternatives" pour les utilisatrices
// free. Identité visuelle : fond crème, bord doré, cadenas + couronne, halo
// gradient subtil — assez désirable pour donner envie de cliquer, assez
// distinct du bouton premium pour signaler le gate sans frustrer.

function LockedAlternativesCta({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Débloquer les alternatives expertes"
      style={({ pressed }) => [
        lockedStyles.wrap,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <View style={lockedStyles.iconWrap}>
        <Feather name="lock" size={14} color={Colors.accentDark} />
      </View>
      <ThemedText
        style={lockedStyles.label}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        👑 Débloquer les alternatives expertes
      </ThemedText>
    </Pressable>
  );
}

const lockedStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    ...Shadows.soft,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.labelLarge,
    color: Colors.accentDark,
    fontSize: 14,
    flexShrink: 1,
  },
});
