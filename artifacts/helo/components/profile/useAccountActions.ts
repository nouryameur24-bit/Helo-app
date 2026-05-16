import { useRouter } from 'expo-router';
import { Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function useAccountActions(userId: string | null) {
  const router = useRouter();

  const handleExportData = async () => {
    try {
      const profileRaw = await AsyncStorage.getItem('user_profile');
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
                      await AsyncStorage.clear();
                      if (isSupabaseConfigured && userId) {
                        await supabase.from('scan_history').delete().eq('user_id', userId);
                        await supabase.from('community_submissions').delete().eq('user_id', userId);
                        await supabase.from('partner_links').delete().eq('pregnant_user_id', userId);
                        await supabase.from('partner_links').delete().eq('partner_user_id', userId);
                        await supabase.from('profiles').delete().eq('id', userId);
                      }
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
