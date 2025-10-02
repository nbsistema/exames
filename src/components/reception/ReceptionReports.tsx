import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function ReceptionReports() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [observations, setObservations] = useState('');

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reportType: 'exams',
    status: '',
    paymentType: '',
  });

  useEffect(() => {
    loadReportData();
    loadUnits();
  }, [filters]);

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
      if (filters.reportType === 'exams') {
        let query = supabase
          .from('exam_requests')
          .select(`
            *,
            doctors(name),
            insurances(name),
            partners(name)
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59.999Z')
          .order('created_at', { ascending: false });

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.paymentType) {
          query = query.eq('payment_type', filters.paymentType);
        }

        const { data, error } = await query;
        if (error) throw error;
        setReportData(data || []);
      } else {
        const { data, error } = await supabase
          .from('checkup_requests')
          .select(`
            *,
            batteries(name),
            units(name)
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59.999Z')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReportData(data || []);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToUnit = async () => {
    if (!selectedCheckup || !selectedUnit) return;

    try {
      const { error } = await supabase
        .from('checkup_requests')
        .update({
          unit_id: selectedUnit,
          status: 'encaminhado',
          observations: observations,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckup.id);

      if (error) throw error;

      // Recarregar os dados
      await loadReportData();
      
      // Fechar o formulário
      setShowForwardForm(false);
      setSelectedCheckup(null);
      setSelectedUnit('');
      setObservations('');
      
      alert('Check-up encaminhado com sucesso!');
    } catch (error) {
      console.error('Error forwarding checkup:', error);
      alert('Erro ao encaminhar check-up');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'encaminhado':
      case 'solicitado':
        return 'bg-blue-100 text-blue-800';
      case 'executado':
        return 'bg-green-100 text-green-800';
      case 'intervencao':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabels = {
    encaminhado: 'Encaminhado ao CTR',
    executado: 'Executado',
    intervencao: 'Intervenção',
    solicitado: 'Solicitado'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Relatórios por Período</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros do Relatório
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relatório</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="exams">Exames</option>
              <option value="checkups">Check-ups</option>
            </select>
          </div>
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
          {filters.reportType === 'exams' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="encaminhado">Encaminhado</option>
                  <option value="executado">Executado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pagamento</label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="particular">Particular</option>
                  <option value="convenio">Convênio</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {showForwardForm && selectedCheckup && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Encaminhar para Unidade - {selectedCheckup.patient_name}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Destino</label>
              <select
                required
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma unidade</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observações adicionais (opcional)..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleForwardToUnit}
                disabled={!selectedUnit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Encaminhar para Unidade
              </button>
              <button
                onClick={() => {
                  setShowForwardForm(false);
                  setSelectedCheckup(null);
                  setSelectedUnit('');
                  setObservations('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {filters.reportType === 'exams' ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Médico
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exame
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo Pagamento
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bateria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidade
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  {filters.reportType === 'checkups' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
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
                    {filters.reportType === 'exams' ? (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.doctors?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.exam_type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.payment_type === 'particular' ? 'Particular' : `Convênio (${item.insurances?.name || 'N/A'})`}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.requesting_company}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.batteries?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.units?.name || 'Não encaminhado'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {statusLabels[item.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    {filters.reportType === 'checkups' && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.status === 'solicitado' && (
                          <button
                            onClick={() => {
                              setSelectedCheckup(item);
                              setShowForwardForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Encaminhar para Unidade"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
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
