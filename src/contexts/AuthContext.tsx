import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { authService } from '../lib/auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

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
  const [initialized, setInitialized] = useState(false);

  // Função para buscar dados do usuário da tabela users
  const fetchUserData = useCallback(async (authUser: any): Promise<AuthUser | null> => {
    if (!authUser || !supabase) return null;

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.warn('⚠️ Erro ao buscar dados do usuário na tabela:', error);
        // Retornar dados básicos se não conseguir buscar da tabela
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || 'Usuário',
          profile: authUser.user_metadata?.profile || 'admin',
        };
      }

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        profile: userData.profile,
      };
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados do usuário:', error);
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || 'Usuário',
        profile: authUser.user_metadata?.profile || 'admin',
      };
    }
  }, []);

  // Função para verificar usuário atual
  const checkUser = useCallback(async () => {
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado');
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      console.log('🔍 Verificando usuário atual...');
      
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.warn('⚠️ Erro ao verificar usuário:', error);
        setUser(null);
        return;
      }

      if (authUser) {
        console.log('✅ Usuário autenticado encontrado:', authUser.id);
        const userData = await fetchUserData(authUser);
        setUser(userData);
      } else {
        console.log('ℹ️ Nenhum usuário autenticado');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erro na verificação do usuário:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [fetchUserData]);

  useEffect(() => {
    if (initialized) return;

    checkUser();

    if (!supabase) return;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = await fetchUserData(session.user);
          setUser(userData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Manter usuário logado quando token é renovado
          const userData = await fetchUserData(session.user);
          setUser(userData);
        }
      } catch (error) {
        console.error('❌ Erro no auth state change:', error);
        if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkUser, fetchUserData, initialized]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    setLoading(true);
    
    try {
      console.log('🔐 Tentando login via Supabase...');
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validar entrada
      if (!normalizedEmail || !password) {
        return { error: 'Email e senha são obrigatórios' };
      }
      
      if (!normalizedEmail.includes('@')) {
        return { error: 'Email deve ter formato válido' };
      }
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      console.log('🔍 Resposta do login:', { 
        hasUser: !!authData?.user, 
        hasSession: !!authData?.session,
        errorCode: authError?.status,
        errorMessage: authError?.message 
      });

      if (authError) {
        console.error('❌ Erro no login:', authError);
        
        if (authError.message?.includes('Invalid login credentials')) {
          return { error: 'Email ou senha incorretos' };
        } else if (authError.message?.includes('Email not confirmed')) {
          return { error: 'Email não confirmado. Verifique sua caixa de entrada.' };
        } else if (authError.message?.includes('Too many requests')) {
          return { error: 'Muitas tentativas. Aguarde alguns minutos.' };
        } else {
          return { error: authError.message || 'Erro no login' };
        }
      }

      if (authData?.user) {
        console.log('✅ Login realizado com sucesso');
        // O usuário será definido pelo onAuthStateChange
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
    if (!supabase) return;
    
    setLoading(true);
    try {
      console.log('🚪 Fazendo logout...');
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      console.log('🔄 Enviando email de reset para:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

      if (error) {
        console.error('❌ Erro ao enviar email de reset:', error);
        return { error: error.message };
      }

      console.log('✅ Email de reset enviado com sucesso');
      return { error: null };
    } catch (error) {
      console.error('❌ Erro interno no reset de senha:', error);
      return { error: 'Erro interno do sistema' };
    }
  }, []);

  const createUser = useCallback(async (email: string, name: string, profile: UserProfile) => {
    return await authService.createUser(email, name, profile);
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