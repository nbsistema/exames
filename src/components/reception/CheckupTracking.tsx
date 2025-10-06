import React, { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, RefreshCw, Bell, Download, CheckCircle } from 'lucide-react';
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
  const [userProfile, setUserProfile] = useState<string>('');

  useEffect(() => {
    loadUserProfile();
    loadData();
    
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('profile')
          .eq('id', user.id)
          .single();
        setUserProfile(profile?.profile || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

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

  // 🔥 CORRIGIDO: Checkup encaminha para unidade
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

  // 🔥 CORRIGIDO: Funções de atualização de status por perfil
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'executado') {
        updateData.executado_at = new Date().toISOString();
      } else if (newStatus === 'laudos_prontos') {
        updateData.laudos_prontos_at = new Date().toISOString();
      } else if (newStatus === 'encaminhado') {
        updateData.laudos_buscados_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('checkup_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await loadData(false);
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
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
      laudos_prontos: checkupRequests.filter(c => c.status === 'laudos_prontos').length,
    };
  };

  // 🔥 CORRIGIDO: Ações por perfil conforme o fluxo correto
  const getStatusActions = (checkup: any) => {
    const actions = [];
    
    // CHECKUP: Pode encaminhar para unidade (solicitado → encaminhado)
    if (userProfile === 'checkup' && checkup.status === 'solicitado') {
      actions.push({
        label: 'Encaminhar para Unidade',
        status: 'encaminhado',
        icon: <ArrowRight className="w-4 h-4" />,
        color: 'blue'
      });
    }
    
    // RECEPÇÃO: Pode marcar como executado (encaminhado → executado)
    if (userProfile === 'recepcao' && checkup.status === 'encaminhado') {
      actions.push({
        label: 'Marcar como Executado',
        status: 'executado',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'green'
      });
    }
    
    // RECEPÇÃO: Pode sinalizar laudos prontos (executado → laudos_prontos)
    if (userProfile === 'recepcao' && checkup.status === 'executado') {
      actions.push({
        label: 'Laudos Prontos',
        status: 'laudos_prontos',
        icon: <Bell className="w-4 h-4" />,
        color: 'purple'
      });
    }
    
    // CHECKUP: Pode buscar laudos (laudos_prontos → encaminhado)
    if (userProfile === 'checkup' && checkup.status === 'laudos_prontos') {
      actions.push({
        label: 'Buscar Laudos',
        status: 'encaminhado', // Volta para encaminhado indicando que foi buscado
        icon: <Download className="w-4 h-4" />,
        color: 'blue'
      });
    }
    
    return actions;
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
          <div className="text-sm text-gray-500 mt-1">
            Perfil: <span className="font-medium capitalize">{userProfile}</span>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{checkupRequests.length}</div>
          <div className="text-sm text-gray-600">Total</div>
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
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{statusCounts.laudos_prontos}</div>
          <div className="text-sm text-gray-600">Laudos Prontos</div>
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
                    Data Nasc.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bateria
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
                {checkupRequests.map((checkup) => {
                  const statusActions = getStatusActions(checkup);
                  
                  return (
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(checkup.status)}`}>
                            {statusLabels[checkup.status as keyof typeof statusLabels]}
                          </span>
                          {checkup.laudos_prontos_at && (
                            <div className="text-xs text-gray-500">
                              Laudos prontos: {new Date(checkup.laudos_prontos_at).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkup.units?.name || 'Não definida'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(checkup.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-2">
                          {/* Botão de encaminhar (apenas para checkup) */}
                          {userProfile === 'checkup' && checkup.status === 'solicitado' && (
                            <button
                              onClick={() => {
                                setSelectedCheckup(checkup);
                                setShowForwardForm(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                              title="Encaminhar para Unidade"
                            >
                              <ArrowRight className="w-3 h-3" />
                              Encaminhar
                            </button>
                          )}

                          {/* Ações de status */}
                          {statusActions.map((action, index) => (
                            <button
                              key={index}
                              onClick={() => updateStatus(checkup.id, action.status)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-${action.color}-100 text-${action.color}-800 hover:bg-${action.color}-200 transition-colors`}
                              title={action.label}
                            >
                              {action.icon}
                              {action.label.includes('Laudos') ? 'Laudos' : 
                               action.label.includes('Buscar') ? 'Buscar' : 
                               action.label.includes('Executado') ? 'Executado' : 'Encaminhar'}
                            </button>
                          ))}

                          {/* Observações */}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
