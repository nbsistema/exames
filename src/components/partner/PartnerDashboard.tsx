import React, { useState } from 'react';
import { Users, CreditCard, FileText, Activity } from 'lucide-react';
import { DoctorManagement } from './DoctorManagement';
import { InsuranceManagement } from './InsuranceManagement';
import { ExamManagement } from './ExamManagement';
import { PartnerOverview } from './PartnerOverview';

type PartnerTab = 'overview' | 'doctors' | 'insurances' | 'exams';

export function PartnerDashboard() {
  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'doctors', label: 'Médicos', icon: Users },
    { id: 'insurances', label: 'Convênios', icon: CreditCard },
    { id: 'exams', label: 'Encaminhamentos', icon: FileText },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PartnerOverview />;
      case 'doctors':
        return <DoctorManagement />;
      case 'insurances':
        return <InsuranceManagement />;
      case 'exams':
        return <ExamManagement />;
      default:
        return <PartnerOverview />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel do Parceiro</h1>
        <p className="text-gray-600">Gerencie médicos, convênios e encaminhamentos</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as PartnerTab)}
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