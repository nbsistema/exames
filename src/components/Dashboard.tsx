// src/components/Dashboard.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { PartnerDashboard } from './partner/PartnerDashboard';
import { ReceptionDashboard } from './reception/ReceptionDashboard';
import { CheckupDashboard } from './checkup/CheckupDashboard';

export function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  console.log('📊 Dashboard - Perfil do usuário:', user.profile);
  console.log('📊 Dashboard - Dados completos:', { email: user.email, name: user.name, profile: user.profile });

  switch (user.profile) {
    case 'admin':
      console.log('👑 Carregando AdminDashboard para:', user.email);
      return <AdminDashboard />;
    case 'parceiro':
      console.log('🤝 Carregando PartnerDashboard para:', user.email);
      return <PartnerDashboard />;
    case 'recepcao':
      console.log('📞 Carregando ReceptionDashboard para:', user.email);
      return <ReceptionDashboard />;
    case 'checkup':
      console.log('🏥 Carregando CheckupDashboard para:', user.email);
      return <CheckupDashboard />;
    default:
      console.warn('⚠️ Perfil não reconhecido:', user.profile);
      return (
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800">Perfil não reconhecido</h3>
            <p className="text-yellow-700">
              O perfil "{user.profile}" não é válido. Entre em contato com o administrador.
            </p>
            <div className="mt-4 p-3 bg-yellow-100 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Debug:</strong>
                <br />• Email: {user.email}
                <br />• Perfil recebido: "{user.profile}"
                <br />• Perfis válidos: admin, parceiro, recepcao, checkup
              </p>
            </div>
          </div>
        </div>
      );
  }
}
