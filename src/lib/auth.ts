import { supabase, supabaseAdmin, UserProfile } from './supabase';

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
      
      // Validações básicas
      if (!normalizedEmail || !name.trim() || !profile) {
        return { error: 'Todos os campos são obrigatórios' };
      }
      
      if (!normalizedEmail.includes('@')) {
        return { error: 'Email deve ter formato válido' };
      }

      // Verificar se o usuário já existe na tabela public.users
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', normalizedEmail)
          .single();

        if (existingUser) {
          return { error: 'Este email já está cadastrado' };
        }
      } catch (error) {
        // Ignorar erro se a tabela não existir ainda
        console.log('ℹ️ Tabela users pode não existir ainda, continuando...');
      }

      // Tentar primeiro com Service Role Key se disponível
      if (supabaseAdmin) {
        console.log('🔐 Tentando criar usuário com Service Role Key...');
        return await this.createUserWithAdmin(normalizedEmail, name, profile);
      } else {
        console.log('🔐 Service Role Key não disponível, usando método público...');
        return await this.createUserPublic(normalizedEmail, name, profile);
      }
      
    } catch (error) {
      console.error('❌ Erro interno na criação do usuário:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  async createUserWithAdmin(email: string, name: string, profile: UserProfile): Promise<{ error: string | null }> {
    try {
      console.log('👑 Criando usuário com Admin API...');
      
      // 1. Criar usuário no auth.users usando Service Role Key
      const { data: authUser, error: authError } = await supabaseAdmin!.auth.admin.createUser({
        email: email,
        password: 'nb@123',
        email_confirm: true,
        user_metadata: { 
          name: name, 
          profile 
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário no auth:', authError);
        
        if (authError.message?.includes('User already registered')) {
          return { error: 'Este email já está cadastrado no sistema de autenticação' };
        }
        
        return { error: `Erro na criação: ${authError.message}` };
      }

      if (!authUser?.user) {
        return { error: 'Erro: usuário não foi criado no sistema de autenticação' };
      }

      console.log('✅ Usuário criado no auth.users:', authUser.user.id);

      // 2. Inserir na tabela public.users
      console.log('📝 Inserindo dados na tabela public.users...');
      const { error: insertError } = await supabase!
        .from('users')
        .insert({
          id: authUser.user.id,
          email: email,
          name: name,
          profile: profile,
        });
        
      if (insertError) {
        console.error('❌ Erro ao inserir na tabela users:', insertError);
        
        // Se falhou ao inserir na tabela, tentar remover o usuário do auth
        try {
          await supabaseAdmin!.auth.admin.deleteUser(authUser.user.id);
          console.log('🧹 Usuário removido do auth devido ao erro na tabela');
        } catch (cleanupError) {
          console.error('❌ Erro ao limpar usuário do auth:', cleanupError);
        }
        
        return { error: `Erro ao criar perfil: ${insertError.message}` };
      }
      
      console.log('✅ Dados inseridos na tabela public.users');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro interno na criação com admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  async createUserPublic(email: string, name: string, profile: UserProfile): Promise<{ error: string | null }> {
    try {
      console.log('🔓 Criando usuário com método público...');
      
      // Fazer logout de qualquer sessão atual
      await supabase!.auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Tentar criar usuário usando signUp (método público)
      const { data: authData, error: authError } = await supabase!.auth.signUp({
        email: email,
        password: 'nb@123',
        options: {
          data: { 
            name: name, 
            profile: profile 
          }
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário via signUp:', authError);
        
        if (authError.message?.includes('User already registered')) {
          return { error: 'Este email já está cadastrado no sistema de autenticação' };
        }
        
        if (authError.message?.includes('Database error')) {
          return { error: 'Erro de conexão com o banco de dados. Verifique a configuração do Supabase.' };
        }
        
        return { error: `Erro na criação: ${authError.message}` };
      }

      if (!authData?.user) {
        return { error: 'Erro: usuário não foi criado no sistema de autenticação' };
      }

      console.log('✅ Usuário criado via signUp:', authData.user.id);

      // Aguardar um pouco para garantir sincronização
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Inserir na tabela public.users
      console.log('📝 Inserindo dados na tabela public.users...');
      const { error: insertError } = await supabase!
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          name: name,
          profile: profile,
        });
        
      if (insertError) {
        console.error('❌ Erro ao inserir na tabela users:', insertError);
        console.warn('⚠️ Usuário criado no auth mas falhou na tabela users');
        return { error: `Erro ao criar perfil: ${insertError.message}` };
      }
      
      console.log('✅ Dados inseridos na tabela public.users');
      
      // Fazer logout do usuário recém-criado para não interferir na sessão atual
      await supabase!.auth.signOut();
      
      return { error: null };
      
    } catch (error) {
      console.error('❌ Erro interno na criação pública:', error);
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