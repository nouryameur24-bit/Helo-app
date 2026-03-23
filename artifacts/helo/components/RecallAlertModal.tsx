import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { RecallAlertState } from '@/hooks/useRecallAlerts';

interface Props {
  alert: RecallAlertState | null;
  onDismiss: () => void;
  onRemoveFromShelf: (barcode?: string) => void;
}

export function RecallAlertModal({ alert, onDismiss, onRemoveFromShelf }: Props) {
  const visible = !!alert;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [visible]);

  if (!alert) return null;

  const { match } = alert;
  const { recall } = match;

  const handleMoreInfo = () => {
    if (recall.lien_vers_la_fiche_rappel) {
      Linking.openURL(recall.lien_vers_la_fiche_rappel).catch(() => {});
    }
  };

  const handleRemove = () => {
    onRemoveFromShelf(match.product.barcode);
  };

  const conductesToKeep = recall.conduites_a_tenir_par_le_consommateur
    ?.split('|')
    .slice(0, 3)
    .filter(Boolean) ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* ── Handle ── */}
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* ── Warning icon ── */}
            <View style={styles.iconCircle}>
              <Feather name="alert-triangle" size={36} color={Colors.danger} />
            </View>

            {/* ── Title ── */}
            <ThemedText variant="headlineLarge" style={styles.title}>
              ALERTE RAPPEL PRODUIT
            </ThemedText>

            {/* ── Product card ── */}
            <View style={styles.productCard}>
              {recall.liens_vers_les_images ? null : null}
              <ThemedText variant="headlineMedium" color="textPrimary" style={styles.productName}>
                {recall.libelle || match.product.productName}
              </ThemedText>
              {(recall.marque_produit || match.product.brand) && (
                <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 2 }}>
                  {recall.marque_produit || match.product.brand}
                </ThemedText>
              )}

              <View style={styles.divider} />

              {/* Motif */}
              <View style={styles.row}>
                <Feather name="info" size={16} color={Colors.danger} style={styles.rowIcon} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="labelSmall" color="textTertiary">Motif du rappel</ThemedText>
                  <ThemedText variant="bodyMedium" color="textPrimary" style={{ marginTop: 2 }}>
                    {recall.motif_rappel}
                  </ThemedText>
                </View>
              </View>

              {/* Risques */}
              {recall.risques_encourus && (
                <View style={[styles.row, { marginTop: Spacing.md }]}>
                  <Feather name="zap" size={16} color={Colors.caution} style={styles.rowIcon} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelSmall" color="textTertiary">Risques</ThemedText>
                    <ThemedText variant="bodyMedium" color="textPrimary" style={{ marginTop: 2 }}>
                      {recall.risques_encourus}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Conduites */}
              {conductesToKeep.length > 0 && (
                <View style={[styles.row, { marginTop: Spacing.md }]}>
                  <Feather name="check-circle" size={16} color={Colors.safe} style={styles.rowIcon} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelSmall" color="textTertiary">À faire</ThemedText>
                    {conductesToKeep.map((c: string, i: number) => (
                      <ThemedText key={i} variant="bodySmall" color="textPrimary" style={{ marginTop: 2 }}>
                        • {c.charAt(0).toUpperCase() + c.slice(1)}
                      </ThemedText>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* ── Ne consommez pas ── */}
            <View style={styles.warningBanner}>
              <Feather name="slash" size={18} color={Colors.danger} />
              <ThemedText variant="bodyLarge" style={styles.warningText}>
                Ne consommez pas ce produit
              </ThemedText>
            </View>

            {/* ── CTAs ── */}
            <View style={styles.ctas}>
              <Button variant="primary" fullWidth onPress={handleRemove}>
                Retirer de mon placard
              </Button>
              <View style={{ height: Spacing.sm }} />
              <Button variant="secondary" fullWidth onPress={handleMoreInfo}>
                Plus d'infos sur RappelConso
              </Button>
              <View style={{ height: Spacing.sm }} />
              <Pressable style={styles.dismissLink} onPress={onDismiss}>
                <ThemedText variant="bodySmall" color="textTertiary">
                  Je le sais déjà — fermer
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.dangerBg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.danger + '44',
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.danger + '33',
  },
  title: {
    color: Colors.danger,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: Spacing.xl,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  productName: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rowIcon: {
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.danger + '33',
  },
  warningText: {
    color: Colors.danger,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    flex: 1,
  },
  ctas: {
    gap: 0,
  },
  dismissLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
