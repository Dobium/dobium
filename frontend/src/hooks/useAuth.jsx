import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Best-effort: call the backend to send the welcome email (fires once per user).
async function triggerWelcomeEmail(user) {
  try {
    const name =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      null;
    const rawApiUrl = import.meta.env.VITE_API_URL || '';
    const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
    await fetch(`${API_URL}/api/auth/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, email: user.email, username: name }),
    });
  } catch {
    // Non-critical — never block the user experience
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);

  useEffect(() => {
    // Fetch session — always resolve loading even if Supabase is misconfigured
    supabase.auth.getSession()
      .then(({ data }) => setSession(data?.session ?? null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        // Only trigger welcome email if the account was created in the last 2 minutes.
        // This ensures it only sends on initial signup (like Google OAuth) and not on every login.
        const isNewUser = new Date(session.user.created_at).getTime() > Date.now() - 120000;
        if (isNewUser) {
          triggerWelcomeEmail(session.user);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizeEmail = (email) => (email || '').trim().toLowerCase();

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return undefined;
    return window.location.origin;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw new Error(error.message);
    setSession(data?.session ?? null);
    return data;
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: {
          prompt: 'select_account', // always show the account chooser
        },
      },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const signup = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
        data: {
          name: fullName,
          full_name: fullName,
        }
      },
    });
    if (error) throw new Error(error.message);
    // If Supabase email confirmation is ON, data.session will be null and the
    // user must click the confirmation link before they can sign in.
    setSession(data?.session ?? null);
    setIsNewSignup(true);

    // Send a welcome message immediately upon successful signup
    if (data?.user) {
      triggerWelcomeEmail(data.user);
    }

    // Send the confirmation email via our own Gmail (donotreply.dobium@gmail.com)
    // rather than relying on Supabase's email service.
    try {
      const rawApiUrl = import.meta.env.VITE_API_URL || '';
      const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
      await fetch(`${API_URL}/api/auth/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email), name: fullName, confirmUrl: getRedirectUrl() }),
      });
    } catch {
      // Non-critical — signup succeeded even if confirmation email fails
    }

    return data;
  };

  const clearNewSignup = useCallback(() => setIsNewSignup(false), []);

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: getRedirectUrl(),
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, isNewSignup, clearNewSignup, login, loginWithGoogle, signup, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
