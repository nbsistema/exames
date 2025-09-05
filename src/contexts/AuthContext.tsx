import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticação...');
        
        // Verificar se o Supabase está configurado
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.error('❌ Variáveis de ambiente do Supabase não configuradas');
          setLoading(false);
          return;
        }
        
        // Aguardar um pouco para evitar conflitos após criação de usuário
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('🔄 Sessão ativa encontrada, tentando carregar dados do usuário...');
          
          // Aguardar mais um pouco antes de tentar carregar dados
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Tentar carregar dados do usuário com retry
          let retries = 3;
          let currentUser = null;
          
          while (retries > 0 && !currentUser) {
            try {
              currentUser = await authService.getCurrentUser();
              if (currentUser) {
                console.log('✅ Usuário encontrado:', currentUser);
                setUser(currentUser);
                break;
              }
            } catch (error: any) {
              console.warn(`⚠️ Tentativa ${4 - retries}/3 falhou:`, error.message);
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          if (!currentUser) {
            console.log('ℹ️ Não foi possível carregar perfil após 3 tentativas (normal na primeira execução)');
            setUser(null);
          }
        } else {
          console.log('ℹ️ Nenhuma sessão ativa');
          setUser(null);
        }
      } catch (error) {
        console.warn('⚠️ Erro na inicialização da autenticação:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Context: Iniciando login...');
    const { user: authUser, error } = await authService.signIn(email, password);
    if (authUser) {
      console.log('✅ Context: Login bem-sucedido, atualizando estado');
      setUser(authUser);
    } else {
      console.log('❌ Context: Falha no login');
    }
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 Context: Fazendo logout...');
    await authService.signOut();
    setUser(null);
    console.log('✅ Context: Logout concluído');
  };

  const resetPassword = async (email: string) => {
    console.log('🔄 Context: Iniciando reset de senha...');
    return await authService.resetPassword(email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, resetPassword }}>
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