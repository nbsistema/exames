import React, { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, RefreshCw } from 'lucide-react';
import { supabase, Unit } from '../../lib/supabase';

export function CheckupTracking() {
  const [checkupRequests, setCheckupRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [observations, setObservations] = useState('');
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    
    // Auto-refresh a cada 1 minuto
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      const [checkupsRes, unitsRes] = await Promise.all([
        supabase
          .from('checkup_requests')
          .select(`
            *,
            batteries(name),
            units(name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('units').select('*').order('name'),
      ]);

      if (checkupsRes.error) throw checkupsRes.error;
      if (unitsRes.error) throw unitsRes.error;

      setCheckupRequests(checkupsRes.data || []);
      setUnits(unitsRes.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
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
        })
        .eq('id', selectedCheckup.id);

      if (error) throw error;

      await loadData(false);
      setShowForwardForm(false);
      setSelectedCheckup(null);
      setSelectedUnit('');
      setObservations('');
      alert('Check-up encaminhado para unidade com sucesso!');
    } catch (error) {
      console.error('Error forwarding checkup:', error);
      alert('Erro ao encaminhar check-up');
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabels = {
    solicitado: 'Solicitado',
    encaminhado: 'Encaminhado',
    executado: 'Executado'
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusCounts = () => {
    return {
      solicitado: checkupRequests.filter(c => c.status === 'solicitado').length,
      encaminhado: checkupRequests.filter(c => c.status === 'encaminhado').length,
      executado: checkupRequests.filter(c => c.status === 'executado').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Acompanhamento de Check-up</h2>
          <p className="text-sm text-gray-600">
            Última atualização: {formatLastUpdate()} • 
            <span className="text-green-600 ml-1">Atualização automática a cada 1 minuto</span>
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

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{checkupRequests.length}</div>
          <div className="text-sm text-gray-600">Total de Check-ups</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{statusCounts.solicitado}</div>
          <div className="text-sm text-gray-600">Solicitados</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.encaminhado}</div>
          <div className="text-sm text-gray-600">Encaminhados</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{statusCounts.executado}</div>
          <div className="text-sm text-gray-600">Executados</div>
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
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Check-ups ({checkupRequests.length} registros)
            </h3>
            <div className="text-sm text-gray-600">
              {refreshing && (
                <span className="flex items-center text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                  Atualizando...
                </span>
              )}
            </div>
          </div>
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
                    Empresa Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bateria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exames
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checkupRequests.map((checkup) => (
                  <tr key={checkup.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {checkup.patient_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(checkup.birth_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkup.requesting_company}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkup.batteries?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="max-w-xs">
                        {checkup.exams_to_perform?.slice(0, 2).join(', ')}
                        {checkup.exams_to_perform?.length > 2 && ` +${checkup.exams_to_perform.length - 2} mais`}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(checkup.status)}`}>
                        {statusLabels[checkup.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {checkup.units?.name || 'Não encaminhado'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(checkup.created_at).toLocaleDateString('pt-BR')} {new Date(checkup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {checkup.status === 'solicitado' && (
                          <button
                            onClick={() => {
                              setSelectedCheckup(checkup);
                              setShowForwardForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Encaminhar para Unidade"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        {checkup.observations && (
                          <button
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title={`Observações: ${checkup.observations}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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