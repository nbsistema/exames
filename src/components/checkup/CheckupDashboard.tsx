import React, { useState } from 'react';
import { Building2, Clipboard, Users, Activity } from 'lucide-react';
import { BatteryManagement } from './BatteryManagement';
import { CheckupRequests } from './CheckupRequests';
import { CheckupTracking } from './CheckupTracking';
import { CheckupOverview } from './CheckupOverview';

type CheckupTab = 'overview' | 'batteries' | 'requests' | 'tracking';

export function CheckupDashboard() {
  const [activeTab, setActiveTab] = useState<CheckupTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'batteries', label: 'Baterias', icon: Clipboard },
    { id: 'requests', label: 'Solicitações', icon: Users },
    { id: 'tracking', label: 'Acompanhamento', icon: Building2 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CheckupOverview />;
      case 'batteries':
        return <BatteryManagement />;
      case 'requests':
        return <CheckupRequests />;
      case 'tracking':
        return <CheckupTracking />;
      default:
        return <CheckupOverview />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Check-up</h1>
        <p className="text-gray-600">Gerencie baterias de exames e solicitações de check-up</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as CheckupTab)}
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