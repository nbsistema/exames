import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { debugAuth } from './lib/debug';
import { envValidator } from './lib/env-validator';

// Adicionar handler global para erros não capturados
window.addEventListener('error', (event) => {
  console.error('❌ Erro global capturado:', event.error);
  if (event.error?.message?.includes('GoTrueClient')) {
    console.warn('⚠️ Erro relacionado ao GoTrueClient detectado - possível problema de múltiplas instâncias');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejeitada não tratada:', event.reason);
  if (event.reason?.message?.includes('GoTrueClient')) {
    console.warn('⚠️ Promise rejeitada relacionada ao GoTrueClient');
  }
});

// Disponibilizar debug tools globalmente em desenvolvimento
if (import.meta.env.DEV) {
  (window as any).debugAuth = debugAuth;
  (window as any).envValidator = envValidator;
  console.log('🔧 Debug tools disponíveis: window.debugAuth');
  console.log('📋 Comandos disponíveis:');
  console.log('- debugAuth.testConnection() - Testa conexão com Supabase');
  console.log('- debugAuth.testLogin(email, password) - Testa login específico');
  console.log('- debugAuth.inspectNetworkRequests() - Monitora requisições de rede');
  console.log('- debugAuth.clearUserCache() - Limpa apenas cache de usuário');
  console.log('- envValidator.validate() - Valida variáveis de ambiente');
  console.log('- envValidator.testConnection() - Testa conectividade com Supabase');
  
  // Adicionar comando para limpar storage
  (window as any).clearAuthStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 Storage limpo - recarregue a página');
  };
  console.log('- clearAuthStorage() - Limpa todo o storage local');
  console.log('- debugAuth.clearUserCache() - Limpa apenas cache de usuário (mais suave)');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
