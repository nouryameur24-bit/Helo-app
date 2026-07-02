import { swallow } from '@/lib/swallow';
/**
 * CameraModal — scanner de code-barres plein écran pour le comparateur.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function CameraModal({ visible, onClose, onScan }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScan = useRef<number>(0);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!data) return;
      const now = Date.now();
      if (now - lastScan.current < 1500) return;
      lastScan.current = now;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
      onScan(data);
    },
    [onScan],
  );

  useEffect(() => {
    // Only ask again if the OS will actually show a prompt. After a hard
    // denial (canAskAgain=false) `requestPermission()` is a no-op and the
    // user must be sent to Settings — see the noPermission branch below.
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch((err) => swallow(err, 'CameraModal.requestPermission'));
    }
  }, [visible, permission, requestPermission]);

  const permanentlyDenied = permission && !permission.granted && !permission.canAskAgain;
  const handlePermissionCta = useCallback(() => {
    if (permanentlyDenied) {
      Linking.openSettings().catch((err) => swallow(err, 'CameraModal.openSettings'));
    } else {
      requestPermission().catch((err) => swallow(err, 'CameraModal.requestPermission'));
    }
  }, [permanentlyDenied, requestPermission]);

  if (!visible) return null;

  const vfSize = Math.min(W * 0.7, 280);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={cam.root}>
        <View style={cam.header}>
          <TouchableOpacity style={cam.closeBtn} onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <ThemedText variant="headlineMedium" style={cam.headerTitle}>
            Scanner un produit
          </ThemedText>
        </View>

        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={cam.noPermission}>
            <Feather name="camera-off" size={40} color={Colors.textTertiary} />
            <ThemedText variant="bodyMedium" color="textTertiary" style={{ marginTop: Spacing.md, paddingHorizontal: Spacing.xl, textAlign: 'center' }}>
              {permanentlyDenied
                ? "L'accès caméra est désactivé. Active-le dans les réglages."
                : 'Autorisation caméra requise'}
            </ThemedText>
            <TouchableOpacity onPress={handlePermissionCta} style={{ marginTop: Spacing.lg }}>
              <ThemedText variant="labelLarge" style={{ color: Colors.accent }}>
                {permanentlyDenied ? 'Ouvrir les réglages' : 'Autoriser'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {permission?.granted && (
          <View style={cam.overlay} pointerEvents="none">
            <View style={[cam.vf, { width: vfSize, height: vfSize }]}>
              <View style={[cam.corner, cam.tl]} />
              <View style={[cam.corner, cam.tr]} />
              <View style={[cam.corner, cam.bl]} />
              <View style={[cam.corner, cam.br]} />
            </View>
            <View style={cam.hint}>
              <ThemedText variant="bodySmall" style={cam.hintText}>
                Place le code-barres dans le cadre
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const cam = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
  },
  noPermission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vf: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  hint: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
