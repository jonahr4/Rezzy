'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  idToken: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        // Set session cookie so the proxy (middleware) can detect auth
        document.cookie = `__session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } else {
        setIdToken(null);
        // Clear session cookie
        document.cookie = '__session=; path=/; max-age=0';
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, idToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
