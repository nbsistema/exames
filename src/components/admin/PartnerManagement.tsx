import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, Partner } from '../../lib/supabase';

export function PartnerManagement() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    company_type: '',
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('partners')
        .insert([formData]);

      if (error) throw error;

      await loadPartners();
      setShowForm(false);
      setFormData({ name: '', company_type: '' });
      alert('Parceiro criado com sucesso!');
    } catch (error) {
      console.error('Error creating partner:', error);
      alert('Erro ao criar parceiro');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      company_type: partner.company_type,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    
    setLoading(true);

    try {
      console.log('✏️ Atualizando parceiro:', editingPartner.id, formData);
      
      const { error } = await supabase
        .from('partners')
        .update({
          name: formData.name.trim(),
          company_type: formData.company_type.trim(),
        })
        .eq('id', editingPartner.id);

      if (error) {
        console.error('❌ Erro ao atualizar parceiro:', error);
        alert(`Erro ao atualizar parceiro: ${error.message}`);
        return;
      }

      console.log('✅ Parceiro atualizado com sucesso');
      await loadPartners();
      setShowForm(false);
      setEditingPartner(null);
      setFormData({ name: '', company_type: '' });
      alert('Parceiro atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating partner:', error);
      alert('Erro ao atualizar parceiro');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o parceiro "${partnerName}"? Isso também excluirá todos os médicos e convênios associados.`)) {
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Excluindo parceiro:', partnerId);
      
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', partnerId);

      if (error) {
        console.error('❌ Erro ao excluir parceiro:', error);
        alert(`Erro ao excluir parceiro: ${error.message}`);
        return;
      }

      console.log('✅ Parceiro excluído com sucesso');
      await loadPartners();
      alert('Parceiro excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Erro ao excluir parceiro');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPartner(null);
    setFormData({ name: '', company_type: '' });
  };

  if (loading && partners.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Gestão de Parceiros</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Parceiro</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPartner ? 'Editar Parceiro' : 'Cadastrar Novo Parceiro'}
          </h3>
          <form onSubmit={editingPartner ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Empresa</label>
              <input
                type="text"
                required
                value={formData.company_type}
                onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Clínica, Hospital, Laboratório"
              />
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (editingPartner ? 'Atualizando...' : 'Criando...') : (editingPartner ? 'Atualizar Parceiro' : 'Criar Parceiro')}
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
                Nome da Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo de Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {partner.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {partner.company_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(partner.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(partner)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar parceiro"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(partner.id, partner.name)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir parceiro"
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