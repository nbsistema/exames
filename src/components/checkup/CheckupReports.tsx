import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, FileText, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function CheckupReports() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingExport, setGeneratingExport] = useState(false);

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: '',
    company: '',
    batteryId: '',
    unitId: '',
  });

  useEffect(() => {
    loadReportData();
    loadBatteries();
    loadUnits();
  }, [filters]);

  const loadBatteries = async () => {
    try {
      const { data, error } = await supabase
        .from('batteries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBatteries(data || []);
    } catch (error) {
      console.error('Error loading batteries:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('checkup_requests')
        .select(`
          *,
          batteries(name),
          units(name)
        `)
        .gte('created_at', filters.startDate + 'T00:00:00')
        .lte('created_at', filters.endDate + 'T23:59:59.999Z')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.company) {
        query = query.ilike('requesting_company', `%${filters.company}%`);
      }

      if (filters.batteryId) {
        query = query.eq('battery_id', filters.batteryId);
      }

      if (filters.unitId) {
        query = query.eq('unit_id', filters.unitId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReportData(data || []);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado':
        return 'bg-yellow-100 text-yellow-800';
      case 'encaminhado':
        return 'bg-blue-100 text-blue-800';
      case 'executado':
        return 'bg-green-100 text-green-800';
      case 'laudos_prontos':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabels = {
    solicitado: 'Solicitado',
    encaminhado: 'Encaminhado',
    executado: 'Executado',
    laudos_prontos: 'Laudos Prontos'
  };

  // Exportar para Excel
  const exportToExcel = async () => {
    setGeneratingExport(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(reportData.map(item => ({
        'Paciente': item.patient_name,
        'Data Nascimento': new Date(item.birth_date).toLocaleDateString('pt-BR'),
        'Empresa Solicitante': item.requesting_company,
        'Bateria': item.batteries?.name || 'N/A',
        'Unidade': item.units?.name || 'Não encaminhado',
        'Status': statusLabels[item.status as keyof typeof statusLabels],
        'Data Checkup': item.checkup_date ? new Date(item.checkup_date).toLocaleDateString('pt-BR') : 'Não agendado',
        'Data Criação': new Date(item.created_at).toLocaleDateString('pt-BR'),
        'Exames Solicitados': item.exams_to_perform?.join(', ') || '',
        'Observações': item.observations || '',
        'Data Laudos Prontos': item.laudos_prontos_at ? new Date(item.laudos_prontos_at).toLocaleDateString('pt-BR') : '',
        'Data Notificação': item.notificado_checkup_at ? new Date(item.notificado_checkup_at).toLocaleDateString('pt-BR') : ''
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Checkup');
      
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `relatorio_checkup_${date}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Erro ao exportar para Excel');
    } finally {
      setGeneratingExport(false);
    }
  };

  // Exportar para PDF
  const exportToPDF = async () => {
    setGeneratingExport(true);
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text('Relatório de Check-ups', 14, 15);
      
      // Período do relatório
      doc.setFontSize(10);
      let periodText = 'Período: ';
      periodText += `${new Date(filters.startDate).toLocaleDateString('pt-BR')} à ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`;
      doc.text(periodText, 14, 25);
      
      // Filtros aplicados
      let filtersText = 'Filtros: ';
      const activeFilters = [];
      if (filters.status) activeFilters.push(`Status: ${statusLabels[filters.status as keyof typeof statusLabels]}`);
      if (filters.company) activeFilters.push(`Empresa: ${filters.company}`);
      if (filters.batteryId) {
        const battery = batteries.find(b => b.id === filters.batteryId);
        if (battery) activeFilters.push(`Bateria: ${battery.name}`);
      }
      if (filters.unitId) {
        const unit = units.find(u => u.id === filters.unitId);
        if (unit) activeFilters.push(`Unidade: ${unit.name}`);
      }
      doc.text(filtersText + (activeFilters.length > 0 ? activeFilters.join(', ') : 'Nenhum'), 14, 35);

      // Dados da tabela
      const tableData = reportData.map(item => [
        item.patient_name,
        new Date(item.birth_date).toLocaleDateString('pt-BR'),
        item.requesting_company,
        item.batteries?.name || 'N/A',
        item.units?.name || 'Não encaminhado',
        statusLabels[item.status as keyof typeof statusLabels],
        item.checkup_date ? new Date(item.checkup_date).toLocaleDateString('pt-BR') : 'Não agendado',
        new Date(item.created_at).toLocaleDateString('pt-BR')
      ]);

      doc.autoTable({
        startY: 45,
        head: [['Paciente', 'Nascimento', 'Empresa', 'Bateria', 'Unidade', 'Status', 'Data Checkup', 'Criado em']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { top: 45 }
      });

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Gerado em ${new Date().toLocaleDateString('pt-BR')} - Página ${i} de ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      // Salvar PDF
      const date = new Date().toISOString().split('T')[0];
      doc.save(`relatorio_checkup_${date}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Erro ao exportar para PDF');
    } finally {
      setGeneratingExport(false);
    }
  };

  const getStats = () => {
    const stats = {
      total: reportData.length,
      solicitado: reportData.filter(item => item.status === 'solicitado').length,
      encaminhado: reportData.filter(item => item.status === 'encaminhado').length,
      executado: reportData.filter(item => item.status === 'executado').length,
      laudos_prontos: reportData.filter(item => item.status === 'laudos_prontos').length,
    };
    return stats;
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Relatórios de Check-up</h2>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            disabled={reportData.length === 0 || generatingExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>{generatingExport ? 'Exportando...' : 'Excel'}</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={reportData.length === 0 || generatingExport}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>{generatingExport ? 'Exportando...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.solicitado}</div>
          <div className="text-sm text-gray-600">Solicitados</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.encaminhado}</div>
          <div className="text-sm text-gray-600">Encaminhados</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{stats.laudos_prontos}</div>
          <div className="text-sm text-gray-600">Laudos Prontos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.executado}</div>
          <div className="text-sm text-gray-600">Executados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros do Relatório
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="solicitado">Solicitado</option>
              <option value="encaminhado">Encaminhado</option>
              <option value="laudos_prontos">Laudos Prontos</option>
              <option value="executado">Executado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Solicitante</label>
            <input
              type="text"
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Filtrar por empresa..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bateria</label>
            <select
              value={filters.batteryId}
              onChange={(e) => setFilters({ ...filters, batteryId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas as baterias</option>
              {batteries.map((battery) => (
                <option key={battery.id} value={battery.id}>
                  {battery.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
            <select
              value={filters.unitId}
              onChange={(e) => setFilters({ ...filters, unitId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas as unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {reportData.length} registro(s) encontrado(s)
          </span>
          <button
            onClick={loadReportData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Nascimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bateria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Checkup
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.patient_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.birth_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.requesting_company}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.batteries?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.units?.name || 'Não encaminhado'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.checkup_date ? (
                        <span className="text-green-600 font-medium">
                          {new Date(item.checkup_date).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-gray-400">Não agendado</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {statusLabels[item.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
