import React, { useState, useEffect } from 'react';
import { Eye, Edit, Filter, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function ExamTracking() {
  const [examRequests, setExamRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showConduct, setShowConduct] = useState(false);
  const [conductData, setConductData] = useState({
    conduct: '' as 'cirurgica' | 'ambulatorial' | '',
    conduct_observations: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    paymentType: '',
    patientName: '',
    conduct: ''
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<string>('');
  const [userPartnerId, setUserPartnerId] = useState<string | null>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    loadExamRequests();
  
    // Auto-refresh a cada 1 minuto
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, [filters, userProfile, userPartnerId]);

  // Função para carregar informações do usuário logado
  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('profile, partner_id')
          .eq('id', user.id)
          .single();
      
        if (userData) {
          setUserProfile(userData.profile || '');
          setUserPartnerId(userData.partner_id);
          console.log('👤 Usuário logado:', {
            profile: userData.profile,
            partnerId: userData.partner_id
          });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadExamRequests = async (showLoader = true) => {
    if (showLoader) setLoading(true);
  
    try {
      let query = supabase
        .from('exam_requests')
        .select(`
          *,
          doctors(name),
          insurances(name),
          partners(name)
        `)
        .order('created_at', { ascending: false });

      // 🔒 FILTRO POR PARCEIRO - usuários parceiros veem apenas seus exames
      if (userProfile === 'parceiro' && userPartnerId) {
        console.log('🔒 Filtrando exames do parceiro:', userPartnerId);
        query = query.eq('partner_id', userPartnerId);
      } else if (userProfile === 'parceiro') {
        console.log('⚠️ Parceiro sem partner_id definido - mostrando todos os exames');
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.paymentType) {
        query = query.eq('payment_type', filters.paymentType);
      }

      if (filters.patientName) {
        query = query.ilike('patient_name', `%${filters.patientName}%`);
      }

      if (filters.conduct) {
        query = query.eq('conduct', filters.conduct);
      }

      const { data, error } = await query;

      if (error) throw error;
    
      console.log('📊 Exames carregados:', data?.length, 'Perfil:', userProfile, 'Partner ID:', userPartnerId);
      setExamRequests(data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading exam requests:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadExamRequests(false);
    setRefreshing(false);
  };

  // 🔥 ATUALIZADO: Função para atualizar conduta
  const handleConductUpdate = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('exam_requests')
        .update({ 
          conduct: conductData.conduct,
          conduct_observations: conductData.conduct_observations
        })
        .eq('id', examId);

      if (error) throw error;

      await loadExamRequests(false);
      setSelectedExam(null);
      setShowConduct(false);
      setConductData({
        conduct: '',
        conduct_observations: ''
      });
      alert('Conduta registrada com sucesso!');
    } catch (error) {
      console.error('Error updating conduct:', error);
      alert('Erro ao registrar conduta');
    }
  };

  // 🔥 ATUALIZADO: Função para atualizar status (apenas encaminhado/executado)
  const handleStatusUpdate = async (examId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('exam_requests')
        .update({ 
          status: newStatus
        })
        .eq('id', examId);

      if (error) throw error;

      await loadExamRequests(false);
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const toggleExamExpansion = (examId: string) => {
    const newExpanded = new Set(expandedExams);
    if (newExpanded.has(examId)) {
      newExpanded.delete(examId);
    } else {
      newExpanded.add(examId);
    }
    setExpandedExams(newExpanded);
  };

  const formatExamType = (examType: string, examId: string) => {
    const maxLength = 50; // Número máximo de caracteres antes de truncar
    const isExpanded = expandedExams.has(examId);

    if (examType.length <= maxLength || isExpanded) {
      return examType;
    }

    return (
      <div className="flex flex-col space-y-1">
        <span className="truncate">{examType.substring(0, maxLength)}...</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExamExpansion(examId);
          }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 self-start"
        >
          <span>+ ver mais</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // 🔥 ATUALIZADO: Cores dos status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'encaminhado':
        return 'bg-blue-100 text-blue-800';
      case 'executado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 🔥 ATUALIZADO: Labels dos status
  const statusLabels = {
    encaminhado: 'Encaminhado ao CTR',
    executado: 'Executado'
  };

  // 🔥 NOVO: Cores para conduta
  const getConductColor = (conduct: string) => {
    switch (conduct) {
      case 'cirurgica':
        return 'bg-red-100 text-red-800';
      case 'ambulatorial':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 🔥 NOVO: Labels para conduta
  const conductLabels = {
    cirurgica: 'Cirúrgica',
    ambulatorial: 'Ambulatorial'
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
          <h2 className="text-xl font-semibold text-gray-900">Acompanhamento de Pedidos de Exames</h2>
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

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Paciente</label>
            <input
              type="text"
              value={filters.patientName}
              onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
              placeholder="Buscar por nome..."
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
              <option value="">Todos ({examRequests.length})</option>
              <option value="encaminhado">
                Encaminhado ({examRequests.filter(e => e.status === 'encaminhado').length})
              </option>
              <option value="executado">
                Executado ({examRequests.filter(e => e.status === 'executado').length})
              </option>
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
              <option value="particular">
                Particular ({examRequests.filter(e => e.payment_type === 'particular').length})
              </option>
              <option value="convenio">
                Convênio ({examRequests.filter(e => e.payment_type === 'convenio').length})
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conduta</label>
            <select
              value={filters.conduct}
              onChange={(e) => setFilters({ ...filters, conduct: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              <option value="cirurgica">
                Cirúrgica ({examRequests.filter(e => e.conduct === 'cirurgica').length})
              </option>
              <option value="ambulatorial">
                Ambulatorial ({examRequests.filter(e => e.conduct === 'ambulatorial').length})
              </option>
              <option value="null">
                Não definida ({examRequests.filter(e => !e.conduct).length})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* 🔥 ATUALIZADO: Modal para Conduta (substitui o de intervenção) */}
      {showConduct && selectedExam && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Conduta</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conduta</label>
              <select
                required
                value={conductData.conduct}
                onChange={(e) => setConductData({ ...conductData, conduct: e.target.value as 'cirurgica' | 'ambulatorial' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione a conduta</option>
                <option value="cirurgica">Cirúrgica</option>
                <option value="ambulatorial">Ambulatorial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações da Conduta</label>
              <textarea
                rows={4}
                value={conductData.conduct_observations}
                onChange={(e) => setConductData({ ...conductData, conduct_observations: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva as observações da conduta..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleConductUpdate(selectedExam.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmar Conduta
              </button>
              <button
                onClick={() => {
                  setShowConduct(false);
                  setSelectedExam(null);
                  setConductData({
                    conduct: '',
                    conduct_observations: ''
                  });
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
              Exames ({examRequests.length} registros)
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
                    Data Consulta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exame
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conduta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parceiro
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
                {examRequests.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exam.patient_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exam.birth_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exam.consultation_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.doctors?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="break-words">
                        {formatExamType(exam.exam_type, exam.id)}
                        {expandedExams.has(exam.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExamExpansion(exam.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 mt-1"
                          >
                            <span>ver menos</span>
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exam.status)}`}>
                        {statusLabels[exam.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {exam.conduct ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConductColor(exam.conduct)}`}>
                          {conductLabels[exam.conduct as keyof typeof conductLabels]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Não definida</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.payment_type === 'particular' ? 'Particular' : `Convênio (${exam.insurances?.name || 'N/A'})`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.partners?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exam.created_at).toLocaleDateString('pt-BR')} {new Date(exam.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {exam.status === 'encaminhado' && (
                          <button
                            onClick={() => handleStatusUpdate(exam.id, 'executado')}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Marcar como Executado"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {/* 🔥 ATUALIZADO: Botão para conduta (apenas para exames executados) */}
                        {exam.status === 'executado' && (
                          <button
                            onClick={() => {
                              setSelectedExam(exam);
                              setConductData({
                                conduct: exam.conduct || '',
                                conduct_observations: exam.conduct_observations || ''
                              });
                              setShowConduct(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Registrar Conduta"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {/* 🔥 NOVO: Ícone para observações da conduta */}
                        {exam.conduct_observations && (
                          <div className="text-xs text-gray-500" title={exam.conduct_observations}>
                            📝
                          </div>
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
