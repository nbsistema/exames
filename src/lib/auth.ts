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

      // Usar Netlify Function para criar usuário
      console.log('🔄 Criando usuário via Netlify Function...');
      
      const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: 'nb@123', // Senha padrão
          name: name.trim(),
          profile: profile
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erro da Netlify Function:', data);
        
        if (response.status === 409) {
          return { error: 'Este email já está cadastrado' };
        } else if (response.status === 400) {
          return { error: data.error || 'Dados inválidos' };
        } else if (response.status === 500) {
          return { error: 'Erro interno do servidor. Tente novamente.' };
        }
        
        return { error: data.error || 'Erro ao criar usuário' };
      }

      if (data.success) {
        console.log('✅ Usuário criado com sucesso via Netlify Function');
        return { error: null };
      }

      return { error: 'Resposta inválida do servidor' };
      
    } catch (error) {
      console.error('❌ Erro interno na criação do usuário:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  async createUserFallback(email: string, name: string, profile: UserProfile): Promise<{ error: string | null }> {
    try {
      console.log('🔄 Usando método fallback para criar usuário...');
      
      // Salvar sessão atual
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Criar usuário usando signUp público
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: 'nb@123', // Senha padrão
        options: {
          data: { 
            name: name, 
            profile: profile 
          }
        }
      });

      if (authError) {
        console.error('❌ Erro no signUp:', authError);
        
        if (authError.message?.includes('User already registered')) {
          return { error: 'Este email já está cadastrado' };
        }
        
        if (authError.message?.includes('Database error')) {
          return { error: 'Erro de conexão com o banco de dados. Verifique a configuração do Supabase.' };
        }
        
        return { error: authError.message };
      }

      if (!authData?.user) {
        return { error: 'Falha ao criar usuário - nenhum usuário retornado' };
      }

      console.log('✅ Usuário criado no Auth:', authData.user.id);
      
      // Aguardar sincronização
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Criar entrada na tabela users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: name,
          profile: profile,
        });
        
      if (insertError) {
        console.error('❌ Erro ao inserir na tabela users:', insertError);
        
        // Tentar novamente após mais tempo
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { error: retryError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            name: name,
            profile: profile,
          });
          
        if (retryError) {
          console.error('❌ Erro na segunda tentativa:', retryError);
          return { error: 'Erro ao criar perfil do usuário. O usuário foi criado no sistema de autenticação, mas pode ser necessário configurar o perfil manualmente.' };
        }
      }
      
      // Restaurar sessão original se existia
      if (currentSession) {
        try {
          await supabase.auth.setSession(currentSession);
          console.log('✅ Sessão original restaurada');
        } catch (sessionError) {
          console.warn('⚠️ Não foi possível restaurar a sessão original:', sessionError);
        }
      }
      
      console.log('✅ Usuário criado com sucesso via método fallback');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro no método fallback:', error);
      return { error: 'Erro interno do sistema no método alternativo' };
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
            
            // Tentar novamente após mais tempo
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const { error: retryError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: normalizedEmail,
                name,
                profile: 'admin',
              });
              
            if (retryError) {
              console.error('❌ Erro na segunda tentativa:', retryError);
              return { error: 'Erro ao criar perfil do administrador. Tente fazer login mesmo assim.' };
            }
          }
          
          console.log('✅ Entrada criada na tabela users');
          return { error: null };
        } catch (insertError) {
          console.error('❌ Erro ao criar entrada na tabela users:', insertError);
          return { error: 'Erro ao criar perfil do administrador. Tente fazer login mesmo assim.' };
        }
      }
      
      return { error: 'Erro desconhecido ao criar administrador' };
    } catch (error) {
      console.error('❌ Erro interno na criação do admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  },
};