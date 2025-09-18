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
  const { data, error } = await supabase
    .from('users')
    .select('name, profile')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return { name: data.name, profile: data.profile as UserProfile };
}

export const databaseAuth = {
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Iniciando login para:', email);
      const normalizedEmail = email.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (authError || !authData.user) {
        console.error('❌ Erro no login:', authError?.message);
        return { user: null, error: 'Email ou senha incorretos' };
      }

      console.log('✅ Login no Supabase Auth bem-sucedido');
      // Buscar perfil real
      const profileData = await fetchProfile(authData.user.id);

      // Se não houver, cria com padrão 'checkup'
      let profile = profileData?.profile ?? 'checkup';
      let name = profileData?.name ?? (authData.user.email?.split('@')[0] || 'Usuário');

      if (!profileData) {
        console.log('⚠️ Perfil não encontrado, criando com padrão checkup');
        await supabase.from('users').insert({
          id: authData.user.id,
          email: normalizedEmail,
          name,
          profile
        }).single();
      } else {
        console.log('✅ Perfil encontrado no banco:', profile);
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        name,
        profile
      };

      // Armazena para reuso rápido, mas sempre revalidamos no initializeAuth
      localStorage.setItem('nb-auth-user', JSON.stringify(user));
      localStorage.setItem('nb-auth-timestamp', Date.now().toString());

      console.log('✅ Login completo, usuário:', user.email, 'perfil:', user.profile);
      return { user, error: null };
    } catch (err) {
      console.error('❌ Erro no login:', err);
      return { user: null, error: 'Erro interno no login' };
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
      // Tenta usar sessão ativa do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const profileData = await fetchProfile(user.id);
      if (!profileData) return null;

      return {
        id: user.id,
        email: user.email!,
        name: profileData.name,
        profile: profileData.profile
      };
    } catch (err) {
      console.error('❌ Erro ao obter usuário atual:', err);
      return null;
    }
  },

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('⚠️ Erro no logout do Supabase:', err);
    }
    localStorage.removeItem('nb-auth-user');
    localStorage.removeItem('nb-auth-timestamp');
  }
};
