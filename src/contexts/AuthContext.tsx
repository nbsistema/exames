import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../lib/supabase';
import { databaseAuth, AuthUser } from '../lib/database-auth';

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
  const navigate = useNavigate();

  // Função para redirecionar com base no perfil
  const redirectBasedOnProfile = (profile: UserProfile) => {
    console.log('🚪 Redirecionando com base no perfil:', profile);
    switch (profile) {
      case 'admin':
        navigate('/dashboard/admin');
        break;
      case 'parceiro':
        navigate('/dashboard/parceiro');
        break;
      case 'checkup':
        navigate('/dashboard/checkup');
        break;
      case 'recepcao':
        navigate('/dashboard/recepcao');
        break;
      default:
        navigate('/dashboard/default');
        console.warn('⚠️ Perfil desconhecido:', profile);
    }
  };

  // Inicialização única
  const initializeAuth = useCallback(async () => {
    console.log('🔄 Inicializando AuthContext com banco de dados...');
    try {
      const currentUser = databaseAuth.getCurrentUser();
      if (currentUser) {
        console.log('✅ Usuário encontrado no localStorage:', currentUser.email);
        setUser(currentUser);
        redirectBasedOnProfile(currentUser.profile);
      } else {
        console.log('ℹ️ Nenhum usuário logado');
        setUser(null);
        navigate('/login');
      }
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      setUser(null);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      console.log('🔐 Iniciando processo de login via banco...');
      if (!email.trim() || !password.trim()) {
        return { error: 'Email e senha são obrigatórios' };
      }
      if (!email.includes('@')) {
        return { error: 'Email deve ter formato válido' };
      }
      setLoading(true);
      try {
        const { user: loggedUser, error } = await databaseAuth.signIn(email, password);
        if (error) {
          console.error('❌ Erro no login:', error);
          return { error };
        }
        if (loggedUser) {
          console.log('✅ Login realizado com sucesso:', loggedUser.email);
          setUser(loggedUser);
          redirectBasedOnProfile(loggedUser.profile);
          return { error: null };
        }
        return { error: 'Erro desconhecido no login' };
      } catch (error) {
        console.error('❌ Erro interno no login:', error);
        return { error: 'Erro interno do sistema. Verifique sua conexão.' };
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🚪 Fazendo logout...');
      await databaseAuth.signOut();
      setUser(null);
      navigate('/login');
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

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
    createUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
