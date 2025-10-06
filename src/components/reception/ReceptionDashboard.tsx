import React, { useState, useEffect } from 'react';
import { FileText, Activity, Users, Calendar } from 'lucide-react';
import { ExamTracking } from './ExamTracking';
import { CheckupTracking } from './CheckupTracking';
import { ReceptionReports } from './ReceptionReports';
import { ReceptionOverview } from './ReceptionOverview';
import { supabase } from '../../lib/supabase';

type ReceptionTab = 'overview' | 'exams' | 'checkups' | 'reports';

export function ReceptionDashboard() {
  const [activeTab, setActiveTab] = useState<ReceptionTab>('overview');
  const [examUpdateCount, setExamUpdateCount] = useState(0);
  const [checkupUpdateCount, setCheckupUpdateCount] = useState(0);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'exams', label: 'Acompanhamento de Exames', icon: FileText },
    { id: 'checkups', label: 'Acompanhamento Check-up', icon: Users },
    { id: 'reports', label: 'Relatórios', icon: Calendar },
  ];

  // Configurar real-time para monitorar mudanças
  useEffect(() => {
    const checkRealtimeStatus = async () => {
      try {
        // Testar conexão com ambas as tabelas
        const [examTest, checkupTest] = await Promise.all([
          supabase.from('exam_requests').select('id').limit(1),
          supabase.from('checkup_requests').select('id').limit(1)
        ]);
        
        if (!examTest.error && !checkupTest.error) {
          setIsRealTimeEnabled(true);
          setupRealtimeSubscriptions();
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

  const setupRealtimeSubscriptions = () => {
    try {
      // Subscription para exam_requests
      const examSubscription = supabase
        .channel('exam-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'exam_requests'
          },
          (payload) => {
            console.log('Mudança detectada em exam_requests:', payload);
            
            // Só incrementar se não estiver na aba de exames
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
            filter: 'status=eq.laudos_prontos' // Laudos prontos para exames
          },
          (payload) => {
            console.log('Laudo de exame pronto detectado:', payload);
            
            if (activeTab !== 'exams') {
              setExamUpdateCount(prev => prev + 1);
            }
          }
        )
        .subscribe((status) => {
          console.log('Status da subscription de exames:', status);
        });

      // Subscription para checkup_requests
      const checkupSubscription = supabase
        .channel('checkup-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'checkup_requests'
          },
          (payload) => {
            console.log('Mudança detectada em checkup_requests:', payload);
            
            // Só incrementar se não estiver na aba de checkups
            if (activeTab !== 'checkups') {
              setCheckupUpdateCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'checkup_requests',
            filter: 'status=eq.laudos_prontos' // Laudos prontos para checkups
          },
          (payload) => {
            console.log('Laudo de checkup pronto detectado:', payload);
            
            if (activeTab !== 'checkups') {
              setCheckupUpdateCount(prev => prev + 1);
            }
          }
        )
        .subscribe((status) => {
          console.log('Status da subscription de checkups:', status);
        });

    } catch (error) {
      console.error('Erro ao configurar real-time:', error);
      setupPolling();
    }
  };

  const setupPolling = () => {
    // Fallback: verificar atualizações a cada 30 segundos
    const interval = setInterval(async () => {
      try {
        // Verificar atualizações de exames
        if (activeTab !== 'exams') {
          const { data: examData, error: examError } = await supabase
            .from('exam_requests')
            .select('updated_at')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (!examError && examData && examData.length > 0) {
            // Lógica para detectar mudanças (simplificada)
            setExamUpdateCount(prev => prev + 1);
          }
        }

        // Verificar atualizações de checkups
        if (activeTab !== 'checkups') {
          const { data: checkupData, error: checkupError } = await supabase
            .from('checkup_requests')
            .select('updated_at')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (!checkupError && checkupData && checkupData.length > 0) {
            setCheckupUpdateCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  // Resetar contadores quando mudar para as abas respectivas
  useEffect(() => {
    if (activeTab === 'exams') {
      setExamUpdateCount(0);
    }
    if (activeTab === 'checkups') {
      setCheckupUpdateCount(0);
    }
  }, [activeTab]);

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

  const getTabLabelWithBadge = (tabId: string, label: string) => {
    let updateCount = 0;
    
    if (tabId === 'exams') {
      updateCount = examUpdateCount;
    } else if (tabId === 'checkups') {
      updateCount = checkupUpdateCount;
    }

    if (updateCount > 0) {
      return (
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {updateCount}
          </span>
        </div>
      );
    }

    return label;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel da Recepção</h1>
        <p className="text-gray-600">Acompanhe exames e check-ups dos pacientes</p>
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
              const hasUpdates = (tab.id === 'exams' && examUpdateCount > 0) || 
                               (tab.id === 'checkups' && checkupUpdateCount > 0);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ReceptionTab)}
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
