import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../lib/supabase';
import { databaseAuth, AuthUser } from '../lib/database-auth';
import { databaseService } from '../lib/database';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  createUser: (email: string, name: string, profile: UserProfile) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicialização única
  const initializeAuth = useCallback(async () => {
    console.log('🔄 Inicializando AuthContext com banco de dados...');
    
    try {
      // Garantir que as tabelas existam
      await databaseService.ensureTablesExist();
      
      // Verificar usuário atual
      const currentUser = databaseAuth.getCurrentUser();
      
      if (currentUser) {
        console.log('✅ Usuário encontrado no localStorage:', currentUser.email);
        setUser(currentUser);
      } else {
        console.log('ℹ️ Nenhum usuário logado');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    
    try {
      console.log('🔐 Iniciando processo de login via banco...');
      
      const { user: loggedUser, error } = await databaseAuth.signIn(email, password);
      
      if (error) {
        console.error('❌ Erro no login:', error);
        return { error };
      }
      
      if (loggedUser) {
        console.log('✅ Login realizado com sucesso:', loggedUser.email);
        setUser(loggedUser);
        return { error: null };
      }
      
      return { error: 'Erro desconhecido no login' };
    } catch (error) {
      console.error('❌ Erro interno no login:', error);
      return { error: 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🚪 Fazendo logout...');
      databaseAuth.signOut();
      setUser(null);
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      console.log('🔄 Resetando senha para:', email);
      const { error } = await databaseAuth.resetPassword(email);
      
      if (error) {
        console.error('❌ Erro no reset:', error);
        return { error };
      }
      
      console.log('✅ Senha resetada com sucesso');
      return { error: null };
    } catch (error) {
      console.error('❌ Erro interno no reset de senha:', error);
      return { error: 'Erro interno do sistema' };
    }
  }, []);

  const createUser = useCallback(async (email: string, name: string, profile: UserProfile) => {
    try {
      console.log('👥 Criando usuário via banco:', { email, name, profile });
      const { error } = await databaseAuth.createUser(email, name, profile);
      
      if (error) {
        console.error('❌ Erro na criação:', error);
        return { error };
      }
      
      console.log('✅ Usuário criado com sucesso');
      return { error: null };
    } catch (error) {
      console.error('❌ Erro interno na criação:', error);
      return { error: 'Erro interno do sistema' };
    }
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signOut,
    resetPassword,
    createUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}