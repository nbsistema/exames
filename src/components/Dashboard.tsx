import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { PartnerDashboard } from './partner/PartnerDashboard';
import { ReceptionDashboard } from './reception/ReceptionDashboard';
import { CheckupDashboard } from './checkup/CheckupDashboard';

export function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const renderDashboard = () => {
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
        return <div>Perfil não reconhecido</div>;
    }
  };

  return renderDashboard();
}