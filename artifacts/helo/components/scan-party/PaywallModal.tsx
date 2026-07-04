import React from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { pay } from './scanPartyStyles';

interface PaywallModalProps {
  onClose: () => void;
  onUnlock: () => void;
}

const FEATURES = [
  '✓ Scan illimité de produits',
  '✓ Export image haute résolution',
  '✓ Historique de toutes tes parties',
  '✓ Thèmes exclusifs débloqués',
];

function PaywallModal({ onClose, onUnlock }: PaywallModalProps) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pay.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
        <View style={pay.sheet}>
          <View style={pay.handle} />
          <ThemedText style={pay.emoji}>⭐</ThemedText>
          <ThemedText variant="headlineLarge" color="textPrimary" style={pay.title}>
            Scan Party Premium
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={pay.body}>
            Débloquez toutes les fonctionnalités pour scanner en illimité.
          </ThemedText>
          <View style={pay.features}>
            {FEATURES.map((f) => (
              <View key={f} style={pay.featureRow}>
                <ThemedText variant="bodyMedium" style={{ color: Colors.safe }}>{f}</ThemedText>
              </View>
            ))}
          </View>
          <View style={{ marginTop: Spacing.xxl, gap: Spacing.md }}>
            <Button variant="primary" fullWidth onPress={onUnlock} accessibilityLabel="Débloquer Premium">
              Débloquer — 4,99 €/mois
            </Button>
            <Button variant="ghost" fullWidth onPress={onClose} accessibilityLabel="Annuler">
              Non merci
            </Button>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export default React.memo(PaywallModal);
