import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { captureShareCard, shareImage } from '@/lib/share';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_ASPECT = 1080 / 1920;
const PREVIEW_WIDTH = SCREEN_WIDTH - Spacing.xl * 4;
const PREVIEW_HEIGHT = PREVIEW_WIDTH / CARD_ASPECT;
const CARD_SCALE = PREVIEW_WIDTH / 1080;

interface ShareBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  card: React.ReactNode;
}

export function ShareBottomSheet({ visible, onClose, card }: ShareBottomSheetProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleShare = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const uri = await captureShareCard(viewShotRef);
      await shareImage(uri);
    } catch (err) {
      if (__DEV__) console.warn('[ShareBottomSheet] share error:', err);
      setErrorMsg("Impossible de partager l\u2019image. Veuillez r\u00e9essayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Dimmed backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Bottom sheet */}
        <View style={styles.container}>
          <View style={styles.handle} />
          <ThemedText variant="headlineMedium" style={styles.title}>
            Partager
          </ThemedText>

          {/* Scaled-down preview */}
          <View
            style={[styles.previewWrapper, { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }]}
            pointerEvents="none"
          >
            <View
              style={{
                width: 1080,
                height: 1920,
                transform: [
                  { translateX: -(1 - CARD_SCALE) * 1080 / 2 },
                  { translateY: -(1 - CARD_SCALE) * 1920 / 2 },
                  { scale: CARD_SCALE },
                ],
              }}
            >
              {card}
            </View>
          </View>

          {/* Hidden off-screen ViewShot for full-res capture */}
          <View style={styles.hiddenCapture} pointerEvents="none">
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
              style={styles.hiddenCard}
            >
              {card}
            </ViewShot>
          </View>

          {/* Error message */}
          {errorMsg && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color={Colors.danger} />
              <ThemedText variant="bodySmall" style={{ color: Colors.danger, flex: 1 }}>
                {errorMsg}
              </ThemedText>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleShare}
            >
              {loading ? 'Capture en cours…' : "Partager l'image"}
            </Button>
            <TouchableOpacity onPress={onClose} style={styles.cancel}>
              <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'stretch',
  },
  previewWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: Spacing.xxl,
  },
  hiddenCapture: {
    position: 'absolute',
    top: -99999,
    left: -99999,
    opacity: 0,
    width: 1080,
    height: 1920,
  },
  hiddenCard: {
    width: 1080,
    height: 1920,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    width: '100%',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
});
