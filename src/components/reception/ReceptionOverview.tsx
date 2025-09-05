import React, { useState, useEffect } from 'react';
import { FileText, Users, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReceptionStats {
  pendingExams: number;
  completedExams: number;
  pendingCheckups: number;
  completedCheckups: number;
}

export function ReceptionOverview() {
  const [stats, setStats] = useState<ReceptionStats>({
    pendingExams: 0,
    completedExams: 0,
    pendingCheckups: 0,
    completedCheckups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [pendingExamsRes, completedExamsRes, pendingCheckupsRes, completedCheckupsRes] = await Promise.all([
        supabase.from('exam_requests').select('count', { count: 'exact' }).eq('status', 'encaminhado'),
        supabase.from('exam_requests').select('count', { count: 'exact' }).in('status', ['executado', 'intervencao']),
        supabase.from('checkup_requests').select('count', { count: 'exact' }).eq('status', 'solicitado'),
        supabase.from('checkup_requests').select('count', { count: 'exact' }).in('status', ['encaminhado', 'executado']),
      ]);

      setStats({
        pendingExams: pendingExamsRes.count || 0,
        completedExams: completedExamsRes.count || 0,
        pendingCheckups: pendingCheckupsRes.count || 0,
        completedCheckups: completedCheckupsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Exames Pendentes', 
      value: stats.pendingExams, 
      icon: Clock, 
      color: 'bg-orange-500' 
    },
    { 
      label: 'Exames Processados', 
      value: stats.completedExams, 
      icon: CheckCircle, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Check-ups Pendentes', 
      value: stats.pendingCheckups, 
      icon: Users, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Check-ups Processados', 
      value: stats.completedCheckups, 
      icon: FileText, 
      color: 'bg-purple-500' 
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Resumo da Recepção</h2>
        <p className="text-gray-600">Acompanhe o status dos pedidos e atendimentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <p className="text-sm text-gray-700">Novo exame recebido de parceiro</p>
            <span className="text-xs text-gray-500 ml-auto">Há 5 min</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <p className="text-sm text-gray-700">Check-up encaminhado para unidade</p>
            <span className="text-xs text-gray-500 ml-auto">Há 15 min</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
            <p className="text-sm text-gray-700">Exame marcado como executado</p>
            <span className="text-xs text-gray-500 ml-auto">Há 30 min</span>
          </div>
        </div>
      </div>
    </div>
  );
}