import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ProfileState, UserRole } from '@/types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const USER_ID_KEY = '@helo_user_id';
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
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = generateUUID();
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }

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
          .eq('user_id', userId)
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
              .eq('user_id', resolvedLinkedUserId)
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

export async function getOrCreateUserId(): Promise<string> {
  let userId = await AsyncStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUUID();
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export async function setUserRole(role: UserRole, linkedUserId?: string) {
  await AsyncStorage.setItem(USER_ROLE_KEY, role);
  if (linkedUserId) {
    await AsyncStorage.setItem(LINKED_USER_ID_KEY, linkedUserId);
  } else {
    await AsyncStorage.removeItem(LINKED_USER_ID_KEY);
  }
}

export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_ID_KEY);
}

export async function getLinkedUserId(): Promise<string | null> {
  return AsyncStorage.getItem(LINKED_USER_ID_KEY);
}
