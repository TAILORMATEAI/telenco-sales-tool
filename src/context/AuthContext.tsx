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
      setProfile(data as Profile);
      // Update last_login asynchronously so it doesn't block the loading phase
      supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', userId);
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
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
