import { supabase, UserProfile } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

export const authService = {
  async createUser(email: string, name: string, profile: UserProfile): Promise<{ error: string | null }> {
    try {
      console.log('👥 Criando usuário:', { email, name, profile });
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validações básicas
      if (!normalizedEmail || !name.trim() || !profile) {
        return { error: 'Todos os campos são obrigatórios' };
      }
      
      if (!normalizedEmail.includes('@')) {
        return { error: 'Email deve ter formato válido' };
      }

      if (!supabase) {
        return { error: 'Supabase não configurado' };
      }

      // Usar método direto com signUp (funciona sem service role)
      console.log('🔄 Criando usuário via signUp público...');
      
      // Salvar sessão atual do admin
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('💾 Sessão atual salva:', currentSession ? 'Sim' : 'Não');
      
      // Criar usuário usando signUp público
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: 'nb@123', // Senha padrão
        options: {
          data: { 
            name: name.trim(), 
            profile: profile 
          }
        }
      });

      if (authError) {
        console.error('❌ Erro no signUp:', authError);
        
        if (authError.message?.includes('User already registered')) {
          return { error: 'Este email já está cadastrado no sistema' };
        }
        
        if (authError.message?.includes('Database error')) {
          return { error: 'Erro de conexão com o banco de dados. Verifique se o projeto Supabase está ativo.' };
        }
        
        if (authError.message?.includes('Invalid email')) {
          return { error: 'Email inválido' };
        }
        
        return { error: `Erro ao criar usuário: ${authError.message}` };
      }

      if (!authData?.user) {
        return { error: 'Falha ao criar usuário - nenhum usuário retornado' };
      }

      console.log('✅ Usuário criado no Auth:', authData.user.id);
      
      // Aguardar para garantir que a trigger foi executada
      console.log('⏳ Aguardando sincronização com a tabela users...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar se foi inserido na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, profile')
        .eq('id', authData.user.id)
        .single();
        
      if (userError) {
        console.warn('⚠️ Usuário não encontrado na tabela users, tentando inserir manualmente:', userError);
        
        // Tentar inserir manualmente se a trigger não funcionou
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: normalizedEmail,
            name: name.trim(),
            profile: profile,
          });
          
        if (insertError) {
          console.error('❌ Erro ao inserir manualmente na tabela users:', insertError);
          
          // Aguardar mais tempo e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { error: retryError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: normalizedEmail,
              name: name.trim(),
              profile: profile,
            });
            
          if (retryError && !retryError.message?.includes('duplicate key')) {
            console.error('❌ Erro na segunda tentativa:', retryError);
            return { error: 'Usuário criado no sistema de autenticação, mas houve problema ao criar o perfil. Tente fazer login com as credenciais fornecidas.' };
          }
        }
      } else {
        console.log('✅ Usuário encontrado na tabela users:', userData);
      }
      
      // Restaurar sessão original se existia
      if (currentSession) {
        try {
          console.log('🔄 Restaurando sessão original...');
          await supabase.auth.setSession(currentSession);
          console.log('✅ Sessão original restaurada');
        } catch (sessionError) {
          console.warn('⚠️ Não foi possível restaurar a sessão original:', sessionError);
          // Não é um erro crítico, continuar
        }
      } else {
        // Se não havia sessão, fazer logout do usuário recém-criado
        console.log('🚪 Fazendo logout do usuário recém-criado...');
        await supabase.auth.signOut();
      }
      
      console.log('✅ Usuário criado com sucesso');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro interno na criação do usuário:', error);
      return { error: 'Erro interno do sistema. Verifique o console para mais detalhes.' };
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
        
        if (authError.message?.includes('Database error')) {
          return { error: 'Erro de conexão com o banco de dados. Verifique a configuração do Supabase.' };
        }
        
        return { error: authError.message };
      }

      if (authData?.user) {
        console.log('✅ Admin criado no Auth:', authData.user.id);
        
        // Aguardar para garantir sincronização
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar se foi inserido na tabela users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .single();
          
        if (userError) {
          console.warn('⚠️ Admin não encontrado na tabela users, tentando inserir manualmente');
          
          // Tentar inserir manualmente se a trigger não funcionou
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
        }
        
        console.log('✅ Admin criado com sucesso');
        return { error: null };
      }
      
      return { error: 'Erro desconhecido ao criar administrador' };
    } catch (error) {
      console.error('❌ Erro interno na criação do admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  },
};