import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, Unit } from '../../lib/supabase';

export function UnitManagement() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('units')
        .insert([{ name: unitName }]);

      if (error) throw error;

      await loadUnits();
      setShowForm(false);
      setUnitName('');
      alert('Unidade criada com sucesso!');
    } catch (error) {
      console.error('Error creating unit:', error);
      alert('Erro ao criar unidade');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitName(unit.name);
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    
    setLoading(true);

    try {
      console.log('✏️ Atualizando unidade:', editingUnit.id, unitName);
      
      const { error } = await supabase
        .from('units')
        .update({
          name: unitName.trim(),
        })
        .eq('id', editingUnit.id);

      if (error) {
        console.error('❌ Erro ao atualizar unidade:', error);
        alert(`Erro ao atualizar unidade: ${error.message}`);
        return;
      }

      console.log('✅ Unidade atualizada com sucesso');
      await loadUnits();
      setShowForm(false);
      setEditingUnit(null);
      setUnitName('');
      alert('Unidade atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating unit:', error);
      alert('Erro ao atualizar unidade');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (unitId: string, unitName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a unidade "${unitName}"?`)) {
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Excluindo unidade:', unitId);
      
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);

      if (error) {
        console.error('❌ Erro ao excluir unidade:', error);
        alert(`Erro ao excluir unidade: ${error.message}`);
        return;
      }

      console.log('✅ Unidade excluída com sucesso');
      await loadUnits();
      alert('Unidade excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('Erro ao excluir unidade');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUnit(null);
    setUnitName('');
  };

  if (loading && units.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Gestão de Unidades</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Unidade</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUnit ? 'Editar Unidade' : 'Cadastrar Nova Unidade'}
          </h3>
          <form onSubmit={editingUnit ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Unidade</label>
              <input
                type="text"
                required
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Unidade Central, Filial Norte"
              />
            </div>
            <div className="flex items-end space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (editingUnit ? 'Atualizando...' : 'Criando...') : (editingUnit ? 'Atualizar Unidade' : 'Criar Unidade')}
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
                Nome da Unidade
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
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {unit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(unit.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar unidade"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id, unit.name)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir unidade"
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