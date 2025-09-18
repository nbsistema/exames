import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';

function AppContent() {
  const { user, loading } = useAuth();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    console.log('👤 Estado do usuário:', { user: user?.email, loading });
    
    // Timeout de segurança para evitar loading infinito
    const maxTimer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Timeout de carregamento atingido');
        setShowTimeoutWarning(true);
      }
    }, 8000); // 8 segundos máximo
    
    return () => clearTimeout(maxTimer);
  }, [loading]);

  // Mostrar loading enquanto está carregando
  if (loading && !showTimeoutWarning) {
    console.log('⏳ Mostrando loading...');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento...</p>
        </div>
      </div>
    );
  }
  
  // Se atingiu o timeout, mostrar opções de recovery
  if (showTimeoutWarning) {
    console.error('❌ Timeout de carregamento atingido');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-4">Timeout de Carregamento</h3>
            <p className="text-gray-700 mb-4">
              O sistema demorou muito para carregar. Isso pode ser um problema temporário.
            </p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Recarregar Página
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }} 
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Limpar Cache e Recarregar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se não há usuário, mostrar login
  if (!user) {
    console.log('🔐 Mostrando tela de login');
    return <LoginForm />;
  }

  // Se há usuário, mostrar dashboard
  console.log('📊 Redirecionando usuário:', user.email, 'para perfil:', user.profile);
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
