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
        setUser(currentUser);
      } else {
        console.log('👤 Nenhum usuário autenticado');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar autenticação:', error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('✅ Inicialização da autenticação concluída');
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    // Adicionar listener para mudanças de autenticação
    const setupAuthListener = async () => {
      // Se estiver usando Supabase diretamente, adicione um listener
      // Se não, verifique periodicamente a sessão
      const interval = setInterval(async () => {
        const currentUser = await databaseAuth.getCurrentUser();
        if (currentUser?.id !== user?.id) {
          setUser(currentUser);
        }
      }, 30000); // Verificar a cada 30 segundos

      return () => clearInterval(interval);
    };

    setupAuthListener();
  }, [initializeAuth, user?.id]);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Tentando fazer login para:', email);
    try {
      const { user: loggedUser, error } = await databaseAuth.signIn(email, password);
      if (error || !loggedUser) {
        console.error('❌ Erro no login:', error);
        return { error: error || 'Falha ao autenticar' };
      }

      console.log('✅ Login bem-sucedido:', loggedUser.email, 'perfil:', loggedUser.profile);
      setUser(loggedUser);
      return { error: null };
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      return { error: 'Erro interno ao fazer login' };
    }
  };

  const signOut = async () => {
    console.log('🚪 Fazendo logout...');
    try {
      await databaseAuth.signOut();
      setUser(null);
      console.log('✅ Logout concluído');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  };

  const createUser = async (email: string, name: string, profile: UserProfile) => {
    try {
      return await databaseAuth.createUser(email, name, profile);
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return { error: 'Erro interno ao criar usuário' };
    }
  };

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

