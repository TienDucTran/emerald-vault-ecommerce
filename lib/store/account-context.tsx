'use client';

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

export interface AccountProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface AccountContextValue {
  profile: AccountProfile | null;
  setProfile: (profile: AccountProfile) => void;
  updateAvatar: (url: string) => void;
  updateName: (name: string) => void;
  updatePhone: (phone: string) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({
  children,
  initialProfile,
}: {
  children: ReactNode;
  initialProfile: AccountProfile | null;
}) {
  const [profile, setProfileState] = useState<AccountProfile | null>(initialProfile);

  const setProfile = useCallback((p: AccountProfile) => {
    setProfileState(p);
  }, []);

  const updateAvatar = useCallback((url: string) => {
    setProfileState((prev) => prev ? { ...prev, avatar_url: url } : prev);
  }, []);

  const updateName = useCallback((name: string) => {
    setProfileState((prev) => prev ? { ...prev, full_name: name } : prev);
  }, []);

  const updatePhone = useCallback((phone: string) => {
    setProfileState((prev) => prev ? { ...prev, phone } : prev);
  }, []);

  return (
    <AccountContext.Provider value={{ profile, setProfile, updateAvatar, updateName, updatePhone }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return ctx;
}