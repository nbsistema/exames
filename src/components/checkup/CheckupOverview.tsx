import React, { useState, useEffect } from 'react';
import { Clipboard, Users, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CheckupStats {
  totalBatteries: number;
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
}

export function CheckupOverview() {
  const [stats, setStats] = useState<CheckupStats>({
    totalBatteries: 0,
    totalRequests: 0,
    completedRequests: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [batteriesRes, requestsRes, completedRes, pendingRes] = await Promise.all([
        supabase.from('batteries').select('count', { count: 'exact' }),
        supabase.from('checkup_requests').select('count', { count: 'exact' }),
        supabase.from('checkup_requests').select('count', { count: 'exact' }).eq('status', 'executado'),
        supabase.from('checkup_requests').select('count', { count: 'exact' }).eq('status', 'solicitado'),
      ]);

      setStats({
        totalBatteries: batteriesRes.count || 0,
        totalRequests: requestsRes.count || 0,
        completedRequests: completedRes.count || 0,
        pendingRequests: pendingRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Baterias Cadastradas', 
      value: stats.totalBatteries, 
      icon: Clipboard, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Total de Solicitações', 
      value: stats.totalRequests, 
      icon: Users, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Check-ups Pendentes', 
      value: stats.pendingRequests, 
      icon: Clock, 
      color: 'bg-orange-500' 
    },
    { 
      label: 'Check-ups Concluídos', 
      value: stats.completedRequests, 
      icon: CheckCircle, 
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
        <h2 className="text-xl font-semibold text-gray-900">Resumo Check-up</h2>
        <p className="text-gray-600">Visão geral das atividades de check-up</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <Clipboard className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Criar Bateria</h4>
            <p className="text-sm text-gray-600">Configure nova bateria de exames</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Nova Solicitação</h4>
            <p className="text-sm text-gray-600">Registre novo pedido de check-up</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <CheckCircle className="w-8 h-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Acompanhar Pedidos</h4>
            <p className="text-sm text-gray-600">Veja o status dos check-ups</p>
          </div>
        </div>
      </div>
    </div>
  );
}