// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const initializeAuth = useCallback(async () => {
    try {
      const currentUser = await databaseAuth.getCurrentUser();
      setUser(currentUser);
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

    // redireciona conforme o perfil
    switch (loggedUser.profile) {
      case 'admin':
        navigate('/components/admin/AdminDashboard');
        break;
      case 'checkup':
        navigate('/components/checkup/CheckupDashboard');
        break;
      case 'parceiro':
        navigate('/components/partner/PartnerDashboard');
        break;
      case 'recepcao':
        navigate('/components/reception/ReceptionDashboard');
        break;
      default:
        navigate('/');
    }

    return { error: null };
  };

  const signOut = async () => {
    await databaseAuth.signOut();
    setUser(null);
    navigate('/');
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

