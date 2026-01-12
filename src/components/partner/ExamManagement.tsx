import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit } from 'lucide-react';
import { supabase, Doctor, Insurance, Partner } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ExamRequest {
  id: string;
  patient_name: string;
  phone: string;
  birth_date: string;
  consultation_date: string;
  doctor_id: string;
  exam_type: string;
  payment_type: 'particular' | 'convenio';
  insurance_id: string | null;
  partner_id: string;
  status: 'encaminhado' | 'executado';
  conduct: 'cirurgica' | 'ambulatorial' | null;
  conduct_observations: string | null;
  doctors: { name: string };
  insurances: { name: string } | null;
  partners: { name: string };
  created_at: string;
}

export function ExamManagement() {
  const { user } = useAuth();
  
  // Estados principais
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de UI
  const [showForm, setShowForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamRequest | null>(null);
  const [showConduct, setShowConduct] = useState(false);
  
  // Estados de formulário
  const [conductData, setConductData] = useState({
    conduct: '' as 'cirurgica' | 'ambulatorial' | '',
    conduct_observations: ''
  });
  
  const [formData, setFormData] = useState({
    patient_name: '',
    birth_date: '',
    consultation_date: '',
    doctor_id: '',
    exam_type: '',
    payment_type: 'particular' as 'particular' | 'convenio',
    insurance_id: '',
    partner_id: '',
    phone: ''
  });

  // Funções puras (sem dependências de estado que mudam frequentemente)
  const formatPhone = useCallback((value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatPhone(rawValue);
    
    setFormData(prev => ({ 
      ...prev, 
      phone: formattedValue 
    }));
  }, [formatPhone]);

  // Carregar dados uma única vez
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!user || !isMounted) return;
      
      try {
        setLoading(true);
        console.log('🚀 Iniciando carregamento de dados para:', user.email);

        // Se for parceiro, buscar partner primeiro
        if (user.profile === 'parceiro') {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('partner_id, partners!inner(id, name)')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;

          if (userData && userData.partner_id) {
            const partner = {
              id: userData.partner_id,
              name: userData.partners?.name || 'Parceiro'
            };
            
            if (isMounted) {
              setCurrentPartner(partner);
              setFormData(prev => ({ ...prev, partner_id: partner.id }));
            }
          }
        }

        // Preparar queries com base no perfil
        const effectivePartnerId = currentPartner?.id || 
          (user.profile === 'parceiro' ? user.id : undefined);

        // Query de médicos
        let doctorsQuery = supabase
          .from('doctors')
          .select('*')
          .order('name');

        if (user.profile === 'parceiro' && effectivePartnerId) {
          doctorsQuery = doctorsQuery.eq('partner_id', effectivePartnerId);
        }

        // Query de convênios
        let insurancesQuery = supabase
          .from('insurances')
          .select('*')
          .order('name');

        if (user.profile === 'parceiro' && effectivePartnerId) {
          insurancesQuery = insurancesQuery.or(`partner_id.eq.${effectivePartnerId},partner_id.is.null`);
        }

        // Query de exames
        let examsQuery = supabase
          .from('exam_requests')
          .select(`
            *,
            doctors(name),
            insurances(name),
            partners(name)
          `)
          .order('created_at', { ascending: false });

        if (user.profile === 'parceiro' && effectivePartnerId) {
          examsQuery = examsQuery.eq('partner_id', effectivePartnerId);
        }

        // Query de parceiros (apenas admin)
        let partnersPromise = Promise.resolve({ data: [], error: null });
        if (user.profile === 'admin') {
          partnersPromise = supabase
            .from('partners')
            .select('*')
            .order('name');
        }

        // Executar todas as queries
        const [
          examsRes,
          doctorsRes,
          insurancesRes,
          partnersRes
        ] = await Promise.all([
          examsQuery,
          doctorsQuery,
          insurancesQuery,
          partnersPromise
        ]);

        if (examsRes.error) throw examsRes.error;
        if (doctorsRes.error) throw doctorsRes.error;
        if (insurancesRes.error) throw insurancesRes.error;
        if (partnersRes.error) throw partnersRes.error;

        if (isMounted) {
          setExamRequests(examsRes.data || []);
          setDoctors(doctorsRes.data || []);
          setInsurances(insurancesRes.data || []);
          setPartners(partnersRes.data || []);
          setLoading(false);
          
          console.log('✅ Dados carregados com sucesso');
        }

      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]); // 🔥 Apenas user como dependência

  // Função para criar exame
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const examData = {
        ...formData,
        insurance_id: formData.payment_type === 'convenio' ? formData.insurance_id : null,
      };

      const { error } = await supabase
        .from('exam_requests')
        .insert([examData]);

      if (error) throw error;

      // Recarregar dados
      await loadFreshData();
      
      setShowForm(false);
      resetFormData();
      
      alert('Exame encaminhado com sucesso!');
    } catch (error) {
      console.error('Error creating exam request:', error);
      alert('Erro ao encaminhar exame');
    } finally {
      setLoading(false);
    }
  }, [formData]);

  // Função auxiliar para recarregar dados
  const loadFreshData = useCallback(async () => {
    if (!user) return;
    
    try {
      const effectivePartnerId = currentPartner?.id || 
        (user.profile === 'parceiro' ? user.id : undefined);

      // Query de exames
      let examsQuery = supabase
        .from('exam_requests')
        .select(`
          *,
          doctors(name),
          insurances(name),
          partners(name)
        `)
        .order('created_at', { ascending: false });

      if (user.profile === 'parceiro' && effectivePartnerId) {
        examsQuery = examsQuery.eq('partner_id', effectivePartnerId);
      }

      const examsRes = await examsQuery;
      if (examsRes.error) throw examsRes.error;
      
      setExamRequests(examsRes.data || []);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [user, currentPartner]);

  // Função para resetar form data
  const resetFormData = useCallback(() => {
    setFormData({
      patient_name: '',
      birth_date: '',
      consultation_date: '',
      doctor_id: '',
      exam_type: '',
      payment_type: 'particular',
      insurance_id: '',
      partner_id: currentPartner?.id || '',
      phone: ''
    });
  }, [currentPartner]);

  // Função para atualizar conduta
  const handleConductUpdate = useCallback(async () => {
    if (!selectedExam) return;
    
    try {
      const { error } = await supabase
        .from('exam_requests')
        .update({ 
          conduct: conductData.conduct,
          conduct_observations: conductData.conduct_observations
        })
        .eq('id', selectedExam.id);

      if (error) throw error;

      await loadFreshData();
      
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
  }, [selectedExam, conductData, loadFreshData]);

  // Valores memoizados
  const examCountText = useMemo(() => {
    return `${examRequests.length} exame${examRequests.length !== 1 ? 's' : ''} encaminhado${examRequests.length !== 1 ? 's' : ''}${currentPartner ? ` por ${currentPartner.name}` : ''}`;
  }, [examRequests.length, currentPartner]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'encaminhado':
        return 'bg-blue-100 text-blue-800';
      case 'executado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getConductColor = useCallback((conduct: string) => {
    switch (conduct) {
      case 'cirurgica':
        return 'bg-red-100 text-red-800';
      case 'ambulatorial':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const statusLabels = useMemo(() => ({
    encaminhado: 'Encaminhado ao CTR',
    executado: 'Executado'
  }), []);

  const conductLabels = useMemo(() => ({
    cirurgica: 'Cirúrgica',
    ambulatorial: 'Ambulatorial'
  }), []);

  // Loading state
  if (loading && examRequests.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-900">Encaminhamento de Exames</h2>
          <p className="text-sm text-gray-600">{examCountText}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={doctors.length === 0 && user?.profile === 'parceiro'}
        >
          <Plus className="w-4 h-4" />
          <span>Encaminhar Exame</span>
        </button>
      </div>

      {/* Formulário de novo exame */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Encaminhar Novo Exame</h3>
          
          {doctors.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Nenhum médico cadastrado. 
                {user?.profile === 'parceiro' 
                  ? ' Cadastre médicos antes de encaminhar exames.' 
                  : ' Contate o administrador.'}
              </p>
            </div>
          )}

          {formData.payment_type === 'convenio' && insurances.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Nenhum convênio disponível. 
                {user?.profile === 'parceiro' 
                  ? ' Cadastre convênios no sistema ou use "Particular".' 
                  : ' Contate o administrador para cadastrar convênios.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Campos do formulário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Paciente</label>
              <input
                type="text"
                required
                value={formData.patient_name}
                onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <input
                type="date"
                required
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Consulta</label>
              <input
                type="date"
                required
                value={formData.consultation_date}
                onChange={(e) => setFormData(prev => ({ ...prev, consultation_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico Solicitante</label>
              <select
                required
                value={formData.doctor_id}
                onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={doctors.length === 0}
              >
                <option value="">{doctors.length === 0 ? 'Nenhum médico cadastrado' : 'Selecione um médico'}</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.crm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Exame</label>
              <input
                type="text"
                required
                value={formData.exam_type}
                onChange={(e) => setFormData(prev => ({ ...prev, exam_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Raio-X, Ultrassom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={15}
                placeholder="(xx) xxxxx-xxxx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Formato: (xx) xxxxx-xxxx</p>
            </div>
            
            {user?.profile === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parceiro</label>
                <select
                  required
                  value={formData.partner_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, partner_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um parceiro</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pagamento</label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_type: e.target.value as 'particular' | 'convenio' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="particular">Particular</option>
                <option value="convenio" disabled={insurances.length === 0}>
                  {insurances.length === 0 ? 'Convênio (indisponível)' : 'Convênio'}
                </option>
              </select>
            </div>
            
            {formData.payment_type === 'convenio' && (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convênio
                </label>
                <select
                  required
                  value={formData.insurance_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, insurance_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={insurances.length === 0}
                >
                  <option value="">{insurances.length === 0 ? 'Nenhum convênio cadastrado' : 'Selecione um convênio'}</option>
                  {insurances.map((insurance) => (
                    <option key={insurance.id} value={insurance.id}>{insurance.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="md:col-span-3 flex space-x-3">
              <button
                type="submit"
                disabled={loading || doctors.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Encaminhando...' : 'Encaminhar Exame'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de conduta */}
      {showConduct && selectedExam && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Conduta</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conduta</label>
              <select
                required
                value={conductData.conduct}
                onChange={(e) => setConductData(prev => ({ ...prev, conduct: e.target.value as 'cirurgica' | 'ambulatorial' }))}
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
                onChange={(e) => setConductData(prev => ({ ...prev, conduct_observations: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva as observações da conduta..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleConductUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmar Conduta
              </button>
              <button
                onClick={() => {
                  setShowConduct(false);
                  setSelectedExam(null);
                  setConductData({ conduct: '', conduct_observations: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de exames */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Nascimento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Consulta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exame</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conduta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                {user?.profile === 'admin' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parceiro</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {examRequests.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.patient_name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{exam.phone || 'Não informado'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(exam.birth_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(exam.consultation_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{exam.doctors?.name || 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{exam.exam_type}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exam.status)}`}>
                      {statusLabels[exam.status as keyof typeof statusLabels]}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {exam.conduct ? (
                      <div className="relative group">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConductColor(exam.conduct)}`}>
                          {conductLabels[exam.conduct as keyof typeof conductLabels]}
                        </span>
                        {exam.conduct_observations && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs whitespace-normal break-words">
                            {exam.conduct_observations}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Não definida</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exam.payment_type === 'particular' ? 'Particular' : `Convênio (${exam.insurances?.name || 'N/A'})`}
                  </td>
                  {user?.profile === 'admin' && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{exam.partners?.name || 'N/A'}</td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
