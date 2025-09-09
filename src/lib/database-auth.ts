// Sistema de autenticação via banco de dados
import { supabase } from './supabase';
import { UserProfile } from './supabase';

export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

// Função simples para hash de senha (em produção, use bcrypt ou similar)
function hashPassword(password: string): string {
  // Implementação simples - em produção use bcrypt
  return btoa(password + 'nb-salt-2025');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const databaseAuth = {
  // Fazer login via banco de dados
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      if (!supabase) {
        console.error('❌ Supabase não configurado');
        return { user: null, error: 'Sistema não configurado. Verifique as variáveis de ambiente.' };
      }

      console.log('🔐 Tentando login via banco de dados:', email);

      // Validar entrada
      if (!email || !password) {
        return { user: null, error: 'Email e senha são obrigatórios' };
      }

      const normalizedEmail = email.trim().toLowerCase();
      
      if (!normalizedEmail.includes('@')) {
        return { user: null, error: 'Email deve ter formato válido' };
      }
      // Buscar usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, profile, password_hash')
        .eq('email', normalizedEmail)
        .single();

      if (userError || !userData) {
        console.log('❌ Usuário não encontrado ou erro na consulta:', userError?.message);
        return { user: null, error: 'Email ou senha incorretos' };
      }

      // Verificar se o usuário tem password_hash
      if (!userData.password_hash) {
        console.log('❌ Usuário sem senha definida');
        return { user: null, error: 'Usuário sem senha definida. Entre em contato com o administrador.' };
      }
      // Verificar senha
      if (!verifyPassword(password, userData.password_hash)) {
        console.log('❌ Senha incorreta');
        return { user: null, error: 'Email ou senha incorretos' };
      }

      console.log('✅ Login realizado com sucesso:', userData.email);

      const user: AuthUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        profile: userData.profile as UserProfile,
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

  // Criar usuário no banco de dados
  async createUser(email: string, name: string, profile: UserProfile, password: string = 'nb@123'): Promise<{ error: string | null }> {
    try {
      if (!supabase) {
        return { error: 'Sistema não configurado' };
      }

      console.log('👥 Criando usuário no banco:', { email, name, profile });

      const normalizedEmail = email.trim().toLowerCase();

      // Verificar se usuário já existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (existingUser) {
        return { error: 'Este email já está cadastrado no sistema' };
      }

      // Criar hash da senha
      const passwordHash = hashPassword(password);

      // Inserir usuário na tabela
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          email: normalizedEmail,
          name: name.trim(),
          profile: profile,
          password_hash: passwordHash,
        });

      if (insertError) {
        console.error('❌ Erro ao inserir usuário:', insertError);
        return { error: `Erro ao criar usuário: ${insertError.message}` };
      }

      console.log('✅ Usuário criado com sucesso');
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
    console.log('🚪 Logout realizado');
  },

  // Criar primeiro admin
  async createFirstAdmin(email: string, name: string, password: string): Promise<{ error: string | null }> {
    try {
      if (!supabase) {
        return { error: 'Sistema não configurado' };
      }

      console.log('👑 Criando primeiro administrador');

      // Verificar se já existe algum admin
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
  },

  // Resetar senha (simulado - em produção enviaria email)
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      if (!supabase) {
        return { error: 'Sistema não configurado' };
      }

      console.log('🔄 Simulando reset de senha para:', email);

      // Verificar se usuário existe
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (userError || !userData) {
        return { error: 'Email não encontrado no sistema' };
      }

      // Em produção, aqui enviaria um email
      // Por enquanto, apenas resetar para senha padrão
      const newPasswordHash = hashPassword('nb@123');

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('email', email.trim().toLowerCase());

      if (updateError) {
        return { error: 'Erro ao resetar senha' };
      }

      console.log('✅ Senha resetada para padrão');
      return { error: null };
    } catch (error) {
      console.error('❌ Erro no reset de senha:', error);
      return { error: 'Erro interno do sistema' };
    }
  }
};