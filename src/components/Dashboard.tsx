import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { PartnerDashboard } from './partner/PartnerDashboard';
import { ReceptionDashboard } from './reception/ReceptionDashboard';
import { CheckupDashboard } from './checkup/CheckupDashboard';

export function Dashboard() {
  const { user, loading } = useAuth();

  // Mostrar loading se ainda está carregando
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário, não renderizar nada (será tratado pelo App.tsx)
  if (!user) {
    return null;
  }

  const renderDashboard = () => {
    try {
      switch (user.profile) {
        case 'admin':
          return <AdminDashboard />;
        case 'parceiro':
          return <PartnerDashboard />;
        case 'recepcao':
          return <ReceptionDashboard />;
        case 'checkup':
          return <CheckupDashboard />;
        default:
          return (
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-800">Perfil não reconhecido</h3>
                <p className="text-yellow-700">
                  O perfil "{user.profile}" não é válido. Entre em contato com o administrador.
                </p>
              </div>
            </div>
          );
      }
    } catch (error) {
      console.error('❌ Erro ao renderizar dashboard:', error);
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-800">Erro no Dashboard</h3>
            <p className="text-red-700">
              Ocorreu um erro ao carregar o dashboard. Tente recarregar a página.
            </p>
          </div>
        </div>
      );
    }
  };

  return renderDashboard();
}