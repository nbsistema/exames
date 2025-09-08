import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [initialized, setInitialized] = useState(false);
  
  // Refs para evitar loops
  const fetchingUserData = useRef(false);
  const userDataCache = useRef<Map<string, AuthUser>>(new Map());
  const initializationPromise = useRef<Promise<void> | null>(null);

  // Função para buscar dados do usuário da tabela users (com proteção contra loops)
  const fetchUserData = useCallback(async (authUser: any): Promise<AuthUser | null> => {
    if (!authUser || !supabase) return null;

    const userId = authUser.id;
    
    // Verificar se já está buscando dados para este usuário
    if (fetchingUserData.current) {
      console.log('⏳ Já está buscando dados do usuário, aguardando...');
      return null;
    }

    // Verificar cache primeiro
    const cachedUser = userDataCache.current.get(userId);
    if (cachedUser) {
      console.log('✅ Usando dados do usuário em cache:', cachedUser.email);
      return cachedUser;
    }

    fetchingUserData.current = true;
    console.log('🔍 Buscando dados do usuário:', userId);

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('⚠️ Erro ao buscar dados do usuário na tabela:', error.message);
        
        // Se o usuário não existe na tabela public.users, criar entrada
        if (error.code === 'PGRST116') {
          console.log('📝 Usuário não existe na tabela public.users, criando entrada...');
          
          const fallbackUser = {
            id: userId,
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
          userDataCache.current.set(userId, fallbackUser);
          return fallbackUser;
        }
        
        // Retornar dados básicos se não conseguir buscar da tabela
        const fallbackUser = {
          id: userId,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
          profile: (authUser.user_metadata?.profile || 'admin') as UserProfile,
        };
        
        // Adicionar ao cache
        userDataCache.current.set(userId, fallbackUser);
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
      userDataCache.current.set(userId, userResult);
      return userResult;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados do usuário:', error);
      const fallbackUser = {
        id: userId,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        profile: (authUser.user_metadata?.profile || 'admin') as UserProfile,
      };
      
      // Adicionar ao cache
      userDataCache.current.set(userId, fallbackUser);
      return fallbackUser;
    } finally {
      fetchingUserData.current = false;
    }
  }, []);

  // Inicialização única
  const initializeAuth = useCallback(async () => {
    if (initialized || !supabase) {
      return;
    }

    // Evitar múltiplas inicializações simultâneas
    if (initializationPromise.current) {
      await initializationPromise.current;
      return;
    }

    initializationPromise.current = (async () => {
      console.log('🔄 Inicializando AuthContext...');
      
      try {
        // Garantir que as tabelas existam
        await databaseService.ensureTablesExist();
        
        // Verificar usuário atual
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.warn('⚠️ Erro ao verificar usuário:', error);
          setUser(null);
        } else if (authUser) {
          console.log('✅ Usuário autenticado encontrado:', authUser.id);
          const userData = await fetchUserData(authUser);
          if (userData) {
            console.log('👤 Dados do usuário processados:', userData);
            setUser(userData);
          }
        } else {
          console.log('ℹ️ Nenhum usuário autenticado');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        setUser(null);
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    })();

    await initializationPromise.current;
  }, [initialized, fetchUserData]);

  useEffect(() => {
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado');
      setUser(null);
      setLoading(false);
      return;
    }

    // Inicializar apenas uma vez
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ Usuário logado, buscando dados...');
          
          // Evitar buscar dados se já estamos buscando
          if (!fetchingUserData.current) {
            const userData = await fetchUserData(session.user);
            if (userData) {
              console.log('👤 Dados obtidos:', userData);
              setUser(userData);
            }
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuário deslogado');
          // Limpar cache ao fazer logout
          userDataCache.current.clear();
          fetchingUserData.current = false;
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Manter usuário logado quando token é renovado
          console.log('🔄 Token renovado');
          // Só buscar dados se não tiver usuário atual
          if (!user && !fetchingUserData.current) {
            const userData = await fetchUserData(session.user);
            if (userData) {
              setUser(userData);
            }
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro no auth state change:', error);
        if (event === 'SIGNED_OUT') {
          userDataCache.current.clear();
          fetchingUserData.current = false;
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth, fetchUserData, user]);

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
      userDataCache.current.clear();
      fetchingUserData.current = false;
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