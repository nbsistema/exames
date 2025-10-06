import React, { useState, useEffect } from 'react';
import { Eye, Filter, X, Bell, Download, CheckCircle, Calendar, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function CheckupTracking() {
  const [checkupRequests, setCheckupRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    company: '',
    patientName: '', // Novo filtro adicionado
  });
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [userProfile, setUserProfile] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<any>(null);
  const [checkupDate, setCheckupDate] = useState('');

  useEffect(() => {
    loadCheckupRequests();
    loadUserProfile();
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

  const loadCheckupRequests = async () => {
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
    } catch (error) {
      console.error('Error loading checkup requests:', error);
    } finally {
      setLoading(false);
    }
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

      loadCheckupRequests();
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
      loadCheckupRequests();
      
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

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setFilters({
      status: '',
      company: '',
      patientName: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Acompanhamento de Pedidos de Check-up</h2>
        <div className="text-sm text-gray-500">
          Perfil: <span className="font-medium capitalize">{userProfile}</span>
        </div>
      </div>

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
                  <th className="px-4py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
