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

  console.log('📊 Perfil do usuário:', user.profile);

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
}
