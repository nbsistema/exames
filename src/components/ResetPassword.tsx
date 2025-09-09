import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para login já que não temos reset de senha
    setError('Funcionalidade de reset de senha não disponível. Entre em contato com o administrador.');
    setTimeout(() => navigate('/'), 3000);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">NB</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Reset de Senha</h2>
            <p className="text-gray-600 mt-2">NB Hub Exames</p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Funcionalidade não disponível</strong>
              <br />
              O reset de senha não está implementado neste sistema.
              <br />
              Entre em contato com o administrador para redefinir sua senha.
              <br />
              <br />
              Redirecionando para o login...
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Voltar ao login agora
          </button>
        </div>
      </div>
    </div>
  );
}