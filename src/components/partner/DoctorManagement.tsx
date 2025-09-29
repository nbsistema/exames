import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, Doctor, Partner } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    crm: '',
    partner_id: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]); // Adicione user como dependência

  const loadData = async () => {
    try {
      // Carregar parceiros (apenas admin vê todos)
      if (user?.profile === 'admin') {
        const { data: partnersData, error: partnersError } = await supabase
          .from('partners')
          .select('*')
          .order('name');

        if (partnersError) throw partnersError;
        setPartners(partnersData || []);
      }

      // 🔥 CORREÇÃO: Buscar o partner_id CORRETO do usuário logado
      if (user?.profile === 'parceiro') {
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

      // 🔥 CORREÇÃO: Carregar médicos com filtro por partner_id
      let doctorsQuery = supabase
        .from('doctors')
        .select(`
          *,
          partners(name)
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtro: parceiros veem apenas seus médicos, admin vê todos
      if (user?.profile === 'parceiro' && currentPartner?.id) {
        console.log('🔍 Filtrando médicos do parceiro:', currentPartner.id);
        doctorsQuery = doctorsQuery.eq('partner_id', currentPartner.id);
      }

      const { data: doctorsData, error: doctorsError } = await doctorsQuery;

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);

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
      // 🔍 DEBUG: Verificar dados antes de enviar
      console.log('👨‍⚕️ Criando médico:', {
        ...formData,
        user_profile: user?.profile,
        current_partner: currentPartner
      });
      
      const { error } = await supabase
        .from('doctors')
        .insert([formData]);

      if (error) throw error;

      await loadData();
      setShowForm(false);
      setFormData({ 
        name: '', 
        crm: '', 
        partner_id: currentPartner?.id || '' 
      });
      alert('Médico cadastrado com sucesso!');
    } catch (error) {
      console.error('Error creating doctor:', error);
      alert('Erro ao cadastrar médico');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    // 🔥 CORREÇÃO: Verificar permissão de edição
    if (user?.profile === 'parceiro' && doctor.partner_id !== currentPartner?.id) {
      alert('Você não tem permissão para editar este médico');
      return;
    }

    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      crm: doctor.crm,
      partner_id: doctor.partner_id,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    
    // 🔥 CORREÇÃO: Verificar permissão de atualização
    if (user?.profile === 'parceiro' && editingDoctor.partner_id !== currentPartner?.id) {
      alert('Você não tem permissão para atualizar este médico');
      return;
    }
    
    setLoading(true);

    try {
      console.log('✏️ Atualizando médico:', editingDoctor.id, formData);
      
      const { error } = await supabase
        .from('doctors')
        .update({
          name: formData.name.trim(),
          crm: formData.crm.trim(),
          partner_id: formData.partner_id,
        })
        .eq('id', editingDoctor.id);

      if (error) {
        console.error('❌ Erro ao atualizar médico:', error);
        alert(`Erro ao atualizar médico: ${error.message}`);
        return;
      }

      console.log('✅ Médico atualizado com sucesso');
      await loadData();
      setShowForm(false);
      setEditingDoctor(null);
      setFormData({ 
        name: '', 
        crm: '', 
        partner_id: currentPartner?.id || '' 
      });
      alert('Médico atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Erro ao atualizar médico');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doctorId: string, doctorName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o médico "${doctorName}"?`)) {
      return;
    }

    // 🔥 CORREÇÃO: Verificar permissão de exclusão
    const doctorToDelete = doctors.find(d => d.id === doctorId);
    if (user?.profile === 'parceiro' && doctorToDelete?.partner_id !== currentPartner?.id) {
      alert('Você não tem permissão para excluir este médico');
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Excluindo médico:', doctorId);
      
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) {
        console.error('❌ Erro ao excluir médico:', error);
        alert(`Erro ao excluir médico: ${error.message}`);
        return;
      }

      console.log('✅ Médico excluído com sucesso');
      await loadData();
      alert('Médico excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Erro ao excluir médico');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingDoctor(null);
    setFormData({ 
      name: '', 
      crm: '', 
      partner_id: currentPartner?.id || '' 
    });
  };

  // 🔥 CORREÇÃO: Filtrar parceiros para admin (apenas parceiros ativos)
  const availablePartners = user?.profile === 'admin' 
    ? partners 
    : currentPartner ? [currentPartner] : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestão de Médicos</h2>
          <p className="text-sm text-gray-600">
            {doctors.length} médico{doctors.length !== 1 ? 's' : ''} cadastrado{doctors.length !== 1 ? 's' : ''}
            {currentPartner && ` para ${currentPartner.name}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Médico</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingDoctor ? 'Editar Médico' : 'Cadastrar Novo Médico'}
          </h3>
          <form onSubmit={editingDoctor ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Médico</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
              <input
                type="text"
                required
                value={formData.crm}
                onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: CRM/SP 123456"
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
                  {availablePartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (editingDoctor ? 'Atualizando...' : 'Cadastrando...') : (editingDoctor ? 'Atualizar Médico' : 'Cadastrar Médico')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CRM
              </th>
              {user?.profile === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parceiro
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cadastrado em
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.length === 0 ? (
              <tr>
                <td colSpan={user?.profile === 'admin' ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                  {loading ? 'Carregando...' : 'Nenhum médico cadastrado'}
                </td>
              </tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {doctor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doctor.crm}
                  </td>
                  {user?.profile === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doctor.partners?.name || 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doctor.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(doctor)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Editar médico"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doctor.id, doctor.name)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Excluir médico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
