/**
 * useProfile — Profil utilisateur avec synchronisation Supabase.
 *
 * Source de vérité du userId : session Supabase Anonymous Auth (persistée
 * via AsyncStorage par le client Supabase). Le rôle utilisateur et le lien
 * partenaire sont gérés en local via AsyncStorage.
 *
 * Gère deux rôles : 'pregnant' (enceinte) et 'partner' (co-parent).
 * Pour le rôle 'partner', résout automatiquement le profil de la mère liée
 * via la table `partner_links` afin d'afficher son trimestre correct.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase, isSupabaseConfigured, ensureAnonymousSession } from '@/lib/supabase';
import type { ProfileState, UserRole } from '@/types';

const USER_ROLE_KEY = '@helo_user_role';
const LINKED_USER_ID_KEY = '@helo_linked_user_id';

export function useProfile() {
  const [state, setState] = useState<ProfileState>({
    userId: '',
    role: 'pregnant',
    firstName: '',
    trimester: null,
    dueDate: null,
    partnerCode: null,
    linkedUserId: null,
    linkedFirstName: null,
    babyMode: false,
    breastfeedingMode: false,
    isLoading: true,
  });
  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const userId = await ensureAnonymousSession();

      const roleRaw = await AsyncStorage.getItem(USER_ROLE_KEY);
      const role: UserRole = roleRaw === 'partner' ? 'partner' : 'pregnant';
      let linkedUserId: string | null = await AsyncStorage.getItem(LINKED_USER_ID_KEY);

      const profileRaw = await AsyncStorage.getItem('user_profile');
      const localProfile = profileRaw ? JSON.parse(profileRaw) : null;

      let partnerCode: string | null = localProfile?.partnerCode ?? null;
      let trimester: number | null = localProfile?.trimester ?? null;
      let dueDate: string | null = localProfile?.dueDate ?? null;
      let firstName: string = localProfile?.firstName ?? '';
      const cachedLinkedFirstName = await AsyncStorage.getItem('@helo_linked_first_name');
      let linkedFirstName: string | null = cachedLinkedFirstName;

      if (isSupabaseConfigured) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileRow) {
          partnerCode = profileRow.partner_code ?? null;
          trimester = profileRow.trimester ?? trimester;
          dueDate = profileRow.due_date ?? dueDate;
          firstName = profileRow.first_name || firstName;
        }

        if (role === 'partner') {
          let resolvedLinkedUserId = linkedUserId;

          if (!resolvedLinkedUserId) {
            const { data: linkRow } = await supabase
              .from('partner_links')
              .select('pregnant_user_id')
              .eq('partner_user_id', userId)
              .maybeSingle();

            if (linkRow?.pregnant_user_id) {
              resolvedLinkedUserId = linkRow.pregnant_user_id as string;
              await AsyncStorage.setItem(LINKED_USER_ID_KEY, resolvedLinkedUserId);
              linkedUserId = resolvedLinkedUserId;
            }
          }

          if (resolvedLinkedUserId) {
            const { data: motherProfile } = await supabase
              .from('profiles')
              .select('first_name, trimester, due_date')
              .eq('id', resolvedLinkedUserId)
              .maybeSingle();

            if (motherProfile) {
              linkedFirstName = motherProfile.first_name ?? null;
              trimester = motherProfile.trimester ?? trimester;
              dueDate = motherProfile.due_date ?? dueDate;
              if (linkedFirstName) {
                await AsyncStorage.setItem('@helo_linked_first_name', linkedFirstName);
              }
            }
          }
        } else if (role === 'pregnant') {
          const { data: linkRow } = await supabase
            .from('partner_links')
            .select('partner_user_id')
            .eq('pregnant_user_id', userId)
            .maybeSingle();

          if (linkRow?.partner_user_id) {
            linkedUserId = linkRow.partner_user_id as string;
            await AsyncStorage.setItem(LINKED_USER_ID_KEY, linkedUserId);
          } else if (linkedUserId) {
            await AsyncStorage.removeItem(LINKED_USER_ID_KEY);
            linkedUserId = null;
          }
        }
      }

      setState({
        userId,
        role,
        firstName,
        trimester,
        dueDate,
        partnerCode,
        linkedUserId,
        linkedFirstName,
        babyMode: false,
        breastfeedingMode: false,
        isLoading: false,
      });
    } catch (err) {
      if (__DEV__) console.warn('[useProfile] Error:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      refresh();
    }
  }, [refresh]);

  return { ...state, refresh };
}

/**
 * Garantit l'existence d'une session Supabase anonyme et retourne l'user.id.
 * Réexport de `ensureAnonymousSession` pour compatibilité ascendante avec
 * les écrans d'onboarding.
 */
export async function getOrCreateUserId(): Promise<string> {
  return ensureAnonymousSession();
}

export async function setUserRole(role: UserRole, linkedUserId?: string) {
  await AsyncStorage.setItem(USER_ROLE_KEY, role);
  if (linkedUserId) {
    await AsyncStorage.setItem(LINKED_USER_ID_KEY, linkedUserId);
  } else {
    await AsyncStorage.removeItem(LINKED_USER_ID_KEY);
  }
}

/** Retourne l'user.id de la session Supabase active, ou null si non authentifié. */
export async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function getLinkedUserId(): Promise<string | null> {
  return AsyncStorage.getItem(LINKED_USER_ID_KEY);
}
