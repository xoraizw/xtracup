import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/expo';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../lib/supabase';
import type { AppUser, Cafe, PassTier } from '../types/database';

export type PendingPurchase = { cafe: Cafe; tier: PassTier };

interface AuthContextValue {
  isSignedIn: boolean;
  profile: AppUser | null;
  loading: boolean;
  supabase: SupabaseClient;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  // Set when a signed-out visitor picks a pass tier and gets routed to
  // AuthScreen — read once by CustomerTabs after sign-in so it can drop the
  // person straight back onto the payment step for the tier they picked,
  // instead of making them re-browse. Lives here (not a one-off context)
  // because AuthProvider already spans the guest -> signed-in transition
  // without remounting.
  pendingPurchase: PendingPurchase | null;
  setPendingPurchase: (value: PendingPurchase | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut: clerkSignOut, userId } = useClerkAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);

  // Bound once per userId — Clerk's getToken() internally refreshes the JWT
  // per request, so this client always sends a fresh Clerk-signed token that
  // Supabase verifies via the third-party auth provider config (see README).
  const supabase = useMemo(
    () => createSupabaseClient(() => getToken()),
    [userId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    setProfile((data as AppUser) ?? null);
    setProfileLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (!isLoaded) return;
    setProfileLoading(true);
    loadProfile();
  }, [isLoaded, loadProfile]);

  const signOut = async () => {
    await clerkSignOut();
  };

  const value = useMemo(
    () => ({
      isSignedIn: Boolean(isSignedIn),
      profile,
      loading: !isLoaded || profileLoading,
      supabase,
      refreshProfile: loadProfile,
      signOut,
      pendingPurchase,
      setPendingPurchase,
    }),
    [isSignedIn, profile, isLoaded, profileLoading, supabase, loadProfile, pendingPurchase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
