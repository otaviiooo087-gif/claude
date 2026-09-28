'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseConfigured, getFirebaseAuth, getFirebaseDb } from './firebase';
import { UserProfile, UserRole } from './authTypes';

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  configured: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Admin cria login para alguém da equipe (operador ou outro admin). */
  criarUsuario: (email: string, senha: string, nome: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(getFirebaseDb(), 'usuarios', firebaseUser.uid));
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, senha);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const criarUsuario = useCallback(async (email: string, senha: string, nome: string, role: UserRole) => {
    // Cria a conta usando um app secundário para não derrubar a sessão do admin logado.
    const { initializeApp, deleteApp } = await import('firebase/app');
    const { getAuth: getSecondaryAuth, createUserWithEmailAndPassword: createSecondary } =
      await import('firebase/auth');
    const primary = getFirebaseAuth().app;
    const secondaryApp = initializeApp(primary.options, `secondary-${Date.now()}`);
    try {
      const secondaryAuth = getSecondaryAuth(secondaryApp);
      const cred = await createSecondary(secondaryAuth, email, senha);
      await setDoc(doc(getFirebaseDb(), 'usuarios', cred.user.uid), {
        uid: cred.user.uid,
        email,
        nome,
        role,
        criadoEm: Date.now(),
      });
    } finally {
      await deleteApp(secondaryApp);
    }
  }, []);

  const value = useMemo(
    () => ({ loading, user, profile, configured: firebaseConfigured, login, logout, criarUsuario }),
    [loading, user, profile, login, logout, criarUsuario]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
