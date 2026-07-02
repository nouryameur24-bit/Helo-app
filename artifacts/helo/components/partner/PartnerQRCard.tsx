import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const QR_SIZE = 220;
const QR_PADDING = 12;

// Deep link scheme matches `expo.scheme` in app.json. The HTTPS fallback in the
// share text targets a universal-link domain (handled in a follow-up — see the
// deep-link handler in app/_layout.tsx that already routes `helo://...`).
export const buildPartnerDeepLink = (code: string): string =>
  `helo://pair?code=${encodeURIComponent(code)}`;

export const buildPartnerShareUrl = (code: string): string =>
  `https://gethelo.app/pair/${encodeURIComponent(code)}`;

interface PartnerQRCardProps {
  partnerCode: string;
  /**
   * Optional caption shown above the QR. Defaults to a generic "demande à ton
   * partenaire de scanner" line; callers can override for context-specific
   * copy (e.g. "Montre ce QR à ton partenaire").
   */
  caption?: string;
}

export function PartnerQRCard({ partnerCode, caption }: PartnerQRCardProps) {
  const [copied, setCopied] = useState(false);
  const deepLink = buildPartnerDeepLink(partnerCode);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(partnerCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unsupported (very rare on RN, possible on certain web targets) —
      // fall back to a Share so the user can still grab the code out of the app.
      try {
        await Share.share({ message: partnerCode });
      } catch {
        Alert.alert('Code partenaire', partnerCode);
      }
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Rejoins-moi sur Hēlo avec ce code : ${partnerCode} — ou scanne le QR : ${buildPartnerShareUrl(
          partnerCode,
        )}`,
      });
    } catch {
      // Share unsupported (web) — fall back to clipboard so the user can paste
      // the invite into WhatsApp / Messages manually.
      try {
        await Clipboard.setStringAsync(partnerCode);
        Alert.alert('Code copié', `Le code ${partnerCode} a été copié.`);
      } catch {
        Alert.alert('Code partenaire', partnerCode);
      }
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.qrWrap}>
        <QRCode
          value={deepLink}
          size={QR_SIZE}
          color={Colors.accentDark}
          backgroundColor="#FFFFFF"
          ecl="M"
        />
      </View>

      <ThemedText
        variant="bodySmall"
        color="textTertiary"
        style={styles.caption}
      >
        {caption ?? 'Demande à ton partenaire de scanner ce QR pour te connecter'}
      </ThemedText>

      <View style={styles.codeRow}>
        <ThemedText variant="labelSmall" color="textTertiary" style={styles.codeLabel}>
          CODE
        </ThemedText>
        <ThemedText variant="headlineLarge" color="accent" style={styles.codeValue}>
          {partnerCode}
        </ThemedText>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            { opacity: pressed ? 0.75 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Copier le code partenaire"
        >
          <Feather
            name={copied ? 'check' : 'copy'}
            size={16}
            color={Colors.accentDark}
          />
          <ThemedText variant="labelLarge" color="accentDark" style={styles.buttonLabel}>
            {copied ? 'Copié !' : 'Copier'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.button,
            styles.buttonPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Partager le code partenaire"
        >
          <Feather name="share-2" size={16} color="#FFFFFF" />
          <ThemedText variant="labelLarge" color="surface" style={styles.buttonLabel}>
            Partager
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.medium,
  },
  qrWrap: {
    // Always-white QR backdrop, even in dark mode — scanners reject inverted
    // QR codes (black-on-dark), so this padding island guarantees contrast.
    backgroundColor: '#FFFFFF',
    padding: QR_PADDING,
    borderRadius: Radius.lg,
  },
  caption: {
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    lineHeight: 18,
  },
  codeRow: {
    alignItems: 'center',
    gap: 2,
  },
  codeLabel: {
    letterSpacing: 1.5,
  },
  codeValue: {
    ...Typography.displayMedium,
    letterSpacing: 6,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  buttonSecondary: {
    backgroundColor: Colors.accentLight,
  },
  buttonPrimary: {
    backgroundColor: Colors.accent,
  },
  buttonLabel: {
    letterSpacing: 0.2,
  },
});
