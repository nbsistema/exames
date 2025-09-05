// Utilitário para debug de problemas de autenticação
import { supabase } from './supabase';

export const debugAuth = {
  async testConnection(): Promise<void> {
    console.log('🔍 === TESTE DE CONEXÃO SUPABASE ===');
    
    // 1. Verificar variáveis de ambiente
    console.log('📋 Variáveis de ambiente:');
    console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('- VITE_SUPABASE_ANON_KEY presente:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('- VITE_SUPABASE_ANON_KEY (primeiros 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20) + '...');
    
    // 2. Testar URL
    try {
      const url = new URL(import.meta.env.VITE_SUPABASE_URL);
      console.log('✅ URL válida:', url.origin);
    } catch (error) {
      console.error('❌ URL inválida:', error);
      return;
    }
    
    // 3. Testar conexão básica
    try {
      console.log('🔄 Testando getSession...');
      const { data, error } = await supabase.auth.getSession();
      console.log('📊 Resultado getSession:', { 
        hasSession: !!data.session, 
        error: error?.message 
      });
    } catch (error) {
      console.error('❌ Erro em getSession:', error);
    }
    
    // 4. Testar requisição simples
    try {
      console.log('🔄 Testando requisição simples...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });
      console.log('📊 Status da requisição:', response.status);
      console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
    }
    
    console.log('🔍 === FIM DO TESTE ===');
  },

  async testLogin(email: string, password: string): Promise<void> {
    console.log('🔍 === TESTE DE LOGIN ===');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password.length);
    
    try {
      // Limpar sessão anterior
      await supabase.auth.signOut();
      console.log('🧹 Sessão anterior limpa');
      
      // Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Tentar login
      console.log('🔄 Tentando login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      
      console.log('📊 Resultado do login:');
      console.log('- Usuário presente:', !!data.user);
      console.log('- Sessão presente:', !!data.session);
      console.log('- Erro:', error?.message);
      console.log('- Status do erro:', error?.status);
      console.log('- Detalhes completos do erro:', error);
      
      if (data.user) {
        console.log('👤 Dados do usuário:');
        console.log('- ID:', data.user.id);
        console.log('- Email:', data.user.email);
        console.log('- Confirmado:', data.user.email_confirmed_at ? 'Sim' : 'Não');
        console.log('- Metadata:', data.user.user_metadata);
      }
      
    } catch (error) {
      console.error('❌ Erro na tentativa de login:', error);
    }
    
    console.log('🔍 === FIM DO TESTE DE LOGIN ===');
  },

  async inspectNetworkRequests(): Promise<void> {
    console.log('🔍 === MONITORAMENTO DE REDE ===');
    console.log('Para monitorar requisições de rede:');
    console.log('1. Abra as DevTools (F12)');
    console.log('2. Vá para a aba Network');
    console.log('3. Filtre por "supabase" ou "auth"');
    console.log('4. Tente fazer login novamente');
    console.log('5. Verifique as requisições POST para /auth/v1/token');
    console.log('6. Examine os headers e payload das requisições');
    
    // Interceptar fetch para debug
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      
      if (typeof url === 'string' && url.includes('supabase') && url.includes('auth')) {
        console.log('🌐 Interceptando requisição Supabase Auth:');
        console.log('- URL:', url);
        console.log('- Method:', options?.method);
        console.log('- Headers:', options?.headers);
        console.log('- Body:', options?.body);
      }
      
      const response = await originalFetch(...args);
      
      if (typeof url === 'string' && url.includes('supabase') && url.includes('auth')) {
        console.log('📨 Resposta da requisição:');
        console.log('- Status:', response.status);
        console.log('- StatusText:', response.statusText);
        console.log('- Headers:', Object.fromEntries(response.headers.entries()));
        
        // Clonar resposta para ler o body sem consumir o original
        const clonedResponse = response.clone();
        try {
          const responseBody = await clonedResponse.text();
          console.log('- Body:', responseBody);
        } catch (error) {
          console.log('- Body: (não foi possível ler)');
        }
      }
      
      return response;
    };
    
    console.log('✅ Interceptador de rede ativado');
  }
};

// Expor globalmente para uso no console
(window as any).debugAuth = debugAuth;