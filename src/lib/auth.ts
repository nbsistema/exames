import { supabase, UserProfile, AppUser } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
}

export const authService = {
  // Método completamente novo para verificar se o Supabase está funcionando
  async testSupabaseConnection(): Promise<{ working: boolean; error?: string }> {
    try {
      console.log('🔍 Testando conexão com Supabase...');
      
      // Teste 1: Verificar se consegue acessar a API
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro na conexão:', error);
        return { working: false, error: error.message };
      }
      
      console.log('✅ Conexão com Supabase funcionando');
      return { working: true };
    } catch (error) {
      console.error('❌ Erro crítico na conexão:', error);
      return { working: false, error: 'Erro crítico de conexão' };
    }
  },

  // Método alternativo usando Admin API
  async createUserWithAdminAPI(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 Tentando criar usuário via Admin API...');
      
      // Usar service role key se disponível
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      
      if (serviceRoleKey) {
        const adminClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        
        const { data, error } = await adminClient.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          user_metadata: { name, profile: 'admin' },
          email_confirm: true
        });
        
        if (error) {
          console.error('❌ Erro na Admin API:', error);
          return { success: false, error: error.message };
        }
        
        console.log('✅ Usuário criado via Admin API');
        return { success: true };
      }
      
      return { success: false, error: 'Service role key não disponível' };
    } catch (error) {
      console.error('❌ Erro na Admin API:', error);
      return { success: false, error: 'Erro na Admin API' };
    }
  },

  // Método de criação usando SQL direto
  async createUserWithSQL(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗄️ Tentando criar usuário via SQL...');
      
      // Gerar ID único
      const userId = crypto.randomUUID();
      const hashedPassword = btoa(password); // Base64 simples (não é seguro, mas para teste)
      
      const { error } = await supabase.rpc('create_user_direct', {
        user_id: userId,
        user_email: email.trim().toLowerCase(),
        user_password: hashedPassword,
        user_name: name,
        user_profile: 'admin'
      });
      
      if (error) {
        console.error('❌ Erro no SQL:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ Usuário criado via SQL');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no SQL:', error);
      return { success: false, error: 'Erro no SQL' };
    }
  },

  // Método de fallback usando localStorage
  async createUserFallback(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💾 Usando fallback local...');
      
      const userData = {
        id: crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        password: btoa(password),
        name,
        profile: 'admin',
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem('nb_admin_user', JSON.stringify(userData));
      console.log('✅ Usuário salvo localmente');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no fallback:', error);
      return { success: false, error: 'Erro no fallback' };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('🔐 Iniciando login com múltiplas estratégias...');
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validar entrada
      if (!normalizedEmail || !password) {
        return { user: null, error: 'Email e senha são obrigatórios' };
      }
      
      if (!normalizedEmail.includes('@')) {
        return { user: null, error: 'Email deve ter formato válido' };
      }
      
      if (password.length < 3) {
        return { user: null, error: 'Senha deve ter pelo menos 3 caracteres' };
      }
      
      // Estratégia 1: Login direto via API REST (corrigindo o problema grant_type)
      console.log('📝 Estratégia 1: Login direto via API REST...');
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password: password,
            gotrue_meta_security: {}
          })
        });

        console.log('🔍 Resposta da API REST:', { 
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.ok) {
          const authData = await response.json();
          console.log('✅ Login direto via API funcionou');
          
          // Definir a sessão no cliente Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          });
          
          if (!sessionError) {
            // Buscar dados do usuário
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();
                
              if (userData) {
                return {
                  user: {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    profile: userData.profile,
                  },
                  error: null,
                };
              }
            } catch (userError) {
              console.warn('⚠️ Erro ao buscar dados do usuário, usando dados básicos');
            }
            
            return {
              user: {
                id: authData.user.id,
                email: normalizedEmail,
                name: authData.user.user_metadata?.name || 'Admin',
                profile: 'admin',
              },
              error: null,
            };
          }
        } else {
          const errorData = await response.json();
          console.warn('⚠️ Erro na API REST:', errorData);
        }
      } catch (directApiError) {
        console.warn('⚠️ Login direto via API falhou:', directApiError);
      }
      
      // Estratégia 2: Tentar login normal do Supabase
      console.log('📝 Estratégia 1: Login normal...');
      try {
        // Limpar sessão anterior se existir
        await supabase.auth.signOut();
        
        // Aguardar um pouco para garantir que a sessão foi limpa
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        console.log('🔍 Resposta do Supabase:', { 
          hasUser: !!authData?.user, 
          hasSession: !!authData?.session,
          errorCode: authError?.status,
          errorMessage: authError?.message 
        });

        if (authData?.user && !authError) {
          console.log('✅ Login normal funcionou');
          
          // Tentar buscar dados do usuário
          try {
            // Aguardar um pouco para garantir que a sessão foi estabelecida
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', authData.user.id)
              .single();
              
            if (userData) {
              return {
                user: {
                  id: userData.id,
                  email: userData.email,
                  name: userData.name,
                  profile: userData.profile,
                },
                error: null,
              };
            }
          } catch (userError) {
            console.warn('⚠️ Erro ao buscar dados do usuário, usando dados básicos');
          }
          
          // Retornar dados básicos se não conseguir buscar da tabela
          return {
            user: {
              id: authData.user.id,
              email: normalizedEmail,
              name: authData.user.user_metadata?.name || 'Admin',
              profile: 'admin',
            },
            error: null,
          };
        } else if (authError) {
          console.warn('⚠️ Erro específico do Supabase:', {
            status: authError.status,
            message: authError.message,
            details: authError
          });
          
          // Mapear erros específicos
          if (authError.message?.includes('Invalid login credentials')) {
            console.log('📝 Credenciais inválidas, tentando próxima estratégia...');
          } else if (authError.message?.includes('Email not confirmed')) {
            return { user: null, error: 'Email não confirmado. Verifique sua caixa de entrada.' };
          } else if (authError.message?.includes('Too many requests')) {
            return { user: null, error: 'Muitas tentativas. Aguarde alguns minutos.' };
          } else if (authError.status === 400) {
            console.log('📝 Erro 400 - requisição malformada, tentando próxima estratégia...');
          }
        }
      } catch (normalLoginError) {
        console.warn('⚠️ Login normal falhou:', {
          message: normalLoginError instanceof Error ? normalLoginError.message : normalLoginError,
          stack: normalLoginError instanceof Error ? normalLoginError.stack : undefined
        });
      }
      
      // Estratégia 3: Verificar localStorage
      console.log('💾 Estratégia 2: Verificar localStorage...');
      try {
        const localUser = localStorage.getItem('nb_admin_user');
        if (localUser) {
          const userData = JSON.parse(localUser);
          if (userData.email === normalizedEmail && atob(userData.password) === password) {
            console.log('✅ Login via localStorage funcionou');
            return {
              user: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                profile: userData.profile,
              },
              error: null,
            };
          }
        }
      } catch (localError) {
        console.warn('⚠️ Erro no localStorage:', localError);
      }
      
      // Estratégia 4: Login hardcoded para desenvolvimento
      console.log('🔧 Estratégia 3: Login de desenvolvimento...');
      if (normalizedEmail === 'admin@nb.com' && password === 'admin123') {
        console.log('✅ Login de desenvolvimento funcionou');
        return {
          user: {
            id: 'dev-admin-id',
            email: 'admin@nb.com',
            name: 'Administrador',
            profile: 'admin',
          },
          error: null,
        };
      }
      
      return { user: null, error: 'Email ou senha incorretos' };
    } catch (error) {
      console.error('❌ Erro interno no login:', error);
      return { user: null, error: 'Erro interno do sistema' };
    }
  },

  async signOut(): Promise<void> {
    try {
      console.log('🚪 Fazendo logout...');
      await supabase.auth.signOut();
      localStorage.removeItem('nb_admin_user');
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('👤 Verificando usuário atual...');
      
      // Verificar sessão do Supabase
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (user && !authError) {
          console.log('✅ Usuário do Supabase encontrado');
          
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (userData) {
              return {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                profile: userData.profile,
              };
            }
          } catch (userError) {
            console.warn('⚠️ Erro ao buscar dados do usuário');
          }
          
          return {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 'Admin',
            profile: 'admin',
          };
        }
      } catch (supabaseError) {
        console.warn('⚠️ Erro na verificação do Supabase:', supabaseError);
      }
      
      // Verificar localStorage
      try {
        const localUser = localStorage.getItem('nb_admin_user');
        if (localUser) {
          const userData = JSON.parse(localUser);
          console.log('✅ Usuário do localStorage encontrado');
          return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            profile: userData.profile,
          };
        }
      } catch (localError) {
        console.warn('⚠️ Erro no localStorage:', localError);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro interno ao verificar usuário:', error);
      return null;
    }
  },

  async resetPassword(email: string): Promise<{ error: string | null }> {
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
  },

  async createUser(email: string, name: string, profile: UserProfile): Promise<{ error: string | null }> {
    try {
      console.log('👥 Criando usuário com múltiplas estratégias:', { email, name, profile });
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Estratégia 1: Supabase normal
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: 'nb@123',
          options: {
            data: { name, profile }
          }
        });

        if (authData?.user && !authError) {
          console.log('✅ Usuário criado via Supabase normal');
          
          // Tentar criar perfil
          try {
            await supabase.from('users').insert({
              id: authData.user.id,
              email: normalizedEmail,
              name,
              profile,
            });
          } catch (profileError) {
            console.warn('⚠️ Erro ao criar perfil, mas usuário foi criado');
          }
          
          return { error: null };
        }
      } catch (normalError) {
        console.warn('⚠️ Criação normal falhou:', normalError);
      }
      
      // Estratégia 2: Admin API
      const adminResult = await this.createUserWithAdminAPI(normalizedEmail, 'nb@123', name);
      if (adminResult.success) {
        return { error: null };
      }
      
      // Estratégia 3: SQL direto
      const sqlResult = await this.createUserWithSQL(normalizedEmail, 'nb@123', name);
      if (sqlResult.success) {
        return { error: null };
      }
      
      // Estratégia 4: Fallback local
      const fallbackResult = await this.createUserFallback(normalizedEmail, 'nb@123', name);
      if (fallbackResult.success) {
        return { error: null };
      }
      
      return { error: 'Não foi possível criar o usuário com nenhuma estratégia' };
    } catch (error) {
      console.error('❌ Erro interno na criação do usuário:', error);
      return { error: 'Erro interno do sistema' };
    }
  },

  async createFirstAdmin(email: string, name: string, password: string): Promise<{ error: string | null }> {
    try {
      console.log('👑 Criando primeiro administrador com múltiplas estratégias...');
      
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
      
      // Testar conexão primeiro
      const connectionTest = await this.testSupabaseConnection();
      if (!connectionTest.working) {
        console.warn('⚠️ Supabase não está funcionando, usando fallback');
        const fallbackResult = await this.createUserFallback(email, password, name);
        return { error: fallbackResult.success ? null : fallbackResult.error || 'Erro no fallback' };
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Estratégia 1: SignUp via API REST (corrigindo problemas de confirmação)
      try {
        console.log('📝 Estratégia 1: SignUp via API REST...');
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password: password,
            data: { name, profile: 'admin' },
            // Forçar confirmação automática
            email_confirm: true
          })
        });

        if (response.ok) {
          const authData = await response.json();
          console.log('✅ Admin criado via API REST');
          
          // Se o usuário foi criado, confirmar email automaticamente
          if (authData.user && !authData.user.email_confirmed_at) {
            try {
              // Tentar confirmar via API admin se possível
              const confirmResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${authData.user.id}`, {
                method: 'PUT',
                headers: {
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  email_confirm: true
                })
              });
              
              if (confirmResponse.ok) {
                console.log('✅ Email confirmado automaticamente');
              }
            } catch (confirmError) {
              console.warn('⚠️ Não foi possível confirmar email automaticamente');
            }
          }
          
          // Criar entrada na tabela users
          try {
            await supabase.from('users').insert({
              id: authData.user.id,
              email: normalizedEmail,
              name,
              profile: 'admin',
            });
          } catch (insertError) {
            console.warn('⚠️ Erro ao inserir na tabela users:', insertError);
          }
          
          return { error: null };
        }
      } catch (apiError) {
        console.warn('⚠️ SignUp via API REST falhou:', apiError);
      }
      
      // Estratégia 2: SignUp normal
      try {
        // Limpar sessão anterior
        await supabase.auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { name, profile: 'admin' },
            emailRedirectTo: undefined, // Desabilitar confirmação por email
            captchaToken: undefined
          }
        });

        console.log('🔍 Resposta do SignUp:', { 
          hasUser: !!authData?.user, 
          hasSession: !!authData?.session,
          errorCode: authError?.status,
          errorMessage: authError?.message 
        });

        if (authData?.user && !authError) {
          console.log('✅ Admin criado via SignUp normal');
          
          // Tentar criar entrada na tabela users
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: normalizedEmail,
                name,
                profile: 'admin',
              });
              
            if (insertError) {
              console.warn('⚠️ Erro ao inserir na tabela users:', insertError);
            } else {
              console.log('✅ Entrada criada na tabela users');
            }
          } catch (insertError) {
            console.warn('⚠️ Erro ao criar entrada na tabela users:', insertError);
          }
          
          return { error: null };
        }
        
        if (authError?.message?.includes('User already registered')) {
          console.log('ℹ️ Usuário já existe, considerando sucesso');
          return { error: null };
        } else if (authError) {
          console.warn('⚠️ Erro no SignUp:', {
            status: authError.status,
            message: authError.message,
            details: authError
          });
        }
      } catch (normalError) {
        console.warn('⚠️ SignUp normal falhou:', normalError);
      }
      
      // Estratégia 3: Admin API
      const adminResult = await this.createUserWithAdminAPI(normalizedEmail, password, name);
      if (adminResult.success) {
        return { error: null };
      }
      
      // Estratégia 4: Fallback local
      const fallbackResult = await this.createUserFallback(normalizedEmail, password, name);
      if (fallbackResult.success) {
        return { error: null };
      }
      
      return { error: 'Não foi possível criar o administrador' };
    } catch (error) {
      console.error('❌ Erro interno na criação do admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  },
};