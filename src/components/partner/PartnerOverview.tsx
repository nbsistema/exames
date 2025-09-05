import React, { useState, useEffect } from 'react';
import { FileText, Users, CreditCard, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PartnerStats {
  totalExams: number;
  totalDoctors: number;
  totalInsurances: number;
  pendingExams: number;
}

export function PartnerOverview() {
  const [stats, setStats] = useState<PartnerStats>({
    totalExams: 0,
    totalDoctors: 0,
    totalInsurances: 0,
    pendingExams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Note: In a real implementation, you would filter by the current partner's ID
      const [examsRes, doctorsRes, insurancesRes, pendingRes] = await Promise.all([
        supabase.from('exam_requests').select('count', { count: 'exact' }),
        supabase.from('doctors').select('count', { count: 'exact' }),
        supabase.from('insurances').select('count', { count: 'exact' }),
        supabase.from('exam_requests').select('count', { count: 'exact' }).eq('status', 'encaminhado'),
      ]);

      setStats({
        totalExams: examsRes.count || 0,
        totalDoctors: doctorsRes.count || 0,
        totalInsurances: insurancesRes.count || 0,
        pendingExams: pendingRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Total de Exames', 
      value: stats.totalExams, 
      icon: FileText, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Médicos Cadastrados', 
      value: stats.totalDoctors, 
      icon: Users, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Convênios', 
      value: stats.totalInsurances, 
      icon: CreditCard, 
      color: 'bg-purple-500' 
    },
    { 
      label: 'Exames Pendentes', 
      value: stats.pendingExams, 
      icon: TrendingUp, 
      color: 'bg-orange-500' 
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
        <h2 className="text-xl font-semibold text-gray-900">Resumo do Parceiro</h2>
        <p className="text-gray-600">Visão geral das suas atividades</p>
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
            <Users className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Cadastrar Médico</h4>
            <p className="text-sm text-gray-600">Adicione novos médicos ao sistema</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <CreditCard className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Gerenciar Convênios</h4>
            <p className="text-sm text-gray-600">Configure os convênios aceitos</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <FileText className="w-8 h-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Encaminhar Exame</h4>
            <p className="text-sm text-gray-600">Envie novos exames para análise</p>
          </div>
        </div>
      </div>
    </div>
  );
}