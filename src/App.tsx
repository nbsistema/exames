import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { AdminDashboard } from './components/AdminDashboard'; // Crie este componente
import { ParceiroDashboard } from './components/ParceiroDashboard'; // Crie este componente
import { CheckupDashboard } from './components/CheckupDashboard'; // Crie este componente
import { RecepcaoDashboard } from './components/RecepcaoDashboard'; // Crie este componente
import { Layout } from './components/Layout';

function ProtectedRoute({ children, requiredProfile }: { children: JSX.Element; requiredProfile: string }) {
  const { user } = useAuth();
  if (!user) {
    console.log('🚫 Usuário não autenticado, redirecionando para /login');
    return <Navigate to="/login" replace />;
  }
  if (user.profile !== requiredProfile) {
    console.log(`🚫 Perfil ${user.profile} não autorizado para ${requiredProfile}, redirecionando para /unauthorized`);
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    console.log('👤 Estado do usuário:', { user: user?.email, profile: user?.profile, loading });

    const maxTimer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Timeout de carregamento atingido');
        setShowTimeoutWarning(true);
      }
    }, 8000);

    return () => clearTimeout(maxTimer);
  }, [loading, user]);

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

  if (!user) {
    console.log('🔐 Mostrando tela de login');
    return <Navigate to="/login" replace />;
  }

  // Redireciona com base no perfil do usuário
  console.log('📊 Redirecionando para dashboard de:', user.email, 'perfil:', user.profile);
  switch (user.profile) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'parceiro':
      return <Navigate to="/dashboard/parceiro" replace />;
    case 'checkup':
      return <Navigate to="/dashboard/checkup" replace />;
    case 'recepcao':
      return <Navigate to="/dashboard/recepcao" replace />;
    default:
      console.warn('⚠️ Perfil desconhecido:', user.profile);
      return <Navigate to="/dashboard/default" replace />;
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/unauthorized" element={<div>Acesso não autorizado</div>} />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute requiredProfile="admin">
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/parceiro"
            element={
              <ProtectedRoute requiredProfile="parceiro">
                <Layout>
                  <ParceiroDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/checkup"
            element={
              <ProtectedRoute requiredProfile="checkup">
                <Layout>
                  <CheckupDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/recepcao"
            element={
              <ProtectedRoute requiredProfile="recepcao">
                <Layout>
                  <RecepcaoDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/default" element={<div>Página Padrão</div>} />
          <Route path="/" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
