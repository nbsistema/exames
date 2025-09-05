import { supabase, UserProfile } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

export const authService = {
  async createUser(email: string, name: string, profile: UserProfile): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      console.log('👥 Criando usuário:', { email, name, profile });
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: 'nb@123', // Senha padrão
        options: {
          data: { name, profile }
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário:', authError);
        return { error: authError.message };
      }

      if (authData?.user) {
        console.log('✅ Usuário criado no Auth:', authData.user.id);
        
        // Criar perfil na tabela users
        try {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: normalizedEmail,
              name,
              profile,
            });
            
          if (insertError) {
            console.error('❌ Erro ao criar perfil:', insertError);
            return { error: 'Erro ao criar perfil do usuário' };
          }
          
          console.log('✅ Perfil criado na tabela users');
          return { error: null };
        } catch (insertError) {
          console.error('❌ Erro ao inserir na tabela users:', insertError);
          return { error: 'Erro ao criar perfil do usuário' };
        }
      }
      
      return { error: 'Erro desconhecido ao criar usuário' };
    } catch (error) {
      console.error('❌ Erro interno na criação do usuário:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  async createFirstAdmin(email: string, name: string, password: string): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

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
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name, profile: 'admin' }
        }
      });

      console.log('🔍 Resposta do SignUp:', { 
        hasUser: !!authData?.user, 
        hasSession: !!authData?.session,
        errorCode: authError?.status,
        errorMessage: authError?.message 
      });

      if (authError) {
        console.error('❌ Erro no SignUp:', authError);
        
        if (authError.message?.includes('User already registered')) {
          return { error: 'Este email já está cadastrado' };
        }
        
        return { error: authError.message };
      }

      if (authData?.user) {
        console.log('✅ Admin criado no Auth:', authData.user.id);
        
        // Criar entrada na tabela users
        try {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: normalizedEmail,
              name,
              profile: 'admin',
            });
            
          if (insertError) {
            console.error('❌ Erro ao inserir na tabela users:', insertError);
            return { error: 'Erro ao criar perfil do administrador' };
          }
          
          console.log('✅ Entrada criada na tabela users');
          return { error: null };
        } catch (insertError) {
          console.error('❌ Erro ao criar entrada na tabela users:', insertError);
          return { error: 'Erro ao criar perfil do administrador' };
        }
      }
      
      return { error: 'Erro desconhecido ao criar administrador' };
    } catch (error) {
      console.error('❌ Erro interno na criação do admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  },
};