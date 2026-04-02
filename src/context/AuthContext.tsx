import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { User, Session } from '@supabase/supabase-js';

export type Language = 'NL' | 'FR';

interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'seller';
  first_name?: string;
  last_name?: string;
  last_login?: string;
  avatar_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  lang: Language;
  setLang: (l: Language) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<Language>('NL');

  const fetchProfile = async (userId: string, email?: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      if (data.is_archived) {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        return { error: new Error('Account gearchiveerd') };
      }
      setProfile(data as Profile);
      // Update last_login asynchronously via server (bypasses RLS)
      fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) }).catch(() => {});
      return { data };
    } else {
      // Auto-create profile for new users (pull name from auth metadata)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata || {};
      const newProfile: Profile = {
        id: userId,
        email: email || '',
        role: 'seller',
        first_name: meta.first_name || '',
        last_name: meta.last_name || ''
      };
      const { error: insertError } = await supabase.from('profiles').insert(newProfile);
      if (insertError) {
        console.error('Failed to create profile (possibly RLS issue):', insertError);
      } else {
        setProfile(newProfile);
        return { data: newProfile };
      }
    }
  };

  useEffect(() => {
    // Get initial session — this is the ONLY place that controls isLoading
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      try {
        const remembered = localStorage.getItem('telenco-remember');
        if (s?.user && !remembered) {
          supabase.auth.signOut();
          return;
        }
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id, s.user.email);
        }
      } catch (e) {
        console.error('Session init error:', e);
      } finally {
        setIsLoading(false);
      }
    });

    // Listen for auth changes — never touch isLoading here
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track active presence with a debounce
  useEffect(() => {
    if (!user) return;
    
    let lastUpdateTimer = Date.now();
    let isUpdating = false;

    const updatePresence = async () => {
      const now = Date.now();
      if (!isUpdating && now - lastUpdateTimer > 3 * 60 * 1000) { // Max once every 3 minutes
        isUpdating = true;
        try {
          await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {});
          lastUpdateTimer = Date.now();
        } catch (e) {
          console.error("Failed to update presence:", e);
        } finally {
          isUpdating = false;
        }
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, updatePresence, { passive: true }));
    
    // Initial ping on mount/auth if needed (fetchProfile already does one, so we just set timer here)

    return () => {
      events.forEach(e => window.removeEventListener(e, updatePresence));
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    
    // Check if the user is archived right after authenticating
    if (data?.user) {
      const { data: profile } = await supabase.from('profiles').select('is_archived').eq('id', data.user.id).single();
      if (profile?.is_archived) {
        await supabase.auth.signOut();
        return { error: { message: 'Je account is gearchiveerd en de toegang is ontzegd. Neem contact op met een beheerder.' } };
      }
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile,
      isAdmin: profile?.role?.toLowerCase().trim() === 'admin',
      isLoading, signIn, signOut,
      lang, setLang
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
