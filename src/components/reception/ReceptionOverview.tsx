import React, { useState, useEffect } from 'react';
import { FileText, Users, Clock, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subDays } from 'date-fns';

interface ReceptionStats {
  pendingExams: number;
  completedExams: number;
  pendingCheckups: number;
  completedCheckups: number;
  todayExams: number;
  todayCheckups: number;
  interventions: number;
}

interface RecentActivity {
  id: string;
  type: 'exam' | 'checkup';
  description: string;
  time: string;
  status: string;
}

export function ReceptionOverview() {
  const [stats, setStats] = useState<ReceptionStats>({
    pendingExams: 0,
    completedExams: 0,
    pendingCheckups: 0,
    completedCheckups: 0,
    todayExams: 0,
    todayCheckups: 0,
    interventions: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
    loadRecentActivities();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        pendingExamsRes, 
        completedExamsRes, 
        pendingCheckupsRes, 
        completedCheckupsRes,
        todayExamsRes,
        todayCheckupsRes,
        interventionsRes
      ] = await Promise.all([
        supabase.from('exam_requests').select('count', { count: 'exact' }).eq('status', 'encaminhado'),
        supabase.from('exam_requests').select('count', { count: 'exact' }).in('status', ['executado', 'intervencao']),
        supabase.from('checkup_requests').select('count', { count: 'exact' }).eq('status', 'solicitado'),
        supabase.from('checkup_requests').select('count', { count: 'exact' }).in('status', ['encaminhado', 'executado']),
        supabase
          .from('exam_requests')
          .select('count', { count: 'exact' })
          .gte('created_at', today + 'T00:00:00.000Z')
          .lte('created_at', today + 'T23:59:59.999Z'),
        supabase
          .from('checkup_requests')
          .select('count', { count: 'exact' })
          .gte('created_at', today + 'T00:00:00.000Z')
          .lte('created_at', today + 'T23:59:59.999Z'),
        supabase.from('exam_requests').select('count', { count: 'exact' }).eq('status', 'intervencao'),
      ]);

      setStats({
        pendingExams: pendingExamsRes.count || 0,
        completedExams: completedExamsRes.count || 0,
        pendingCheckups: pendingCheckupsRes.count || 0,
        completedCheckups: completedCheckupsRes.count || 0,
        todayExams: todayExamsRes.count || 0,
        todayCheckups: todayCheckupsRes.count || 0,
        interventions: interventionsRes.count || 0,
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];
      const last4Hours = subDays(new Date(), 0.17).toISOString(); // Últimas 4 horas

      // Carregar exames recentes
      const { data: recentExams } = await supabase
        .from('exam_requests')
        .select(`
          id,
          patient_name,
          status,
          created_at,
          updated_at,
          partners(name)
        `)
        .gte('updated_at', last4Hours)
        .order('updated_at', { ascending: false })
        .limit(8);

      recentExams?.forEach(exam => {
        const isNew = new Date(exam.created_at).getTime() === new Date(exam.updated_at).getTime();
        activities.push({
          id: exam.id,
          type: 'exam',
          description: isNew 
            ? `Novo exame recebido: ${exam.patient_name} - ${exam.partners?.name || 'Parceiro'}`
            : `Status atualizado: ${exam.patient_name} - ${getStatusLabel(exam.status)}`,
          time: exam.updated_at,
          status: exam.status,
        });
      });

      // Carregar check-ups recentes
      const { data: recentCheckups } = await supabase
        .from('checkup_requests')
        .select(`
          id,
          patient_name,
          status,
          requesting_company,
          created_at,
          updated_at
        `)
        .gte('updated_at', last4Hours)
        .order('updated_at', { ascending: false })
        .limit(8);

      recentCheckups?.forEach(checkup => {
        const isNew = new Date(checkup.created_at).getTime() === new Date(checkup.updated_at).getTime();
        activities.push({
          id: checkup.id,
          type: 'checkup',
          description: isNew
            ? `Check-up solicitado: ${checkup.patient_name} - ${checkup.requesting_company}`
            : `Check-up atualizado: ${checkup.patient_name} - ${getStatusLabel(checkup.status)}`,
          time: checkup.updated_at,
          status: checkup.status,
        });
      });

      // Ordenar por data e pegar os 10 mais recentes
      const sortedActivities = activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(false), loadRecentActivities()]);
    setRefreshing(false);
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      encaminhado: 'Encaminhado',
      executado: 'Executado',
      intervencao: 'Intervenção',
      solicitado: 'Solicitado',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getActivityColor = (type: string, status: string) => {
    if (type === 'checkup') return 'bg-purple-50 text-purple-600 border-purple-200';
    
    // Para exames, usar cor baseada no status
    switch (status) {
      case 'executado':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'intervencao':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      default:
        return 'bg-blue-50 text-blue-600 border-blue-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    return format(date, 'dd/MM HH:mm');
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const statCards = [
    { 
      label: 'Exames Pendentes', 
      value: stats.pendingExams, 
      icon: Clock, 
      color: 'bg-orange-500',
      change: `+${stats.todayExams} hoje`
    },
    { 
      label: 'Exames Processados', 
      value: stats.completedExams, 
      icon: CheckCircle, 
      color: 'bg-green-500',
      change: null
    },
    { 
      label: 'Check-ups Pendentes', 
      value: stats.pendingCheckups, 
      icon: Users, 
      color: 'bg-blue-500',
      change: `+${stats.todayCheckups} hoje`
    },
    { 
      label: 'Check-ups Processados', 
      value: stats.completedCheckups, 
      icon: FileText, 
      color: 'bg-purple-500',
      change: null
    },
    { 
      label: 'Intervenções', 
      value: stats.interventions, 
      icon: Activity, 
      color: 'bg-red-500',
      change: null
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Resumo da Recepção</h2>
          <p className="text-sm text-gray-600">
            Última atualização: {formatLastUpdate()} • 
            <span className="text-green-600 ml-1">Atualização automática a cada 30 segundos</span>
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className={`${stat.color} rounded-lg p-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                {stat.change && (
                  <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
            <p className="text-sm text-gray-600">Últimas 4 horas</p>
          </div>
          {refreshing && (
            <span className="flex items-center text-blue-600 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              Atualizando...
            </span>
          )}
        </div>
        <div className="p-6">
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type, activity.status)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {activity.type === 'exam' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs opacity-75">{formatTimeAgo(activity.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}