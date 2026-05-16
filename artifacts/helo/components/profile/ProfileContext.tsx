import React, { createContext, useContext } from 'react';
import { useProfile as useProfileHook } from '@/hooks/useProfile';

type ProfileValue = ReturnType<typeof useProfileHook>;

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useProfileHook();
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile (profile context) must be used inside <ProfileProvider>');
  }
  return ctx;
}
