import React, { useState, useEffect } from 'react';
import { Users, CreditCard, FileText, Activity, BarChart3 } from 'lucide-react';
import { DoctorManagement } from './DoctorManagement';
import { InsuranceManagement } from './InsuranceManagement';
import { ExamManagement } from './ExamManagement';
import { PartnerOverview } from './PartnerOverview';
import { ExamReports } from './ExamReports';
import { supabase } from '../../lib/supabase';

type PartnerTab = 'overview' | 'doctors' | 'insurances' | 'exams' | 'reports';

export function PartnerDashboard() {
  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');
  const [examUpdateCount, setExamUpdateCount] = useState(0);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'doctors', label: 'Médicos', icon: Users },
    { id: 'insurances', label: 'Convênios', icon: CreditCard },
    { id: 'exams', label: 'Encaminhamentos', icon: FileText },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  // Configurar real-time para monitorar mudanças em exam_requests
  useEffect(() => {
    const checkRealtimeStatus = async () => {
      try {
        // Testar conexão com a tabela exam_requests
        const { data, error } = await supabase
          .from('exam_requests')
          .select('id')
          .limit(1);
        
        if (!error) {
          setIsRealTimeEnabled(true);
          setupRealtimeSubscription();
        }
      } catch (error) {
        console.warn('Real-time não disponível, usando polling:', error);
        setupPolling();
      }
    };

    checkRealtimeStatus();

    return () => {
      // Cleanup será feito automaticamente pelo Supabase
    };
  }, []);

  const setupRealtimeSubscription = () => {
    try {
      // Subscription para exam_requests - focado em status importantes para parceiros
      const examSubscription = supabase
        .channel('partner-exam-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'exam_requests'
          },
          (payload) => {
            console.log('Mudança detectada em exam_requests (parceiro):', payload);
            
            // Só incrementar se não estiver na aba de encaminhamentos
            if (activeTab !== 'exams') {
              setExamUpdateCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'exam_requests',
            filter: 'status=eq.laudos_prontos' // Laudos prontos
          },
          (payload) => {
            console.log('Laudo pronto detectado para parceiro:', payload);
            
            if (activeTab !== 'exams') {
              setExamUpdateCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'exam_requests',
            filter: 'status=eq.executado' // Exames executados
          },
          (payload) => {
            console.log('Exame executado detectado para parceiro:', payload);
            
            if (activeTab !== 'exams') {
              setExamUpdateCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT', // Novos encaminhamentos
            schema: 'public',
            table: 'exam_requests'
          },
          (payload) => {
            console.log('Novo encaminhamento detectado:', payload);
            
            if (activeTab !== 'exams') {
              setExamUpdateCount(prev => prev + 1);
            }
          }
        )
        .subscribe((status) => {
          console.log('Status da subscription de encaminhamentos:', status);
        });

    } catch (error) {
      console.error('Erro ao configurar real-time para parceiro:', error);
      setupPolling();
    }
  };

  const setupPolling = () => {
    // Fallback: verificar atualizações a cada 30 segundos
    const interval = setInterval(async () => {
      try {
        // Verificar atualizações de exames apenas se não estiver na aba de encaminhamentos
        if (activeTab !== 'exams') {
          const { data: examData, error: examError } = await supabase
            .from('exam_requests')
            .select('updated_at, status')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (!examError && examData && examData.length > 0) {
            // Lógica para detectar mudanças (simplificada)
            setExamUpdateCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Erro no polling do parceiro:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  // Resetar contador quando mudar para a aba de encaminhamentos
  useEffect(() => {
    if (activeTab === 'exams') {
      setExamUpdateCount(0);
    }
  }, [activeTab]);

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
      case 'reports':
        return <ExamReports />;
      default:
        return <PartnerOverview />;
    }
  };

  const getTabLabelWithBadge = (tabId: string, label: string) => {
    if (tabId === 'exams' && examUpdateCount > 0) {
      return (
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {examUpdateCount}
          </span>
        </div>
      );
    }

    return label;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel do Parceiro</h1>
        <p className="text-gray-600">Gerencie médicos, convênios, encaminhamentos e relatórios</p>
        {!isRealTimeEnabled && (
          <p className="text-yellow-600 text-sm mt-2">
            ⚠️ Modo offline - atualizações podem não ser em tempo real
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const hasUpdates = tab.id === 'exams' && examUpdateCount > 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as PartnerTab)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${hasUpdates ? 'animate-pulse' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>
                    {getTabLabelWithBadge(tab.id, tab.label)}
                  </span>
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
