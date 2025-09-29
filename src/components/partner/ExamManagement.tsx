import React, { useState, useEffect } from 'react';
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
  const [showObservations, setShowObservations] = useState(false);
  const [observations, setObservations] = useState('');
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
    loadData();
  }, []);

  // ✅ CORREÇÃO - No loadData function
const loadData = async () => {
  try {
    // Carregar parceiros
    const { data: partnersData, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .order('name');

    if (partnersError) throw partnersError;
    setPartners(partnersData || []);

    // 🔥 CORREÇÃO: Buscar o partner_id CORRETO do usuário logado
    if (user?.profile === 'parceiro') {
      // Buscar o partner_id do usuário logado na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('partner_id, partners(name)')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('❌ Erro ao buscar partner_id do usuário:', userError);
      } else if (userData && userData.partner_id) {
        console.log('🔍 Partner_id do usuário logado:', {
          partner_id: userData.partner_id,
          partner_name: userData.partners?.name
        });
        
        setCurrentPartner({
          id: userData.partner_id,
          name: userData.partners?.name || 'Parceiro'
        });
        setFormData(prev => ({ ...prev, partner_id: userData.partner_id }));
      } else {
        console.error('❌ Usuário parceiro sem partner_id definido');
        alert('Erro: Parceiro não vinculado. Contate o administrador.');
      }
    }

    // ... resto do código
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const examData = {
        ...formData,
        insurance_id: formData.payment_type === 'convenio' ? formData.insurance_id : null,
      };

      console.log('🏥 Criando encaminhamento de exame:', examData);

      const { error } = await supabase
        .from('exam_requests')
        .insert([examData]);

      if (error) throw error;

      await loadData();
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

  const handleStatusUpdate = async (examId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('exam_requests')
        .update({ 
          status: newStatus,
          observations: newStatus === 'intervencao' ? observations : ''
        })
        .eq('id', examId);

      if (error) throw error;

      await loadData();
      setSelectedExam(null);
      setShowObservations(false);
      setObservations('');
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'encaminhado':
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
    intervencao: 'Intervenção'
  };

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
        <h2 className="text-xl font-semibold text-gray-900">Encaminhamento de Exames</h2>
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              >
                <option value="">Selecione um médico</option>
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
                <option value="convenio">Convênio</option>
              </select>
            </div>
            {formData.payment_type === 'convenio' && (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Convênio</label>
                <select
                  required
                  value={formData.insurance_id}
                  onChange={(e) => setFormData({ ...formData, insurance_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um convênio</option>
                  {insurances.map((insurance) => (
                    <option key={insurance.id} value={insurance.id}>
                      {insurance.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-3 flex space-x-3">
              <button
                type="submit"
                disabled={loading}
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

      {showObservations && selectedExam && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Observações - Intervenção</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                rows={4}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva as observações da intervenção..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleStatusUpdate(selectedExam.id, 'intervencao')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Confirmar Intervenção
              </button>
              <button
                onClick={() => {
                  setShowObservations(false);
                  setSelectedExam(null);
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
                      {exam.status === 'executado' && (
                        <button
                          onClick={() => {
                            setSelectedExam(exam);
                            setShowObservations(true);
                          }}
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          title="Marcar como Intervenção"
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
