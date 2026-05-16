import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile } from './ProfileContext';
import { usePremium } from '@/hooks/usePremium';
import { createCircle, getCircle, joinCircle, type CircleData } from '@/lib/circleUtils';
import { ROUTES } from '@/types/routes';

import { SettingRow } from './SettingRow';
import styles from './profileStyles';

// V1: Cercle is hidden behind a feature flag. Re-enable for V2.
const CIRCLE_V1_ENABLED = false;

export function CircleSection() {
  const router = useRouter();
  const { userId, role, firstName } = useProfile();
  const isPartner = role === 'partner';
  const { isPremium, requirePremium } = usePremium();

  const [circleData, setCircleData] = useState<CircleData | null | undefined>(undefined);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  void isCreatingCircle;

  useEffect(() => {
    if (!userId || isPartner) return;
    getCircle().then(setCircleData).catch(() => setCircleData(null));
  }, [userId, isPartner]);

  return (
    <>
      {/* Mon Cercle — V1: masqué, réactiver pour V2 */}
      {CIRCLE_V1_ENABLED && !isPartner && circleData && (
        <Animated.View entering={FadeInDown.delay(190).duration(500)}>
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
            MON CERCLE
          </ThemedText>
          <Card padding={0} style={styles.settingGroup}>
            {circleData ? (
              <SettingRow
                icon="users"
                title="Mon Cercle"
                subtitle={`${circleData?.members.length ?? 0} membre${(circleData?.members.length ?? 0) > 1 ? 's' : ''} · Voir le fil d'activité`}
                onPress={() => router.push(ROUTES.circle)}
              />
            ) : (
              <>
                <SettingRow
                  icon="users"
                  title="Créer mon cercle"
                  subtitle={isPremium ? "Invitez jusqu'à 8 proches" : 'Fonctionnalité Premium ✦'}
                  onPress={async () => {
                    if (!isPremium) { requirePremium('circle'); return; }
                    setIsCreatingCircle(true);
                    try {
                      await createCircle(firstName || 'Anonyme');
                      const data = await getCircle();
                      setCircleData(data);
                      router.push(ROUTES.circle);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : 'Erreur';
                      if (msg !== 'PREMIUM_REQUIRED') Alert.alert('Erreur', msg);
                    } finally {
                      setIsCreatingCircle(false);
                    }
                  }}
                />
                <Divider />
                <SettingRow
                  icon="link"
                  title="Rejoindre un cercle"
                  subtitle="Entrez un code d'invitation"
                  onPress={() => setShowJoinModal(true)}
                />
              </>
            )}
          </Card>
        </Animated.View>
      )}

      {/* Join circle modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowJoinModal(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ThemedText variant="headlineMedium" style={styles.modalTitle}>
              Rejoindre un cercle
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.xl }}>
              Entrez le code à 8 caractères partagé par la créatrice du cercle.
            </ThemedText>
            <TextInput
              style={styles.circleCodeInput}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="EX: AB3C7DEF"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
              autoFocus
              accessibilityLabel="Code d'invitation"
            />
            <Pressable
              onPress={async () => {
                if (!joinCode.trim() || isJoining) return;
                setIsJoining(true);
                try {
                  await joinCircle(firstName || 'Anonyme', joinCode.trim());
                  const data = await getCircle();
                  setCircleData(data);
                  setShowJoinModal(false);
                  setJoinCode('');
                  router.push(ROUTES.circle);
                } catch (err) {
                  Alert.alert('Erreur', err instanceof Error ? err.message : 'Code invalide');
                } finally {
                  setIsJoining(false);
                }
              }}
              disabled={isJoining || !joinCode.trim()}
              style={({ pressed }) => [styles.joinBtn, { opacity: pressed || isJoining ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Rejoindre le cercle"
            >
              <ThemedText variant="labelLarge" style={{ color: '#fff' }}>
                {isJoining ? 'Rejoindre…' : 'Rejoindre'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setShowJoinModal(false)} style={styles.cancelModalBtn}>
              <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
