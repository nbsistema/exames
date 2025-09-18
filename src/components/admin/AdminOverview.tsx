import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import { Users, Building2, Activity, FileText, Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalPartners: number;
  totalExams: number;
  totalCheckups: number;
  totalInterventions: number;
  totalUsers: number;
  todayExams: number;
  todayCheckups: number;
  pendingExams: number;
  completedExams: number;
}

interface RecentActivity {
  id: string;
  type: 'exam' | 'checkup' | 'user';
  description: string;
  time: string;
  status?: string;
}

export function AdminOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPartners: 0,
    totalExams: 0,
    totalCheckups: 0,
    totalInterventions: 0,
    totalUsers: 0,
    todayExams: 0,
    todayCheckups: 0,
    pendingExams: 0,
    completedExams: 0,
  });
  const [period, setPeriod] = useState(3); // 3 months by default
  const [chartData, setChartData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadRecentActivities();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(() => {
      loadDashboardData();
      loadRecentActivities();
    }, 30000);

    return () => clearInterval(interval);
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      const startDate = startOfMonth(subMonths(new Date(), period));
      const endDate = endOfMonth(new Date());
      const today = new Date().toISOString().split('T')[0];

      // Load stats
      const [
        partnersRes, 
        examsRes, 
        checkupsRes, 
        usersRes,
        todayExamsRes,
        todayCheckupsRes,
        pendingExamsRes,
        completedExamsRes
      ] = await Promise.all([
        supabase.from('partners').select('count', { count: 'exact' }),
        supabase
          .from('exam_requests')
          .select('count', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('checkup_requests')
          .select('count', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase.from('users').select('count', { count: 'exact' }),
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
        supabase
          .from('exam_requests')
          .select('count', { count: 'exact' })
          .eq('status', 'encaminhado'),
        supabase
          .from('exam_requests')
          .select('count', { count: 'exact' })
          .eq('status', 'executado'),
      ]);

      const interventionsRes = await supabase
        .from('exam_requests')
        .select('count', { count: 'exact' })
        .eq('status', 'intervencao')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      setStats({
        totalPartners: partnersRes.count || 0,
        totalExams: examsRes.count || 0,
        totalCheckups: checkupsRes.count || 0,
        totalInterventions: interventionsRes.count || 0,
        totalUsers: usersRes.count || 0,
        todayExams: todayExamsRes.count || 0,
        todayCheckups: todayCheckupsRes.count || 0,
        pendingExams: pendingExamsRes.count || 0,
        completedExams: completedExamsRes.count || 0,
      });

      // Load chart data for exams by partner
      const { data: examsByPartner } = await supabase
        .from('exam_requests')
        .select(`
          partner_id,
          partners(name),
          status
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Process chart data
      const partnerStats = examsByPartner?.reduce((acc: any, exam: any) => {
        const partnerName = exam.partners?.name || 'Desconhecido';
        if (!acc[partnerName]) {
          acc[partnerName] = { name: partnerName, encaminhado: 0, executado: 0, intervencao: 0 };
        }
        acc[partnerName][exam.status]++;
        return acc;
      }, {});

      setChartData(Object.values(partnerStats || {}));

      // Load status distribution
      const statusDistribution = examsByPartner?.reduce((acc: any, exam: any) => {
        acc[exam.status] = (acc[exam.status] || 0) + 1;
        return acc;
      }, {});

      const statusColors = {
        encaminhado: '#3B82F6',
        executado: '#10B981',
        intervencao: '#F59E0B'
      };

      const statusLabels = {
        encaminhado: 'Encaminhado',
        executado: 'Executado',
        intervencao: 'Intervenção'
      };

      const pieData = Object.entries(statusDistribution || {}).map(([status, count]: [string, any]) => ({
        name: statusLabels[status as keyof typeof statusLabels],
        value: count,
        fill: statusColors[status as keyof typeof statusColors]
      }));

      setStatusData(pieData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];
      const last24Hours = subDays(new Date(), 1).toISOString();

      // Carregar exames recentes
      const { data: recentExams } = await supabase
        .from('exam_requests')
        .select(`
          id,
          patient_name,
          status,
          created_at,
          partners(name)
        `)
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false })
        .limit(5);

      recentExams?.forEach(exam => {
        activities.push({
          id: exam.id,
          type: 'exam',
          description: `Novo exame para ${exam.patient_name} - ${exam.partners?.name || 'Parceiro'}`,
          time: exam.created_at,
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
          created_at
        `)
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false })
        .limit(5);

      recentCheckups?.forEach(checkup => {
        activities.push({
          id: checkup.id,
          type: 'checkup',
          description: `Check-up solicitado para ${checkup.patient_name} - ${checkup.requesting_company}`,
          time: checkup.created_at,
          status: checkup.status,
        });
      });

      // Carregar usuários recentes
      const { data: recentUsers } = await supabase
        .from('users')
        .select('id, name, profile, created_at')
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false })
        .limit(3);

      recentUsers?.forEach(user => {
        activities.push({
          id: user.id,
          type: 'user',
          description: `Novo usuário cadastrado: ${user.name} (${user.profile})`,
          time: user.created_at,
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return <FileText className="w-4 h-4" />;
      case 'checkup':
        return <Activity className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string, status?: string) => {
    if (type === 'user') return 'bg-purple-50 text-purple-600 border-purple-200';
    if (type === 'checkup') return 'bg-blue-50 text-blue-600 border-blue-200';
    
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
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const statCards = [
    { 
      label: 'Total de Parceiros', 
      value: stats.totalPartners, 
      icon: Building2, 
      color: 'bg-blue-500',
      change: null
    },
    { 
      label: 'Exames no Período', 
      value: stats.totalExams, 
      icon: FileText, 
      color: 'bg-green-500',
      change: `+${stats.todayExams} hoje`
    },
    { 
      label: 'Check-ups no Período', 
      value: stats.totalCheckups, 
      icon: Activity, 
      color: 'bg-purple-500',
      change: `+${stats.todayCheckups} hoje`
    },
    { 
      label: 'Intervenções no Período', 
      value: stats.totalInterventions, 
      icon: AlertTriangle, 
      color: 'bg-orange-500',
      change: null
    },
    { 
      label: 'Usuários Cadastrados', 
      value: stats.totalUsers, 
      icon: Users, 
      color: 'bg-indigo-500',
      change: null
    },
    { 
      label: 'Exames Pendentes', 
      value: stats.pendingExams, 
      icon: Clock, 
      color: 'bg-yellow-500',
      change: null
    },
    { 
      label: 'Exames Concluídos', 
      value: stats.completedExams, 
      icon: CheckCircle, 
      color: 'bg-emerald-500',
      change: null
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Visão Geral do Sistema</h2>
          <p className="text-sm text-gray-600">Última atualização: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={1}>Último mês</option>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último ano</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exames por Parceiro</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="encaminhado" fill="#3B82F6" name="Encaminhado" />
                  <Bar dataKey="executado" fill="#10B981" name="Executado" />
                  <Bar dataKey="intervencao" fill="#F59E0B" name="Intervenção" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
              <p className="text-sm text-gray-600">Últimas 24 horas</p>
            </div>
            <div className="p-6">
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade recente</p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type, activity.status)}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
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
        </>
      )}
    </div>
  );
}