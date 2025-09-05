import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { supabase, Battery } from '../../lib/supabase';

export function BatteryManagement() {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBattery, setEditingBattery] = useState<Battery | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    exams: [''],
  });

  useEffect(() => {
    loadBatteries();
  }, []);

  const loadBatteries = async () => {
    try {
      const { data, error } = await supabase
        .from('batteries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatteries(data || []);
    } catch (error) {
      console.error('Error loading batteries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const examsArray = formData.exams.filter(exam => exam.trim() !== '');
      
      const { error } = await supabase
        .from('batteries')
        .insert([{ 
          name: formData.name,
          exams: examsArray 
        }]);

      if (error) throw error;

      await loadBatteries();
      setShowForm(false);
      setFormData({ name: '', exams: [''] });
      alert('Bateria criada com sucesso!');
    } catch (error) {
      console.error('Error creating battery:', error);
      alert('Erro ao criar bateria');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (battery: Battery) => {
    setEditingBattery(battery);
    setFormData({
      name: battery.name,
      exams: battery.exams.length > 0 ? battery.exams : [''],
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBattery) return;
    
    setLoading(true);

    try {
      const examsArray = formData.exams.filter(exam => exam.trim() !== '');
      
      console.log('✏️ Atualizando bateria:', editingBattery.id, { name: formData.name, exams: examsArray });
      
      const { error } = await supabase
        .from('batteries')
        .update({ 
          name: formData.name.trim(),
          exams: examsArray 
        })
        .eq('id', editingBattery.id);

      if (error) {
        console.error('❌ Erro ao atualizar bateria:', error);
        alert(`Erro ao atualizar bateria: ${error.message}`);
        return;
      }

      console.log('✅ Bateria atualizada com sucesso');
      await loadBatteries();
      setShowForm(false);
      setEditingBattery(null);
      setFormData({ name: '', exams: [''] });
      alert('Bateria atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating battery:', error);
      alert('Erro ao atualizar bateria');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (batteryId: string, batteryName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a bateria "${batteryName}"?`)) {
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Excluindo bateria:', batteryId);
      
      const { error } = await supabase
        .from('batteries')
        .delete()
        .eq('id', batteryId);

      if (error) {
        console.error('❌ Erro ao excluir bateria:', error);
        alert(`Erro ao excluir bateria: ${error.message}`);
        return;
      }

      console.log('✅ Bateria excluída com sucesso');
      await loadBatteries();
      alert('Bateria excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting battery:', error);
      alert('Erro ao excluir bateria');
    } finally {
      setLoading(false);
    }
  };

  const addExamField = () => {
    setFormData({ ...formData, exams: [...formData.exams, ''] });
  };

  const removeExamField = (index: number) => {
    const newExams = formData.exams.filter((_, i) => i !== index);
    setFormData({ ...formData, exams: newExams.length > 0 ? newExams : [''] });
  };

  const updateExam = (index: number, value: string) => {
    const newExams = [...formData.exams];
    newExams[index] = value;
    setFormData({ ...formData, exams: newExams });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBattery(null);
    setFormData({ name: '', exams: [''] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Cadastro de Baterias</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Bateria</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingBattery ? 'Editar Bateria' : 'Cadastrar Nova Bateria'}
          </h3>
          <form onSubmit={editingBattery ? handleUpdate : handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Bateria</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Check-up Executivo, Check-up Básico"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exames da Bateria</label>
              {formData.exams.map((exam, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={exam}
                    onChange={(e) => updateExam(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome do exame"
                  />
                  {formData.exams.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExamField(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addExamField}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Exame</span>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (editingBattery ? 'Atualizando...' : 'Criando...') : (editingBattery ? 'Atualizar Bateria' : 'Criar Bateria')}
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
                Nome da Bateria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exames Inclusos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantidade
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
            {batteries.map((battery) => (
              <tr key={battery.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {battery.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-xs">
                    {battery.exams.slice(0, 3).join(', ')}
                    {battery.exams.length > 3 && ` +${battery.exams.length - 3} mais`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {battery.exams.length} exames
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(battery.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(battery)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar bateria"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(battery.id, battery.name)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir bateria"
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