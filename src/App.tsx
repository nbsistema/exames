import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import { ResetPassword } from './components/ResetPassword';

function AppContent() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('🚀 App montando...');
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('👤 Estado do usuário mudou:', { user: user?.email, loading, mounted });
  }, [user, loading, mounted]);

  // Mostrar loading enquanto não montou ou está carregando
  if (!mounted || loading) {
    console.log('⏳ Mostrando loading...', { mounted, loading });
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
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