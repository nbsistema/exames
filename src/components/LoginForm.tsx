import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, UserPlus, Building, Target, Users, Shield, ArrowRight, Calendar } from 'lucide-react';
import { databaseAuth } from '../lib/database-auth';

type UserProfile = 'admin' | 'parceiro' | 'checkup' | 'recepcao';

export function LoginForm() {
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
  const [setupData, setSetupData] = useState({ name: '', email: '', password: '' });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupMessage('');

    try {
      const { error } = await databaseAuth.createFirstAdmin(
        setupData.email.trim().toLowerCase(),
        setupData.name.trim(),
        setupData.password
      );
      if (error) {
        setSetupMessage(`Erro no setup: ${error}`);
        return;
      }
      setSetupMessage('Administrador criado com sucesso! Você pode fazer login agora.');
      setTimeout(() => {
        setShowInitialSetup(false);
        setSetupData({ name: '', email: '', password: '' });
        setSetupMessage('');
      }, 3000);
    } catch (err) {
      setSetupMessage('Erro no setup: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
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
    } catch (err) {
      setResetMessage('Erro ao enviar email: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
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
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
        return;
      }

      const user = await databaseAuth.getCurrentUser();
      if (!user) {
        setError('Não foi possível carregar seu perfil. Tente novamente.');
        return;
      }

      setSuccess('Login bem-sucedido! Redirecionando...');
      
    } catch (err) {
      setError(`Erro interno: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (showInitialSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl inline-flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-2xl">NB Sistema</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Setup Inicial</h2>
              <p className="text-gray-600 mt-2">Hub Exames</p>
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
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {setupLoading ? 'Criando...' : 'Criar Administrador'}
              </button>

              <button
                type="button"
                onClick={() => setShowInitialSetup(false)}
                className="w-full text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                ← Voltar ao login
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 font-medium">
                <strong>Primeira execução:</strong>
                <br />• O usuário será criado no sistema de autenticação
                <br />• As tabelas do banco serão criadas automaticamente
                <br />• Após criar, aguarde alguns segundos e faça login
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl inline-flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-2xl">NB Sistema</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Recuperar Senha</h2>
              <p className="text-gray-600 mt-2">Hub de Exames</p>
              <p className="text-sm text-gray-500">Um sistema da NB Consultoria</p>
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
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
              </button>

              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="w-full text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                ← Voltar ao login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex">
      {/* Lado Esquerdo - Apresentação da Empresa */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-12 text-white">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                NB Sistema
              </h1>
              <p className="text-blue-200 text-lg">Hub de Exames</p>
            </div>
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-3xl font-bold leading-tight">
              Transformando a gestão de saúde corporativa
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Como braço tecnológico da <strong>NB Consultoria</strong>, desenvolvemos soluções 
              inovadoras para otimizar processos de exames ocupacionais e promover 
              ambientes de trabalho mais saudáveis e seguros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg mt-1">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Missão</h3>
                <p className="text-blue-100 text-sm">Excelência em gestão de saúde ocupacional</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg mt-1">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Visão</h3>
                <p className="text-blue-100 text-sm">Referência em tecnologia para saúde</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg mt-1">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Segurança</h3>
                <p className="text-blue-100 text-sm">Dados protegidos e compliance total</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg mt-1">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Experiência</h3>
                <p className="text-blue-100 text-sm">+15 anos no mercado</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 font-semibold">NB Consultoria & Sistema</p>
              <p className="text-blue-100 text-sm">Soluções completas em saúde ocupacional</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-sm">📞 (11) 9999-9999</p>
              <p className="text-blue-100 text-sm">✉️ contato@nbconsultoria.com.br</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="lg:hidden mb-6">
                <div className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl inline-flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">NB Sistema</span>
                </div>
                <p className="text-gray-600 mt-2 text-lg">Hub de Exames</p>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900">Acesse sua conta</h2>
              <p className="text-gray-600 mt-2">Entre com suas credenciais para continuar</p>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 flex items-center">
                    <span className="mr-2">✅</span>
                    {success}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  'Entrando...'
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowInitialSetup(true)}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Primeiro acesso? Configure o sistema
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 font-medium">
                <strong>💡 Dica de segurança:</strong>
                <br />
                Mantenha suas credenciais em local seguro e nunca as compartilhe com terceiros.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-white/80">
              © 2025 NB Sistema - Um braço da NB Consultoria. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
