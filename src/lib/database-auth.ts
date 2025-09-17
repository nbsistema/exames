// Sistema de autenticação via Supabase Auth + perfil extra
import { supabase, supabaseAdmin } from './supabase';
import { UserProfile } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

export const databaseAuth = {
  // Fazer login via Supabase Auth
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Tentando login via Supabase Auth:', email);

      // Validar entrada
      if (!email || !password) {
        return { user: null, error: 'Email e senha são obrigatórios' };
      }

      const normalizedEmail = email.trim().toLowerCase();
      
      if (!normalizedEmail.includes('@')) {
        return { user: null, error: 'Email deve ter formato válido' };
      }

      if (!supabase) {
        console.error('❌ Supabase não configurado');
        return { user: null, error: 'Sistema não configurado. Verifique as variáveis de ambiente.' };
      }

      // Fazer login via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (authError || !authData.user) {
        console.log('❌ Credenciais inválidas:', authError?.message);
        return { user: null, error: 'Email ou senha incorretos' };
      }

      console.log('✅ Usuário autenticado via Supabase Auth:', authData.user.email);

      // Buscar perfil na tabela public.users
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('profile, name')
        .eq('id', authData.user.id)
        .single();

      let userProfile: UserProfile = 'checkup';
      let userName = authData.user.email?.split('@')[0] || 'Usuário';

      if (profileError) {
        console.warn('⚠️ Perfil não encontrado na tabela users, usando padrões');
        
        // Criar perfil padrão se não existir
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: normalizedEmail,
            name: userName,
            profile: userProfile,
          });

        if (insertError) {
          console.warn('⚠️ Erro ao criar perfil padrão:', insertError.message);
        }
      } else {
        userProfile = profileData.profile as UserProfile;
        userName = profileData.name;
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        name: userName,
        profile: userProfile,
      };

      // Salvar no localStorage para manter sessão
      localStorage.setItem('nb-auth-user', JSON.stringify(user));
      localStorage.setItem('nb-auth-timestamp', Date.now().toString());

      return { user, error: null };
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { user: null, error: 'Erro interno do sistema. Verifique sua conexão com o banco de dados.' };
    }
  },

  // Criar usuário via Supabase Auth Admin
  async createUser(email: string, name: string, profile: UserProfile, password: string = 'nb@123'): Promise<{ error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { error: 'Sistema não configurado - Service Role Key necessária' };
      }

      console.log('👥 Criando usuário via Supabase Auth Admin:', { email, name, profile });

      const normalizedEmail = email.trim().toLowerCase();

      // 1. Criar usuário no auth.users via Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: name.trim(),
          profile: profile
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário no auth.users:', authError);
        
        if (authError.message?.includes('User already registered')) {
          return { error: 'Este email já está cadastrado no sistema' };
        }
        
        return { error: `Erro ao criar usuário: ${authError.message}` };
      }

      if (!authData?.user) {
        return { error: 'Falha ao criar usuário - nenhum usuário retornado' };
      }

      console.log('✅ Usuário criado no auth.users:', authData.user.id);

      // 2. Inserir perfil na tabela public.users
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: normalizedEmail,
          name: name.trim(),
          profile: profile,
        });

      if (profileError) {
        console.error('❌ Erro ao criar perfil na tabela users:', profileError);
        
        // Tentar limpar o usuário criado no auth se o perfil falhou
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log('🧹 Usuário removido do auth devido ao erro no perfil');
        } catch (cleanupError) {
          console.error('❌ Erro ao limpar usuário do auth:', cleanupError);
        }
        
        return { error: `Erro ao criar perfil do usuário: ${profileError.message}` };
      }

      console.log('✅ Perfil criado na tabela users');
      return { error: null };
    } catch (error) {
      console.error('❌ Erro interno na criação:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  // Verificar se há usuário logado
  getCurrentUser(): AuthUser | null {
    try {
      const userStr = localStorage.getItem('nb-auth-user');
      const timestamp = localStorage.getItem('nb-auth-timestamp');

      if (!userStr || !timestamp) {
        return null;
      }

      // Verificar se a sessão não expirou (24 horas)
      const sessionAge = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      if (sessionAge > maxAge) {
        console.log('🕐 Sessão expirada');
        this.signOut();
        return null;
      }

      return JSON.parse(userStr);
    } catch (error) {
      console.error('❌ Erro ao verificar usuário atual:', error);
      return null;
    }
  },

  // Fazer logout
  signOut(): void {
    localStorage.removeItem('nb-auth-user');
    localStorage.removeItem('nb-auth-timestamp');
    
    // Fazer logout do Supabase Auth também
    if (supabase) {
      supabase.auth.signOut().catch(error => {
        console.warn('⚠️ Erro ao fazer logout do Supabase Auth:', error);
      });
    }
    
    console.log('🚪 Logout realizado');
  },

  // Criar primeiro admin
  async createFirstAdmin(email: string, name: string, password: string): Promise<{ error: string | null }> {
    try {
      if (!supabase) {
        return { error: 'Sistema não configurado' };
      }

      console.log('👑 Criando primeiro administrador');

      // Verificar se já existe algum admin na tabela users
      const { data: existingAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('profile', 'admin')
        .limit(1);

      if (existingAdmin && existingAdmin.length > 0) {
        return { error: 'Já existe um administrador no sistema' };
      }

      return await this.createUser(email, name, 'admin', password);
    } catch (error) {
      console.error('❌ Erro ao criar primeiro admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  }
};