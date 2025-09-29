import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit } from 'lucide-react';
import { supabase, ExamRequest, Doctor, Insurance, Partner } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function ExamManagement() {
  const [examRequests, setExamRequests] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showConduct, setShowConduct] = useState(false);
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
  });
  const { user } = useAuth();

  useEffect(() => {
    console.log('🔄 useEffect inicial - user:', user);
    if (user?.profile === 'parceiro') {
      loadUserPartner();
    } else {
      loadData();
    }
  }, [user]);

  const loadUserPartner = async () => {
    try {
      console.log('🔍 Buscando partner_id do usuário...', user?.id);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('partner_id, partners!inner(id, name)')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('❌ Erro ao buscar partner_id:', userError);
        return;
      }

      console.log('📋 Dados do usuário:', userData);

      if (userData && userData.partner_id) {
        const partner = {
          id: userData.partner_id,
          name: userData.partners?.name || 'Parceiro'
        };
        
        console.log('✅ Partner carregado:', partner);
        setCurrentPartner(partner);
        setFormData(prev => ({ ...prev, partner_id: userData.partner_id }));
        
        await loadData(partner.id);
      } else {
        console.error('❌ Usuário parceiro sem partner_id');
        alert('Erro: Parceiro não vinculado. Contate o administrador.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user partner:', error);
      setLoading(false);
    }
  };

  const loadData = useCallback(async (userPartnerId?: string) => {
    try {
      setLoading(true);
      console.log('🚀 Iniciando loadData com partnerId:', userPartnerId);
      
      // Carregar parceiros (apenas admin vê todos)
      if (user?.profile === 'admin') {
        const { data: partnersData, error: partnersError } = await supabase
          .from('partners')
          .select('*')
          .order('name');

        if (partnersError) throw partnersError;
        setPartners(partnersData || []);
      }

      const effectivePartnerId = userPartnerId || currentPartner?.id;

      console.log('🔍 Carregando dados com partner_id:', effectivePartnerId);
      console.log('👤 Perfil do usuário:', user?.profile);

      // Carregar médicos com filtro correto
      let doctorsQuery = supabase
        .from('doctors')
        .select('*')
        .order('name');

      if (user?.profile === 'parceiro' && effectivePartnerId) {
        console.log('🎯 Filtrando médicos do partner:', effectivePartnerId);
        doctorsQuery = doctorsQuery.eq('partner_id', effectivePartnerId);
      }

      // Carregar convênios com filtro correto
      let insurancesQuery = supabase
        .from('insurances')
        .select('*')
        .order('name');

      if (user?.profile === 'parceiro' && effectivePartnerId) {
        console.log('🎯 Filtrando convênios para partner:', effectivePartnerId);
        insurancesQuery = insurancesQuery.or(`partner_id.eq.${effectivePartnerId},partner_id.is.null`);
      }

      console.log('🔍 Executando query de convênios...');
      const insurancesRes = await insurancesQuery;
      
      if (insurancesRes.error) {
        console.error('❌ Erro ao buscar convênios filtrados:', insurancesRes.error);
        throw insurancesRes.error;
      }

      console.log('✅ Convênios carregados com sucesso:', insurancesRes.data);

      // Carregar exames
      let examsQuery = supabase
        .from('exam_requests')
        .select(`
          *,
          doctors(name),
          insurances(name),
          partners(name)
        `)
        .order('created_at', { ascending: false });

      if (user?.profile === 'parceiro' && effectivePartnerId) {
        examsQuery = examsQuery.eq('partner_id', effectivePartnerId);
      }

      const [examsRes, doctorsRes] = await Promise.all([
        examsQuery,
        doctorsQuery
      ]);

      if (examsRes.error) throw examsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;

      setExamRequests(examsRes.data || []);
      setDoctors(doctorsRes.data || []);
      setInsurances(insurancesRes.data || []);

      console.log('📊 Dados carregados com SUCESSO:', {
        exames: examsRes.data?.length,
        medicos: doctorsRes.data?.length,
        convenios: insurancesRes.data?.length,
        perfil: user?.profile,
        partner: effectivePartnerId,
        lista_convenios: insurancesRes.data?.map(i => ({ 
          id: i.id, 
          name: i.name, 
          partner_id: i.partner_id 
        }))
      });

    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentPartner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🏥 Criando encaminhamento de exame:', {
        ...formData,
        user_profile: user?.profile,
        current_partner: currentPartner,
        medicos_disponiveis: doctors.length,
        convenios_disponiveis: insurances.length
      });

      const examData = {
        ...formData,
        insurance_id: formData.payment_type === 'convenio' ? formData.insurance_id : null,
      };

      const { error } = await supabase
        .from('exam_requests')
        .insert([examData]);

      if (error) throw error;

      if (user?.profile === 'parceiro' && currentPartner) {
        await loadData(currentPartner.id);
      } else {
        await loadData();
      }

      setShowForm(false);
      setFormData({
        patient_name: '',
        birth_date: '',
        consultation_date: '',
        doctor_id: '',
        exam_type: '',
        payment_type: 'particular',
        insurance_id: '',
        partner_id: currentPartner?.id || '',
      });
      alert('Exame encaminhado com sucesso!');
    } catch (error) {
      console.error('Error creating exam request:', error);
      alert('Erro ao encaminhar exame');
    } finally {
      setLoading(false);
    }
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

      if (user?.profile === 'parceiro' && currentPartner) {
        await loadData(currentPartner.id);
      } else {
        await loadData();
      }

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

      if (user?.profile === 'parceiro' && currentPartner) {
        await loadData(currentPartner.id);
      } else {
        await loadData();
      }

      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    }
  };

  useEffect(() => {
    if (currentPartner && user?.profile === 'parceiro') {
      console.log('🔄 currentPartner mudou, recarregando dados...', currentPartner);
      loadData(currentPartner.id);
    }
  }, [currentPartner, user, loadData]);

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

  if (loading && examRequests.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showForm) {
    console.log('🔍 Formulário ABERTO - Debug:', {
      medicos_disponiveis: doctors.length,
      convenios_disponiveis: insurances.length,
      lista_convenios: insurances,
      perfil_usuario: user?.profile,
      current_partner: currentPartner
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Encaminhamento de Exames</h2>
          <p className="text-sm text-gray-600">
            {examRequests.length} exame{examRequests.length !== 1 ? 's' : ''} encaminhado{examRequests.length !== 1 ? 's' : ''}
            {currentPartner && ` por ${currentPartner.name}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Encaminhar Exame</span>
        </button>
      </div>

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

          {/* Debug info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🔍 Debug: {insurances.length} convênio(s) disponível(s) | 
              Perfil: {user?.profile} | 
              Partner: {currentPartner?.name || 'Nenhum'}
            </p>
          </div>

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
            {/* Campos do formulário permanecem iguais */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Consulta</label>
              <input
                type="date"
                required
                value={formData.consultation_date}
                onChange={(e) => setFormData({ ...formData, consultation_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico Solicitante</label>
              <select
                required
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
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
              {doctors.length === 0 && user?.profile === 'parceiro' && (
                <p className="text-xs text-red-600 mt-1">
                  Cadastre médicos em "Gestão de Médicos" primeiro
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Exame</label>
              <input
                type="text"
                required
                value={formData.exam_type}
                onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Raio-X, Ultrassom"
              />
            </div>
            {user?.profile === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parceiro</label>
                <select
                  required
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um parceiro</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pagamento</label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as 'particular' | 'convenio' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="particular">Particular</option>
                <option value="convenio" disabled={insurances.length === 0}>
                  {insurances.length === 0 ? 'Convênio (indisponível)' : 'Convênio'}
                </option>
              </select>
              {insurances.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Nenhum convênio cadastrado no sistema
                </p>
              )}
            </div>
            {formData.payment_type === 'convenio' && (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convênio {insurances.length > 0 && `(${insurances.length} disponível)`}
                </label>
                <select
                  required
                  value={formData.insurance_id}
                  onChange={(e) => setFormData({ ...formData, insurance_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={insurances.length === 0}
                >
                  <option value="">{insurances.length === 0 ? 'Nenhum convênio cadastrado' : 'Selecione um convênio'}</option>
                  {insurances.map((insurance) => (
                    <option key={insurance.id} value={insurance.id}>
                      {insurance.name} {insurance.partner_id ? `(Partner: ${insurance.partner_id})` : '(Global)'}
                    </option>
                  ))}
                </select>
                {insurances.length === 0 && user?.profile === 'parceiro' && (
                  <p className="text-xs text-red-600 mt-1">
                    Cadastre convênios em "Gestão de Convênios" primeiro
                  </p>
                )}
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

      {/* 🔥 ATUALIZADO: Modal para Conduta */}
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
                {user?.profile === 'admin' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parceiro
                  </th>
                )}
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exam.exam_type}
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
                  {user?.profile === 'admin' && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.partners?.name || 'N/A'}
                    </td>
                  )}
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
                            setShowConduct(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Registrar Conduta"
                        >
                          <Edit className="w-4 h-4" />
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
    </div>
  );
}
