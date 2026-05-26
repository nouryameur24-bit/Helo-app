/**
 * components/alternatives/AffiliateButton.tsx — Lot 19-G1
 *
 * Bouton réutilisable pour un lien marchand. Wrapper autour de
 * `openMerchantLink` qui s'occupe du tracking + analytics + in-app browser.
 *
 * Usage :
 * ```tsx
 * <AffiliateButton
 *   merchant="amazon"
 *   url={alt.purchase_links?.amazon}
 *   productId={alt.id}
 *   sourceProductId={sourceBarcode}
 *   userId={userId}
 *   context="alternative_card"
 * />
 * ```
 */
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  merchantLabel,
  openMerchantLink,
  type Merchant,
} from '@/lib/affiliateLinks';

interface AffiliateButtonProps {
  merchant: Merchant;
  url: string;
  productId?: string | null;
  sourceProductId?: string | null;
  userId?: string | null;
  context?: 'alternative_card' | 'product_detail' | 'recall_replacement';
  compact?: boolean;
}

const ICONS: Record<Merchant, keyof typeof Feather.glyphMap> = {
  amazon: 'package',
  monoprix: 'shopping-cart',
  bebe9: 'gift',
  pharma_express: 'briefcase',
};

export function AffiliateButton({
  merchant,
  url,
  productId,
  sourceProductId,
  userId,
  context = 'alternative_card',
  compact = false,
}: AffiliateButtonProps) {
  const handlePress = () => {
    openMerchantLink({
      merchant,
      url,
      productId,
      sourceProductId,
      userId,
      context,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.btn, compact && styles.btnCompact]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Acheter sur ${merchantLabel(merchant)}`}
    >
      <Feather name={ICONS[merchant]} size={12} color={Colors.accent} />
      <ThemedText
        variant="bodySmall"
        style={{ marginLeft: 4, color: Colors.accent, fontWeight: '600' }}
      >
        {merchantLabel(merchant)}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentLight,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  btnCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
