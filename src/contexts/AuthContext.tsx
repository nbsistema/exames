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

  const initializeAuth = useCallback(async () => {
    console.log('🔄 Inicializando AuthContext...');
    try {
      const currentUser = databaseAuth.getCurrentUser();
      if (currentUser) {
        console.log('✅ Usuário logado:', currentUser.email);
        setUser(currentUser);
      } else {
        console.log('ℹ️ Nenhum usuário logado');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const signIn = async (email: string, password: string) => {
    const { user: loggedUser, error } = await databaseAuth.signIn(email, password);
    if (error || !loggedUser) return { error: error || 'Falha ao autenticar' };

    setUser(loggedUser);

    // Redireciona conforme o perfil do usuário
    switch (loggedUser.profile?.role) {
      case 'admin':
        navigate('/components/admin/AdminDashboard');
        break;
      case 'checkup':
        navigate('/components/checkup/CheckupDashboard');
        break;
      case 'partner':
        navigate('/components/partner/PartnerDashboard');
        break;
      case 'reception':
        navigate('/components/reception/ReceptionDashboard');
        break;
      default:
        navigate('/');
        break;
    }

    return { error: null };
  };

  const signOut = async () => {
    await databaseAuth.signOut();
    setUser(null);
    navigate('/');
  };

  const createUser = async (email: string, name: string, profile: UserProfile) => {
    return databaseAuth.createUser(email, name, profile);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, createUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
