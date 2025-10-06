import React, { useState, useEffect } from 'react';
import { Eye, Filter, X, Bell, Download, CheckCircle, Calendar, Search, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function CheckupTracking() {
  const [checkupRequests, setCheckupRequests] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    company: '',
    patientName: '',
  });
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [userProfile, setUserProfile] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<any>(null);
  const [checkupDate, setCheckupDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    birth_date: '',
    battery_id: '',
    requesting_company: '',
    exams_to_perform: [] as string[],
    checkup_date: '',
  });
  const [selectedBattery, setSelectedBattery] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadUserProfile();
    loadBatteries();
    loadCheckupRequests();
    
    // Auto-refresh a cada 1 minuto
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, [filters]);

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

  const loadCheckupRequests = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      let query = supabase
        .from('checkup_requests')
        .select(`
          *,
          batteries(name),
          units(name)
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.company) {
        query = query.ilike('requesting_company', `%${filters.company}%`);
      }

      if (filters.patientName) {
        query = query.ilike('patient_name', `%${filters.patientName}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCheckupRequests(data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading checkup requests:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadCheckupRequests(false);
    setRefreshing(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'laudos_prontos') {
        updateData.laudos_prontos_at = new Date().toISOString();
      } else if (newStatus === 'executado') {
        updateData.notificado_checkup_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('checkup_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await loadCheckupRequests(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const openDateModal = (checkup: any) => {
    setSelectedCheckup(checkup);
    setCheckupDate(checkup.checkup_date || '');
    setShowDateModal(true);
  };

  const saveCheckupDate = async () => {
    if (!selectedCheckup) return;

    try {
      const { error } = await supabase
        .from('checkup_requests')
        .update({
          checkup_date: checkupDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckup.id);

      if (error) throw error;

      setShowDateModal(false);
      setSelectedCheckup(null);
      setCheckupDate('');
      await loadCheckupRequests(false);
      
      alert('Data do checkup atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating checkup date:', error);
      alert('Erro ao atualizar data do checkup');
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

  const openExamsModal = (exams: string[]) => {
    setSelectedExams(exams);
    setShowExamsModal(true);
  };

  const canUpdateStatus = (currentStatus: string, newStatus: string) => {
    if (userProfile === 'recepcao') {
      return ['executado', 'laudos_prontos'].includes(newStatus);
    }
    
    if (userProfile === 'checkup') {
      return newStatus === 'executado';
    }
    
    return false;
  };

  const getStatusActions = (checkup: any) => {
    const actions = [];
    
    if (userProfile === 'recepcao' && checkup.status === 'encaminhado') {
      actions.push(
        {
          label: 'Marcar como Executado',
          status: 'executado',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'green'
        },
        {
          label: 'Laudos Prontos',
          status: 'laudos_prontos',
          icon: <Bell className="w-4 h-4" />,
          color: 'purple'
        }
      );
    }
    
    if (userProfile === 'checkup' && checkup.status === 'laudos_prontos') {
      actions.push({
        label: 'Buscar Laudos',
        status: 'executado',
        icon: <Download className="w-4 h-4" />,
        color: 'blue'
      });
    }
    
    return actions;
  };

  const handleBatterySelect = (batteryId: string) => {
    const battery = batteries.find(b => b.id === batteryId);
    setSelectedBattery(battery || null);
    setFormData({ 
      ...formData, 
      battery_id: batteryId,
      exams_to_perform: battery?.exams || []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const submitData = {
        ...formData,
        checkup_date: formData.checkup_date || null,
      };

      const { error } = await supabase
        .from('checkup_requests')
        .insert([submitData]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        patient_name: '',
        birth_date: '',
        battery_id: '',
        requesting_company: '',
        exams_to_perform: [],
        checkup_date: '',
      });
      setSelectedBattery(null);
      await loadCheckupRequests(false);
      alert('Solicitação de check-up criada com sucesso!');
    } catch (error) {
      console.error('Error creating checkup request:', error);
      alert('Erro ao criar solicitação');
    } finally {
      setFormLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      company: '',
      patientName: '',
    });
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Acompanhamento de Pedidos de Check-up</h2>
          <p className="text-sm text-gray-600">
            Última atualização: {formatLastUpdate()} • 
            <span className="text-green-600 ml-1">Atualização automática a cada 1 minuto</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Perfil: <span className="font-medium capitalize">{userProfile}</span>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
        </div>
      </div>

      {/* FORMULÁRIO DE NOVA SOLICITAÇÃO */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Solicitação de Check-up</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Paciente</label>
                <input
                  type="text"
                  required
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  required
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Solicitante</label>
                <input
                  type="text"
                  required
                  value={formData.requesting_company}
                  onChange={(e) => setFormData({ ...formData, requesting_company: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Checkup</label>
                <input
                  type="date"
                  value={formData.checkup_date}
                  onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Opcional"
                />
                <p className="text-xs text-gray-500 mt-1">Data prevista para realização do checkup (opcional)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bateria de Check-up</label>
                <select
                  required
                  value={formData.battery_id}
                  onChange={(e) => handleBatterySelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma bateria</option>
                  {batteries.map((battery) => (
                    <option key={battery.id} value={battery.id}>
                      {battery.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedBattery && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exames a Realizar</label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Bateria selecionada: <strong>{selectedBattery.name}</strong></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedBattery.exams.map((exam: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.exams_to_perform.includes(exam)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                exams_to_perform: [...formData.exams_to_perform, exam]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                exams_to_perform: formData.exams_to_perform.filter(e => e !== exam)
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{exam}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={formLoading || formData.exams_to_perform.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {formLoading ? 'Criando...' : 'Criar Solicitação'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ 
                    patient_name: '', 
                    birth_date: '', 
                    battery_id: '', 
                    requesting_company: '', 
                    exams_to_perform: [],
                    checkup_date: '' 
                  });
                  setSelectedBattery(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </h3>
          {(filters.status || filters.company || filters.patientName) && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Paciente</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.patientName}
                onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por paciente..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="solicitado">Solicitado</option>
              <option value="encaminhado">Encaminhado</option>
              <option value="executado">Executado</option>
              <option value="laudos_prontos">Laudos Prontos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input
              type="text"
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Filtrar por empresa..."
            />
          </div>
        </div>
        
        {/* Contador de resultados */}
        <div className="mt-3 text-xs text-gray-600">
          {checkupRequests.length} resultado(s) encontrado(s)
          {(filters.status || filters.company || filters.patientName) && (
            <span className="ml-2">
              • Filtros aplicados: 
              {filters.patientName && ` Paciente: "${filters.patientName}"`}
              {filters.status && ` Status: ${statusLabels[filters.status as keyof typeof statusLabels]}`}
              {filters.company && ` Empresa: "${filters.company}"`}
            </span>
          )}
        </div>
      </div>

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
                    Data do Checkup
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          <button
                            onClick={() => openExamsModal(checkup.exams_to_perform)}
                            className="text-left hover:text-blue-600 transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>
                                {checkup.exams_to_perform.length} exame
                                {checkup.exams_to_perform.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {checkup.exams_to_perform.slice(0, 2).join(', ')}
                              {checkup.exams_to_perform.length > 2 && ` ...`}
                            </div>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {checkup.checkup_date ? (
                            <span className="text-green-600 font-medium">
                              {new Date(checkup.checkup_date).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">Não agendado</span>
                          )}
                          <button
                            onClick={() => openDateModal(checkup)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Definir data do checkup"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(checkup.status)}`}>
                          {statusLabels[checkup.status as keyof typeof statusLabels]}
                        </span>
                        {checkup.laudos_prontos_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Laudos: {new Date(checkup.laudos_prontos_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(checkup.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-2">
                          {statusActions.map((action, index) => (
                            <button
                              key={index}
                              onClick={() => updateStatus(checkup.id, action.status)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-${action.color}-100 text-${action.color}-800 hover:bg-${action.color}-200 transition-colors`}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          ))}
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

      {/* Modal para exibir todos os exames */}
      {showExamsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                Exames Solicitados ({selectedExams.length})
              </h3>
              <button
                onClick={() => setShowExamsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedExams.map((exam, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center justify-center mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{exam}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => setShowExamsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para definir data do checkup */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                Definir Data do Checkup
              </h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paciente: <span className="font-semibold">{selectedCheckup?.patient_name}</span>
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Checkup
                </label>
                <input
                  type="date"
                  value={checkupDate}
                  onChange={(e) => setCheckupDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowDateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCheckupDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
