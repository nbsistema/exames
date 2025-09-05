import React, { useState } from 'react';
import { FileText, Activity, Users, Calendar } from 'lucide-react';
import { ExamTracking } from './ExamTracking';
import { CheckupTracking } from './CheckupTracking';
import { ReceptionReports } from './ReceptionReports';
import { ReceptionOverview } from './ReceptionOverview';

type ReceptionTab = 'overview' | 'exams' | 'checkups' | 'reports';

export function ReceptionDashboard() {
  const [activeTab, setActiveTab] = useState<ReceptionTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'exams', label: 'Acompanhamento de Exames', icon: FileText },
    { id: 'checkups', label: 'Acompanhamento Check-up', icon: Users },
    { id: 'reports', label: 'Relatórios', icon: Calendar },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ReceptionOverview />;
      case 'exams':
        return <ExamTracking />;
      case 'checkups':
        return <CheckupTracking />;
      case 'reports':
        return <ReceptionReports />;
      default:
        return <ReceptionOverview />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel da Recepção</h1>
        <p className="text-gray-600">Acompanhe exames e check-ups dos pacientes</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ReceptionTab)}
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