import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, Insurance, Partner } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function InsuranceManagement() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    partner_id: '',
  });
  const { user } = useAuth();

  // 🔥 CORREÇÃO: Adicionar user como dependência
  useEffect(() => {
    loadData();
  }, [user]);

  // 🔥 NOVA FUNÇÃO: Carregar partner_id do usuário
  const loadUserPartner = async () => {
    try {
      console.log('🔍 Buscando partner_id do usuário parceiro...', user?.id);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('partner_id, partners!inner(id, name)')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('❌ Erro ao buscar partner_id do usuário:', userError);
        return null;
      }

      if (userData && userData.partner_id) {
        const partner = {
          id: userData.partner_id,
          name: userData.partners?.name || 'Parceiro'
        };
        
        console.log('✅ Partner do usuário carregado:', partner);
        return partner;
      } else {
        console.error('❌ Usuário parceiro sem partner_id definido');
        return null;
      }
    } catch (error) {
      console.error('Error loading user partner:', error);
      return null;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // 🔥 CORREÇÃO: Buscar partner_id correto para usuários parceiros
      let userPartner = null;
      if (user?.profile === 'parceiro') {
        userPartner = await loadUserPartner();
        setCurrentPartner(userPartner);
        if (userPartner) {
          setFormData(prev => ({ ...prev, partner_id: userPartner.id }));
        }
      }

      // Carregar parceiros
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select('*')
        .order('name');

      if (partnersError) throw partnersError;
      setPartners(partnersData || []);

      // 🔥 CORREÇÃO: Query de convênios com filtro por partner_id
      let insurancesQuery = supabase
        .from('insurances')
        .select(`
          *,
          partners(name)
        `)
        .order('created_at', { ascending: false });

      // Parceiros veem apenas seus convênios
      if (user?.profile === 'parceiro' && userPartner) {
        console.log('🎯 Filtrando convênios do partner:', userPartner.id);
        insurancesQuery = insurancesQuery.eq('partner_id', userPartner.id);
      }

      const { data: insurancesData, error: insurancesError } = await insurancesQuery;

      if (insurancesError) throw insurancesError;
      setInsurances(insurancesData || []);

      console.log('📊 Convênios carregados:', {
        total: insurancesData?.length,
        perfil: user?.profile,
        partner: userPartner?.name,
        convênios: insurancesData?.map(i => ({ name: i.name, partner_id: i.partner_id }))
      });

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
      console.log('💳 Criando convênio:', {
        ...formData,
        user_profile: user?.profile,
        current_partner: currentPartner
      });
      
      // 🔥 CORREÇÃO: Para usuários parceiros, garantir que partner_id está correto
      const submitData = { ...formData };
      if (user?.profile === 'parceiro' && currentPartner) {
        submitData.partner_id = currentPartner.id;
      }

      const { error } = await supabase
        .from('insurances')
        .insert([submitData]);

      if (error) throw error;

      await loadData();
      setShowForm(false);
      setFormData({ 
        name: '', 
        partner_id: currentPartner?.id || '' 
      });
      alert('Convênio cadastrado com sucesso!');
    } catch (error) {
      console.error('Error creating insurance:', error);
      alert('Erro ao cadastrar convênio');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (insurance: Insurance) => {
    setEditingInsurance(insurance);
    setFormData({
      name: insurance.name,
      partner_id: insurance.partner_id,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsurance) return;
    
    setLoading(true);

    try {
      console.log('✏️ Atualizando convênio:', editingInsurance.id, editingInsurance.name);
      
      // 🔥 CORREÇÃO: Para usuários parceiros, garantir que partner_id está correto
      const updateData = {
        name: formData.name.trim(),
        partner_id: formData.partner_id,
      };

      if (user?.profile === 'parceiro' && currentPartner) {
        updateData.partner_id = currentPartner.id;
      }

      const { error } = await supabase
        .from('insurances')
        .update(updateData)
        .eq('id', editingInsurance.id);

      if (error) {
        console.error('❌ Erro ao atualizar convênio:', error);
        alert(`Erro ao atualizar convênio: ${error.message}`);
        return;
      }

      console.log('✅ Convênio atualizado com sucesso');
      await loadData();
      setShowForm(false);
      setEditingInsurance(null);
      setFormData({ 
        name: '', 
        partner_id: currentPartner?.id || '' 
      });
      alert('Convênio atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating insurance:', error);
      alert('Erro ao atualizar convênio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (insuranceId: string, insuranceName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o convênio "${insuranceName}"?`)) {
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Excluindo convênio:', insuranceId);
      
      const { error } = await supabase
        .from('insurances')
        .delete()
        .eq('id', insuranceId);

      if (error) {
        console.error('❌ Erro ao excluir convênio:', error);
        alert(`Erro ao excluir convênio: ${error.message}`);
        return;
      }

      console.log('✅ Convênio excluído com sucesso');
      await loadData();
      alert('Convênio excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting insurance:', error);
      alert('Erro ao excluir convênio');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingInsurance(null);
    setFormData({ 
      name: '', 
      partner_id: currentPartner?.id || '' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Gestão de Convênios</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Convênio</span>
        </button>
      </div>

      {/* 🔥 ADICIONAR: Info sobre partner atual */}
      {user?.profile === 'parceiro' && currentPartner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📍 Visualizando e cadastrando convênios para: <strong>{currentPartner.name}</strong>
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingInsurance ? 'Editar Convênio' : 'Cadastrar Novo Convênio'}
          </h3>
          
          {/* 🔥 ADICIONAR: Aviso para parceiros */}
          {user?.profile === 'parceiro' && currentPartner && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Este convênio será vinculado ao parceiro: <strong>{currentPartner.name}</strong>
              </p>
            </div>
          )}

          <form onSubmit={editingInsurance ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Convênio</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Unimed, Bradesco Saúde"
              />
            </div>
            
            {/* 🔥 CORREÇÃO: Campo partner_id apenas para admin */}
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

            {/* 🔥 ADICIONAR: Campo partner_id escondido para parceiros */}
            {user?.profile === 'parceiro' && currentPartner && (
              <input
                type="hidden"
                value={currentPartner.id}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
              />
            )}

            <div className="flex items-end space-x-3 md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (editingInsurance ? 'Atualizando...' : 'Cadastrando...') : (editingInsurance ? 'Atualizar Convênio' : 'Cadastrar Convênio')}
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
                Nome do Convênio
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
            {insurances.map((insurance) => (
              <tr key={insurance.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {insurance.name}
                </td>
                {user?.profile === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {insurance.partners?.name || 'N/A'}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(insurance.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(insurance)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar convênio"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(insurance.id, insurance.name)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir convênio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
