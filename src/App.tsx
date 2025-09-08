import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import { ResetPassword } from './components/ResetPassword';

function AppContent() {
  const { user, loading } = useAuth();
  const [initialLoad, setInitialLoad] = useState(true);
  const [maxLoadingTime, setMaxLoadingTime] = useState(false);

  useEffect(() => {
    console.log('👤 Estado do usuário mudou:', { user: user?.email, loading });
    
    // Se o usuário foi carregado, marcar como não sendo mais carregamento inicial
    if (user !== null || !loading) {
      setInitialLoad(false);
    }
  }, [user, loading, initialLoad]);
  
  useEffect(() => {
    // Timeout máximo para carregamento
    const maxTimer = setTimeout(() => {
      console.warn('⚠️ Timeout máximo de carregamento atingido');
      setMaxLoadingTime(true);
      setInitialLoad(false);
    }, 5000); // 5 segundos máximo
    
    return () => clearTimeout(maxTimer);
  }, []);

  // Mostrar loading enquanto está carregando (mas não por mais de 5 segundos)
  if (loading && initialLoad && !maxLoadingTime) {
    console.log('⏳ Mostrando loading...', { loading });
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
          <p className="text-xs text-gray-500 mt-2">Se demorar muito, recarregue a página</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }
  
  // Se atingiu o tempo máximo de loading, mostrar erro
  if (maxLoadingTime && loading) {
    console.error('❌ Timeout de carregamento - forçando exibição de login');
    return <LoginForm />;
  }

  // Se não há usuário, mostrar login
  if (!user) {
    console.log('🔐 Mostrando tela de login');
    return <LoginForm />;
  }

  // Se há usuário, mostrar dashboard
  console.log('📊 Mostrando dashboard para:', user.email, 'perfil:', user.profile);
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;