// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { databaseAuth, AuthUser, UserProfile } from '../lib/database-auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createUser: (email: string, name: string, profile: UserProfile) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeAuth = useCallback(async () => {
    console.log('🔄 Inicializando autenticação...');
    try {
      const currentUser = await databaseAuth.getCurrentUser();
      if (currentUser) {
        console.log('👤 Usuário atual:', `${currentUser.email} (${currentUser.profile})`);
        console.log('📊 Redirecionando para dashboard do perfil:', currentUser.profile);
      } else {
        console.log('👤 Nenhum usuário autenticado');
      }
      setUser(currentUser);
    } finally {
      setLoading(false);
      console.log('✅ Inicialização da autenticação concluída');
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Tentando fazer login para:', email);
    const { user: loggedUser, error } = await databaseAuth.signIn(email, password);
    if (error || !loggedUser) return { error: error || 'Falha ao autenticar' };

    console.log('✅ Login bem-sucedido:', loggedUser.email, 'perfil:', loggedUser.profile);
    setUser(loggedUser);
    return { error: null };
  };

  const signOut = async () => {
    console.log('🚪 Fazendo logout...');
    await databaseAuth.signOut();
    setUser(null);
    console.log('✅ Logout concluído');
  };

  const createUser = (email: string, name: string, profile: UserProfile) =>
    databaseAuth.createUser(email, name, profile);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, createUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

