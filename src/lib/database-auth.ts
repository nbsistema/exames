// src/lib/database-auth.ts
import { supabase, supabaseAdmin } from './supabase';

export type UserProfile = 'admin' | 'parceiro' | 'checkup' | 'recepcao';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

async function fetchProfile(id: string): Promise<{ name: string; profile: UserProfile } | null> {
  try {
    console.log('🔍 Buscando perfil para ID:', id);
    
    // Tentar buscar com RLS primeiro
    const { data, error } = await supabase
      .from('users')
      .select('name, profile')
      .eq('id', id)
      .single();

    if (data && !error) {
      console.log('✅ Perfil encontrado via RLS:', data);
      return { name: data.name, profile: data.profile as UserProfile };
    }

    console.warn('⚠️ Erro na busca via RLS:', error?.message);
    
    // Se falhar, tentar com admin client
    if (supabaseAdmin) {
      console.log('🔄 Tentando buscar com admin client...');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('name, profile')
        .eq('id', id)
        .single();

      if (adminData && !adminError) {
        console.log('✅ Perfil encontrado via admin:', adminData);
        return { name: adminData.name, profile: adminData.profile as UserProfile };
      }
      
      console.warn('⚠️ Erro na busca via admin:', adminError?.message);
    }

    return null;
  } catch (err) {
    console.error('❌ Erro interno na busca de perfil:', err);
    return null;
  }
}

export const databaseAuth = {
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Iniciando login para:', email);
      const normalizedEmail = email.trim().toLowerCase();
      
      // Limpar sessão anterior
      await supabase.auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (authError || !authData.user) {
        console.error('❌ Erro no login:', authError?.message);
        return { user: null, error: 'Email ou senha incorretos' };
      }

      console.log('✅ Login no Supabase Auth bem-sucedido');
      
      // Aguardar um pouco para garantir que a sessão foi estabelecida
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Buscar perfil real
      const profileData = await fetchProfile(authData.user.id);

      let profile: UserProfile;
      let name: string;

      if (!profileData) {
        console.log('⚠️ Perfil não encontrado no banco, criando com padrão checkup');
        profile = 'checkup';
        name = authData.user.email?.split('@')[0] || 'Usuário';
        
        // Tentar criar perfil
        try {
          const { error: insertError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: normalizedEmail,
            name,
            profile
          });
          
          if (insertError) {
            console.warn('⚠️ Erro ao criar perfil:', insertError.message);
            // Continuar mesmo com erro, usar dados do auth
          } else {
            console.log('✅ Perfil criado com sucesso');
          }
        } catch (createError) {
          console.warn('⚠️ Erro na criação do perfil:', createError);
        }
      } else {
        profile = profileData.profile;
        name = profileData.name;
        console.log('✅ Perfil encontrado no banco:', profile);
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        name,
        profile
      };

      // Armazenar dados do usuário
      localStorage.setItem('nb-auth-user', JSON.stringify(user));
      localStorage.setItem('nb-auth-timestamp', Date.now().toString());

      console.log('✅ Login completo, usuário:', user.email, 'perfil:', user.profile);
      return { user, error: null };
    } catch (err) {
      console.error('❌ Erro no login:', err);
      return { user: null, error: 'Erro interno no login' };
    }
  },

  async createFirstAdmin(email: string, name: string, password: string): Promise<{ error: string | null }> {
    try {
      console.log('👑 Criando primeiro administrador...');
      
      // Validar entrada
      if (!email || !name || !password) {
        return { error: 'Todos os campos são obrigatórios' };
      }
      
      if (!email.includes('@')) {
        return { error: 'Email deve ter formato válido' };
      }
      
      if (password.length < 6) {
        return { error: 'Senha deve ter pelo menos 6 caracteres' };
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Limpar sessão anterior
      await supabase.auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name, profile: 'admin' }
        }
      });

      if (authError || !authData?.user) {
        console.error('❌ Erro no SignUp:', authError);
        return { error: authError?.message || 'Erro ao criar administrador' };
      }

      console.log('✅ Admin criado no Auth:', authData.user.id);
      
      // Aguardar para garantir sincronização
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Tentar inserir na tabela users
      try {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: normalizedEmail,
            name,
            profile: 'admin',
          });
          
        if (insertError && !insertError.message?.includes('duplicate key')) {
          console.error('❌ Erro ao inserir admin na tabela users:', insertError);
          return { error: 'Erro ao criar perfil do administrador. Tente fazer login mesmo assim.' };
        }
        
        console.log('✅ Admin criado com sucesso');
        return { error: null };
      } catch (createError) {
        console.warn('⚠️ Erro na criação do perfil admin:', createError);
        return { error: 'Admin criado no sistema de autenticação, mas pode haver problema no perfil. Tente fazer login.' };
      }
    } catch (error) {
      console.error('❌ Erro interno na criação do admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  async createUser(email: string, name: string, profile: UserProfile, password = 'nb@123'): Promise<{ error: string | null }> {
    try {
      if (!supabaseAdmin) return { error: 'Service Role Key não configurada' };

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true
      });

      if (authError || !authData?.user) {
        return { error: authError?.message || 'Erro ao criar usuário no Auth' };
      }

      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          profile
        });

      if (profileError) {
        // rollback se falhar
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { error: profileError.message };
      }

      return { error: null };
    } catch (err) {
      console.error('❌ Erro interno na criação de usuário:', err);
      return { error: 'Erro interno' };
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('🔍 Obtendo usuário atual...');
      
      // Tenta usar sessão ativa do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Nenhum usuário autenticado');
        return null;
      }

      console.log('👤 Usuário autenticado encontrado:', user.email);

      const profileData = await fetchProfile(user.id);
      if (!profileData) {
        console.warn('⚠️ Perfil não encontrado, usando padrão checkup');
        return {
          id: user.id,
          email: user.email!,
          name: user.email?.split('@')[0] || 'Usuário',
          profile: 'checkup'
        };
      }

      const currentUser = {
        id: user.id,
        email: user.email!,
        name: profileData.name,
        profile: profileData.profile
      };

      console.log('✅ Usuário atual carregado:', currentUser.email, 'perfil:', currentUser.profile);
      return currentUser;

    } catch (err) {
      console.error('❌ Erro ao obter usuário atual:', err);
      return null;
    }
  },

  async signOut(): Promise<void> {
    console.log('🚪 Fazendo logout...');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('⚠️ Erro no logout do Supabase:', err);
    }
    localStorage.removeItem('nb-auth-user');
    localStorage.removeItem('nb-auth-timestamp');
    console.log('✅ Logout concluído');
  }
};
