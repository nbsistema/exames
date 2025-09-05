import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, Insurance } from '../../lib/supabase';

export function InsuranceManagement() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [insuranceName, setInsuranceName] = useState('');

  useEffect(() => {
    loadInsurances();
  }, []);

  const loadInsurances = async () => {
    try {
      const { data, error } = await supabase
        .from('insurances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInsurances(data || []);
    } catch (error) {
      console.error('Error loading insurances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real implementation, you would get the partner_id from the current user
      const { error } = await supabase
        .from('insurances')
        .insert([{ name: insuranceName, partner_id: 'dummy-partner-id' }]);

      if (error) throw error;

      await loadInsurances();
      setShowForm(false);
      setInsuranceName('');
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
    setInsuranceName(insurance.name);
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsurance) return;
    
    setLoading(true);

    try {
      console.log('✏️ Atualizando convênio:', editingInsurance.id, insuranceName);
      
      const { error } = await supabase
        .from('insurances')
        .update({
          name: insuranceName.trim(),
        })
        .eq('id', editingInsurance.id);

      if (error) {
        console.error('❌ Erro ao atualizar convênio:', error);
        alert(`Erro ao atualizar convênio: ${error.message}`);
        return;
      }

      console.log('✅ Convênio atualizado com sucesso');
      await loadInsurances();
      setShowForm(false);
      setEditingInsurance(null);
      setInsuranceName('');
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
      await loadInsurances();
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
    setInsuranceName('');
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

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingInsurance ? 'Editar Convênio' : 'Cadastrar Novo Convênio'}
          </h3>
          <form onSubmit={editingInsurance ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Convênio</label>
              <input
                type="text"
                required
                value={insuranceName}
                onChange={(e) => setInsuranceName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Unimed, Bradesco Saúde"
              />
            </div>
            <div className="flex items-end space-x-3">
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