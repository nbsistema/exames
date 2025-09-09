const { createClient } = require('@supabase/supabase-js');

// Headers CORS para permitir requisições do frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
  // Tratar requisições OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Apenas aceitar método POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' }),
    };
  }

  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Variáveis de ambiente não configuradas');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.error('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Configuração do servidor incompleta. Variáveis de ambiente não encontradas.' 
        }),
      };
    }

    // Criar cliente Supabase com Service Role Key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse do body da requisição
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'JSON inválido no body da requisição.' }),
      };
    }

    const { email, password, name, profile } = body;

    // Validar campos obrigatórios
    if (!email || !password) {
      console.error('❌ Campos obrigatórios ausentes:', { email: !!email, password: !!password });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Campos obrigatórios: email e password' 
        }),
      };
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Email com formato inválido:', email);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Formato de email inválido.' }),
      };
    }

    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
      console.error('❌ Senha muito curta:', password.length);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Senha deve ter pelo menos 6 caracteres.' 
        }),
      };
    }

    // Validar profile se fornecido
    const validProfiles = ['admin', 'parceiro', 'checkup', 'recepcao'];
    if (profile && !validProfiles.includes(profile)) {
      console.error('❌ Profile inválido:', profile);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Profile deve ser um dos seguintes: ${validProfiles.join(', ')}` 
        }),
      };
    }

    console.log('✅ Validações passaram, criando usuário:', { 
      email, 
      name: name || 'Sem nome', 
      profile: profile || 'checkup' 
    });

    // Criar usuário usando Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password || 'nb@123',
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name: name || 'Sem nome',
        profile: profile || 'checkup'
      }
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no auth:', authError);
      
      // Tratar erros específicos
      if (authError.message?.includes('User already registered')) {
        return {
          statusCode: 409,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Este email já está cadastrado no sistema.' 
          }),
        };
      }
      
      if (authError.message?.includes('Database error')) {
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Erro de conexão com o banco de dados. Tente novamente.' 
          }),
        };
      }

      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Erro ao criar usuário: ${authError.message}` 
        }),
      };
    }

    if (!authData?.user) {
      console.error('❌ Nenhum usuário retornado após criação');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Falha ao criar usuário - nenhum usuário retornado.' 
        }),
      };
    }

    console.log('✅ Usuário criado no auth com sucesso:', authData.user.id);

    // Criar hash da senha para a tabela users
    const passwordHash = Buffer.from(password + 'nb-salt-2025').toString('base64');

    // Inserir na tabela users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        name: name || 'Sem nome',
        profile: profile || 'checkup',
        password_hash: passwordHash
      });

    if (insertError) {
      console.error('❌ Erro ao inserir na tabela users:', insertError);
      
      // Tentar limpar o usuário do auth se a inserção falhou
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('🧹 Usuário removido do auth após falha na inserção');
      } catch (cleanupError) {
        console.error('❌ Erro ao limpar usuário do auth:', cleanupError);
      }
      
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: `Erro ao criar perfil do usuário: ${insertError.message}` 
        }),
      };
    }

    // Aguardar um pouco para garantir que a trigger foi executada
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Usuário inserido na tabela users com sucesso');

    // Retornar sucesso
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Usuário criado com sucesso!',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || 'Sem nome',
          profile: authData.user.user_metadata?.profile || 'checkup',
          created_at: authData.user.created_at
        }
      }),
    };

  } catch (error) {
    console.error('❌ Erro interno na função:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: `Erro interno do servidor: ${error.message}` 
      }),
    };
  }
};