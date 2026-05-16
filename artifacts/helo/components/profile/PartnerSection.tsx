import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { setUserRole } from '@/hooks/useProfile';
import { useProfile } from './ProfileContext';
import { regeneratePartnerCode, unlinkPartner } from '@/lib/partnerUtils';

import { PartnerCodeChip, SettingRow } from './SettingRow';
import styles from './profileStyles';

export function PartnerSection() {
  const router = useRouter();
  const {
    userId,
    role,
    partnerCode,
    linkedUserId,
    linkedFirstName,
    refresh,
  } = useProfile();
  const isPartner = role === 'partner';

  const [localPartnerCode, setLocalPartnerCode] = useState<string | null>(partnerCode);
  useEffect(() => { setLocalPartnerCode(partnerCode); }, [partnerCode]);

  const displayCode = localPartnerCode ?? partnerCode;

  const handleShareCode = async () => {
    const code = localPartnerCode ?? partnerCode;
    if (!code) return;
    try {
      await Share.share({
        message: `Rejoins-moi sur Hēlo ! Entre mon code partenaire : ${code}`,
      });
    } catch {
      // Share not supported (web) — fallback to clipboard
      try {
        await Clipboard.setStringAsync(code);
        Alert.alert('Code copié', `Le code ${code} a été copié dans le presse-papiers.`);
      } catch {
        Alert.alert('Code partenaire', code);
      }
    }
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      'Régénérer le code',
      'Cela va créer un nouveau code et déconnecter votre partenaire actuel.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer',
          style: 'destructive',
          onPress: async () => {
            try {
              const newCode = await regeneratePartnerCode(userId);
              setLocalPartnerCode(newCode);
              const profileRaw = await AsyncStorage.getItem('user_profile');
              if (profileRaw) {
                const profile = JSON.parse(profileRaw);
                profile.partnerCode = newCode;
                await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
              }
              await refresh();
            } catch {
              Alert.alert('Erreur', 'Impossible de régénérer le code.');
            }
          },
        },
      ],
    );
  };

  const handleDisconnectPartner = () => {
    Alert.alert(
      'Déconnecter',
      isPartner
        ? `Voulez-vous vous déconnecter du compte de ${linkedFirstName ?? 'votre proche'} ?`
        : `Voulez-vous déconnecter ${linkedFirstName ?? 'votre partenaire'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkPartner({ userId, role });
              await setUserRole('pregnant');
              await AsyncStorage.removeItem('@helo_linked_user_id');
              await AsyncStorage.removeItem('@helo_linked_first_name');
              await refresh();
              if (isPartner) router.replace('/onboarding/role');
            } catch {
              Alert.alert('Erreur', 'Impossible de déconnecter.');
            }
          },
        },
      ],
    );
  };

  if (isPartner) {
    return (
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
          PARTENAIRE
        </ThemedText>
        <Card padding={0} style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.accentLight }]}>
              <Feather name="heart" size={18} color={Colors.accentDark} />
            </View>
            <View style={styles.settingContent}>
              <ThemedText variant="bodyLarge" color="textPrimary">
                {linkedFirstName ? `Partenaire de ${linkedFirstName}` : 'Mode Partenaire'}
              </ThemedText>
              <ThemedText variant="bodySmall" color="textTertiary">Vous voyez le placard partagé</ThemedText>
            </View>
          </View>
          <Divider />
          <SettingRow icon="user-x" title="Déconnecter" subtitle="Revenir à la sélection du rôle" danger onPress={handleDisconnectPartner} />
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
      <ThemedText variant="labelSmall" color="textTertiary" style={styles.sectionLabel}>
        PARTENAIRE
      </ThemedText>
      <Card padding={0} style={styles.settingGroup}>
        {displayCode ? (
          <>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.accentLight }]}>
                <Feather name="key" size={18} color={Colors.accentDark} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText variant="bodyLarge" color="textPrimary">Mon code</ThemedText>
                <ThemedText variant="bodySmall" color="textTertiary">Partagez ce code avec votre partenaire</ThemedText>
              </View>
              <PartnerCodeChip code={displayCode} />
            </View>
            <Divider />
            <SettingRow icon="share-2" title="Partager mon code" onPress={handleShareCode} />
            <Divider />
            <SettingRow icon="refresh-cw" title="Régénérer le code" subtitle="Déconnecte le partenaire actuel" onPress={handleRegenerateCode} />
            {linkedUserId && (
              <>
                <Divider />
                <SettingRow icon="user-x" title={`Déconnecter ${linkedFirstName ?? 'le partenaire'}`} danger onPress={handleDisconnectPartner} />
              </>
            )}
          </>
        ) : (
          <SettingRow icon="users" title="Inviter un partenaire" subtitle="Générez un code après avoir créé votre profil" />
        )}
      </Card>
    </Animated.View>
  );
}
