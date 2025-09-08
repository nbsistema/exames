import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { authService } from '../lib/auth';
import { databaseService } from '../lib/database';

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
  const [userDataCache, setUserDataCache] = useState<Map<string, AuthUser>>(new Map());

  // Função para buscar dados do usuário da tabela users
  const fetchUserData = useCallback(async (authUser: any): Promise<AuthUser | null> => {
    if (!authUser || !supabase) return null;

    // Verificar cache primeiro
    const cachedUser = userDataCache.get(authUser.id);
    if (cachedUser) {
      console.log('✅ Usando dados do usuário em cache:', cachedUser.email);
      return cachedUser;
    }

    try {
      console.log('🔍 Buscando dados do usuário:', authUser.id);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.warn('⚠️ Erro ao buscar dados do usuário na tabela:', error.message);
        
        // Se o usuário não existe na tabela public.users, criar entrada
        if (error.code === 'PGRST116') {
          console.log('📝 Usuário não existe na tabela public.users, criando entrada...');
          
          const fallbackUser = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
            profile: (authUser.user_metadata?.profile || 'admin') as UserProfile,
          };
          
          // Tentar inserir na tabela
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: fallbackUser.id,
              email: fallbackUser.email,
              name: fallbackUser.name,
              profile: fallbackUser.profile,
            });
            
          if (insertError) {
            console.warn('⚠️ Erro ao criar entrada na tabela users:', insertError.message);
          } else {
            console.log('✅ Entrada criada na tabela users');
          }
          
          // Adicionar ao cache
          setUserDataCache(prev => new Map(prev).set(authUser.id, fallbackUser));
          return fallbackUser;
        }
        
        // Retornar dados básicos se não conseguir buscar da tabela
        const fallbackUser = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
          profile: (authUser.user_metadata?.profile || 'admin') as UserProfile,
        };
        
        // Adicionar ao cache
        setUserDataCache(prev => new Map(prev).set(authUser.id, fallbackUser));
        return fallbackUser;
      }

      console.log('✅ Dados do usuário carregados:', userData);
      const userResult = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        profile: userData.profile as UserProfile,
      };
      
      // Adicionar ao cache
      setUserDataCache(prev => new Map(prev).set(authUser.id, userResult));
      return userResult;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados do usuário:', error);
      const fallbackUser = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        profile: (authUser.user_metadata?.profile || 'admin') as UserProfile,
      };
      
      // Adicionar ao cache
      setUserDataCache(prev => new Map(prev).set(authUser.id, fallbackUser));
      return fallbackUser;
    }
  }, [userDataCache]);

  // Função para verificar usuário atual
  const checkUser = useCallback(async () => {
    if (loading === false && user !== null) {
      console.log('ℹ️ Usuário já carregado, pulando verificação');
      return;
    }
    
    console.log('🔍 Verificando usuário atual...', { loading, hasUser: !!user });
    
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.warn('⚠️ Erro ao verificar usuário:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (authUser) {
        console.log('✅ Usuário autenticado encontrado:', authUser.id);
        const userData = await fetchUserData(authUser);
        console.log('👤 Dados do usuário processados:', userData);
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
    }
  }, [fetchUserData, loading, user]);

  useEffect(() => {
    console.log('🔄 AuthContext useEffect executando...');
    
    // Evitar execução desnecessária
    if (user !== null && loading === false) {
      console.log('ℹ️ Usuário já definido, pulando useEffect');
      return;
    }

    // Garantir que as tabelas existam antes de verificar usuário
    const initializeAndCheckUser = async () => {
      try {
        // Verificar se as tabelas existem
        await databaseService.ensureTablesExist();
        
        // Aguardar um pouco para evitar loop
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar usuário
        await checkUser();
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(initializeAndCheckUser, 100);

    if (!supabase) return;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ Usuário logado, buscando dados...');
          const userData = await fetchUserData(session.user);
          console.log('👤 Dados obtidos:', userData);
          setUser(userData);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuário deslogado');
          // Limpar cache ao fazer logout
          setUserDataCache(new Map());
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Manter usuário logado quando token é renovado
          console.log('🔄 Token renovado');
          // Só buscar dados se não tiver usuário atual
          if (!user) {
            const userData = await fetchUserData(session.user);
            setUser(userData);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro no auth state change:', error);
        if (event === 'SIGNED_OUT') {
          setUserDataCache(new Map());
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [checkUser, fetchUserData, user, loading]);

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
      // Limpar cache
      setUserDataCache(new Map());
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