import React, { useState, useEffect } from 'react';
import { Users, Building2, Activity, FileText, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserManagement } from './UserManagement';
import { PartnerManagement } from './PartnerManagement';
import { UnitManagement } from './UnitManagement';
import { AdminReports } from './AdminReports';
import { AdminOverview } from './AdminOverview';

type AdminTab = 'overview' | 'users' | 'partners' | 'units' | 'reports';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'partners', label: 'Parceiros', icon: Building2 },
    { id: 'units', label: 'Unidades', icon: Plus },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview />;
      case 'users':
        return <UserManagement />;
      case 'partners':
        return <PartnerManagement />;
      case 'units':
        return <UnitManagement />;
      case 'reports':
        return <AdminReports />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
        <p className="text-gray-600">Gerencie usuários, parceiros e monitore o sistema</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}