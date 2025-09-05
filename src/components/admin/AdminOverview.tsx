import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import { Users, Building2, Activity, FileText, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalPartners: number;
  totalExams: number;
  totalCheckups: number;
  totalInterventions: number;
}

export function AdminOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPartners: 0,
    totalExams: 0,
    totalCheckups: 0,
    totalInterventions: 0,
  });
  const [period, setPeriod] = useState(3); // 3 months by default
  const [chartData, setChartData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      const startDate = startOfMonth(subMonths(new Date(), period));
      const endDate = endOfMonth(new Date());

      // Load stats
      const [partnersRes, examsRes, checkupsRes] = await Promise.all([
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

  const statCards = [
    { 
      label: 'Total de Parceiros', 
      value: stats.totalPartners, 
      icon: Building2, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Exames no Período', 
      value: stats.totalExams, 
      icon: FileText, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Check-ups no Período', 
      value: stats.totalCheckups, 
      icon: Activity, 
      color: 'bg-purple-500' 
    },
    { 
      label: 'Intervenções no Período', 
      value: stats.totalInterventions, 
      icon: Users, 
      color: 'bg-orange-500' 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Visão Geral do Sistema</h2>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
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
        </>
      )}
    </div>
  );
}