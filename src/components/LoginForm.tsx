import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, UserPlus } from 'lucide-react';
import { databaseService } from '../lib/database';

export function LoginForm() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [setupData, setSetupData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação no frontend
    if (!email.trim() || !password.trim()) {
      setError('Email e senha são obrigatórios');
      setLoading(false);
      return;
    }
    
    if (!email.includes('@')) {
      setError('Email deve ter formato válido');
      setLoading(false);
      return;
    }
    try {
      console.log('🔐 Iniciando processo de login...');
      console.log('📧 Email:', email.trim().toLowerCase());
      console.log('🔒 Senha length:', password.length);
      
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        console.error('❌ Erro no login:', signInError);
        setError(signInError);
      } else {
        console.log('✅ Login realizado com sucesso');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setError(`Erro interno do sistema: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage('');

    console.log('🔄 Iniciando reset de senha para:', resetEmail);
    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      console.error('❌ Erro no reset:', error);
      setResetMessage('Erro ao enviar email de recuperação');
    } else {
      console.log('✅ Email de recuperação enviado');
      setResetMessage('Email de recuperação enviado com sucesso!');
      setResetEmail('');
      setTimeout(() => {
        setShowResetPassword(false);
        setResetMessage('');
      }, 3000);
    }
    
    setLoading(false);
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupMessage('');

    // Validação no frontend
    if (!setupData.email.trim() || !setupData.name.trim() || !setupData.password.trim()) {
      setSetupMessage('Todos os campos são obrigatórios');
      setSetupLoading(false);
      return;
    }
    
    if (!setupData.email.includes('@')) {
      setSetupMessage('Email deve ter formato válido');
      setSetupLoading(false);
      return;
    }
    
    if (setupData.password.length < 6) {
      setSetupMessage('Senha deve ter pelo menos 6 caracteres');
      setSetupLoading(false);
      return;
    }
    try {
      console.log('👑 Iniciando criação do primeiro admin...');
      console.log('📧 Email:', setupData.email.trim().toLowerCase());
      console.log('👤 Nome:', setupData.name.trim());
      console.log('🔒 Senha length:', setupData.password.length);
      
      // Importar authService corretamente
      const { authService } = await import('../lib/auth');
      
      const { error } = await authService.createFirstAdmin(
        setupData.email,
        setupData.name.trim(),
        setupData.password
      );

      if (error) {
        console.error('❌ Erro na criação do admin:', error);
        setSetupMessage(`Erro ao criar administrador: ${error}`);
        return;
      }

      console.log('✅ Administrador criado com sucesso');
      setSetupMessage('Administrador criado com sucesso! Você pode fazer login agora com as credenciais criadas.');
      setSetupData({ name: '', email: '', password: '' });
      
      // Aguardar um pouco para garantir sincronização
      setTimeout(() => {
        setShowInitialSetup(false);
        setSetupMessage('');
      }, 5000);
    } catch (error) {
      console.error('Setup error:', error);
      setSetupMessage(`Erro interno do sistema: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSetupLoading(false);
    }
  };

  if (showInitialSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">NB</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Setup Inicial</h2>
              <p className="text-gray-600 mt-2">NB Hub Exames</p>
              <p className="text-sm text-gray-500">Criar primeiro usuário administrador</p>
            </div>

            <form onSubmit={handleInitialSetup} className="space-y-6">
              <div>
                <label htmlFor="setup-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="setup-name"
                    type="text"
                    required
                    value={setupData.name}
                    onChange={(e) => setSetupData({ ...setupData, name: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="setup-email"
                    type="email"
                    required
                    value={setupData.email}
                    onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="admin@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="setup-password"
                    type="password"
                    required
                    minLength={6}
                    value={setupData.password}
                    onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              {setupMessage && (
                <div className={`p-3 rounded-lg ${setupMessage.includes('sucesso') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {setupMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={setupLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {setupLoading ? 'Criando...' : 'Criar Administrador'}
              </button>

              <button
                type="button"
                onClick={() => setShowInitialSetup(false)}
                className="w-full text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Voltar ao login
              </button>
            </form>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Primeira execução:</strong>
                <br />• O usuário será criado no sistema de autenticação
                <br />• As tabelas do banco serão criadas automaticamente
                <br />• Após criar, aguarde alguns segundos e faça login
                <br />• Se houver erro, tente fazer login mesmo assim
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">NB</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Recuperar Senha</h2>
              <p className="text-gray-600 mt-2">NB Hub Exames</p>
              <p className="text-sm text-gray-500">NB Sistema</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {resetMessage && (
                <div className={`p-3 rounded-lg ${resetMessage.includes('sucesso') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
              </button>

              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="w-full text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Voltar ao login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">NB</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Bem-vindo</h2>
            <p className="text-gray-600 mt-2">NB Hub Exames</p>
            <p className="text-sm text-gray-500">NB Sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            <div className="text-center mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowInitialSetup(true)}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Primeiro acesso? Criar administrador
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> 
              <br />• <strong>Login de desenvolvimento:</strong> admin@nb.com / admin123
              <br />• O sistema usa múltiplas estratégias para funcionar
              <br />• Se o Supabase não funcionar, usa armazenamento local
              <br />• Para novos usuários: senha padrão é <code className="bg-blue-100 px-1 rounded">nb@123</code>
              <br />• Em caso de problemas, use as credenciais de desenvolvimento
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2025 NB Sistema. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
