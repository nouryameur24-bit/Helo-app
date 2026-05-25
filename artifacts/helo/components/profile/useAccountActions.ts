import { useRouter } from 'expo-router';
import { Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export function useAccountActions(userId: string | null) {
  const router = useRouter();

  const handleExportData = async () => {
    try {
      const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
      const localProfile = profileRaw ? JSON.parse(profileRaw) : {};

      let supabaseData: Record<string, unknown> = {};
      if (isSupabaseConfigured && userId) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        const { data: scans } = await supabase.from('scan_history').select('*').eq('user_id', userId);
        const { data: submissions } = await supabase.from('community_submissions').select('*').eq('user_id', userId);
        supabaseData = {
          profile: profile ?? {},
          scan_history: scans ?? [],
          community_submissions: submissions ?? [],
        };
      }

      await Share.share({
        message: JSON.stringify({ exported_at: new Date().toISOString(), local_profile: localProfile, supabase: supabaseData }, null, 2),
        title: 'Mes données Hēlo',
      });
    } catch {
      Alert.alert('Erreur', "Impossible d'exporter les données.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Attention : cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Êtes-vous sûr ?',
              'Cette action supprimera définitivement toutes vos données.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Audit fix : supprime DB d'abord (avant AsyncStorage.clear
                      // pour éviter d'avoir un user disconnect avec rows orphelins
                      // si AsyncStorage clear OK mais Supabase delete fail).
                      // Ordre : tables dependent → profile → signOut → clear local.
                      if (isSupabaseConfigured && userId) {
                        // Lot Hēlo Points : clean les transactions/redemptions/points aussi
                        await supabase.from('point_redemptions').delete().eq('user_id', userId);
                        await supabase.from('point_transactions').delete().eq('user_id', userId);
                        await supabase.from('user_points').delete().eq('user_id', userId);
                        await supabase.from('scan_history').delete().eq('user_id', userId);
                        await supabase.from('community_submissions').delete().eq('user_id', userId);
                        await supabase.from('partner_links').delete().eq('pregnant_user_id', userId);
                        await supabase.from('partner_links').delete().eq('partner_user_id', userId);
                        await supabase.from('profiles').delete().eq('id', userId);
                        await supabase.auth.signOut().catch(() => {});
                      }
                      await AsyncStorage.clear();
                      router.replace('/onboarding');
                    } catch {
                      Alert.alert('Erreur', 'Impossible de supprimer le compte. Réessayez.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous réinitialiser votre session ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              // Audit fix : signOut Supabase AVANT clear AsyncStorage
              // Sinon le JWT persiste dans 'supabase.auth.token' et la session
              // peut leaker au prochain ensureAnonymousSession (cross-user risk).
              if (isSupabaseConfigured) {
                await supabase.auth.signOut().catch(() => {
                  // signOut peut fail si pas de session active — non-fatal
                });
              }
              await AsyncStorage.clear();
              router.replace('/onboarding');
            } catch {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            }
          },
        },
      ],
    );
  };

  return { handleExportData, handleDeleteAccount, handleLogout };
}
