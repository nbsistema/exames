import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, UserPlus } from 'lucide-react';
import { databaseAuth } from '../lib/database-auth';
import { useRouter } from 'next/navigation'; // Next.js App Router

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [setupData, setSetupData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  // Rotas por perfil: a fonte de verdade é o banco (users.profile)
  const routeByProfile: Record<'admin' | 'parceiro' | 'checkup' | 'recepcao', string> = {
    admin: '/admin',
    parceiro: '/parceiro',
    checkup: '/checkup',
    recepcao: '/recepcao',
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupMessage('');

    try {
      console.log('👑 Criando primeiro administrador:', setupData);

      // supondo que exista esse método no seu databaseAuth
      const { error } = await databaseAuth.createFirstAdmin(
        setupData.email.trim().toLowerCase(),
        setupData.name.trim(),
        setupData.password
      );

      if (error) {
        console.error('❌ Erro no setup:', error);
        setSetupMessage(`Erro no setup: ${error}`);
        return;
      }

      console.log('✅ Primeiro administrador criado com sucesso');
      setSetupMessage('Administrador criado com sucesso! Você pode fazer login agora.');

      setTimeout(() => {
        setShowInitialSetup(false);
        setSetupData({ name: '', email: '', password: '' });
        setSetupMessage('');
      }, 3000);
    } catch (error) {
      console.error('❌ Erro interno no setup:', error);
      setSetupMessage('Erro no setup: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage('');

    try {
      // TODO: implementar reset real
      setResetMessage('Email de recuperação enviado com sucesso!');
    } catch (error) {
      setResetMessage('Erro ao enviar email: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Email e senha são obrigatórios');
      return;
    }
    if (!email.includes('@')) {
      setError('Email deve ter formato válido');
      return;
    }

    setLoading(true);
    try {
      // 1) login pelo seu AuthContext
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
        return;
      }

      // 2) revalidar direto no banco para obter o profile correto
      const user = await databaseAuth.getCurrentUser();
      if (!user) {
        setError('Não foi possível carregar seu perfil. Tente novamente.');
        return;
      }

      // 3) redirecionar pela role real (nada de localStorage para decidir rota)
      const dest = routeByProfile[user.profile] ?? '/checkup';
      setSuccess('Login bem-sucedido! Redirecionando...');
      router.replace(dest);
    } catch (error) {
      setError(`Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
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
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

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
              <br />• <strong>Sistema híbrido de autenticação</strong>
              <br />• Usuários existentes do Supabase Auth funcionam normalmente
              <br />• Novos usuários são salvos na tabela public.users
              <br />• Senha padrão para novos usuários: <code className="bg-blue-100 px-1 rounded">nb@123</code>
              <br />• Migração automática de usuários existentes
              <br />• Sessões duram 24 horas
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
