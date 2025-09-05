// Validador de variáveis de ambiente
export const envValidator = {
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Verificar se as variáveis existem
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      errors.push('❌ VITE_SUPABASE_URL não está definida');
    } else {
      // Validar formato da URL
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase.co')) {
          errors.push('⚠️ URL do Supabase parece não ser válida (deve conter supabase.co)');
        }
        console.log('✅ URL do Supabase válida:', url.origin);
      } catch (error) {
        errors.push('❌ VITE_SUPABASE_URL tem formato inválido');
      }
    }
    
    if (!supabaseKey) {
      errors.push('❌ VITE_SUPABASE_ANON_KEY não está definida');
    } else {
      // Validar formato da chave (deve ser um JWT)
      if (!supabaseKey.startsWith('eyJ')) {
        errors.push('❌ VITE_SUPABASE_ANON_KEY não parece ser um JWT válido');
      } else if (supabaseKey.includes('EXEMPLO_SUBSTITUA_PELA_CHAVE_REAL')) {
        errors.push('⚠️ VITE_SUPABASE_ANON_KEY ainda é a chave de exemplo - substitua pela chave real do seu projeto');
      } else {
        console.log('✅ Chave anônima do Supabase presente e com formato correto');
        console.log('🔑 Primeiros 30 caracteres:', supabaseKey.substring(0, 30) + '...');
      }
    }
    
    // Verificar se há espaços em branco ou caracteres especiais
    if (supabaseUrl && (supabaseUrl !== supabaseUrl.trim())) {
      errors.push('⚠️ VITE_SUPABASE_URL contém espaços em branco no início ou fim');
    }
    
    if (supabaseKey && (supabaseKey !== supabaseKey.trim())) {
      errors.push('⚠️ VITE_SUPABASE_ANON_KEY contém espaços em branco no início ou fim');
    }
    
    // Log de todas as variáveis de ambiente relacionadas ao Vite
    console.log('📋 Todas as variáveis VITE_* disponíveis:');
    Object.keys(import.meta.env).forEach(key => {
      if (key.startsWith('VITE_')) {
        const value = import.meta.env[key];
        if (key.includes('KEY') || key.includes('SECRET')) {
          console.log(`- ${key}: ${value ? value.substring(0, 20) + '...' : 'undefined'}`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const validation = this.validate();
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('\n')
      };
    }
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('🔄 Testando conectividade com Supabase...');
      
      // Teste 1: Requisição básica para a API
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Status da resposta:', response.status);
      console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));
      
      if (response.status === 200) {
        console.log('✅ Conexão com Supabase estabelecida com sucesso');
        return { success: true };
      } else if (response.status === 401) {
        return {
          success: false,
          error: 'Chave API inválida ou expirada'
        };
      } else if (response.status === 404) {
        return {
          success: false,
          error: 'URL do projeto Supabase não encontrada'
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `Erro HTTP ${response.status}: ${errorText}`
        };
      }
    } catch (error) {
      console.error('❌ Erro na conexão:', error);
      return {
        success: false,
        error: `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
};

// Executar validação automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🔍 === VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE ===');
  const validation = envValidator.validate();
  
  if (validation.valid) {
    console.log('✅ Todas as variáveis de ambiente estão corretas');
    
    // Testar conexão automaticamente
    envValidator.testConnection().then(result => {
      if (result.success) {
        console.log('✅ Teste de conectividade passou');
      } else {
        console.error('❌ Teste de conectividade falhou:', result.error);
      }
    });
  } else {
    console.error('❌ Problemas encontrados nas variáveis de ambiente:');
    validation.errors.forEach(error => console.error(error));
  }
  console.log('🔍 === FIM DA VALIDAÇÃO ===');
}