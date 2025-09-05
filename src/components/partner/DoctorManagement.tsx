import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, Doctor } from '../../lib/supabase';

export function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    crm: '',
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
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
        .from('doctors')
        .insert([{ ...formData, partner_id: 'dummy-partner-id' }]);

      if (error) throw error;

      await loadDoctors();
      setShowForm(false);
      setFormData({ name: '', crm: '' });
      alert('Médico cadastrado com sucesso!');
    } catch (error) {
      console.error('Error creating doctor:', error);
      alert('Erro ao cadastrar médico');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      crm: doctor.crm,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    
    setLoading(true);

    try {
      console.log('✏️ Atualizando médico:', editingDoctor.id, formData);
      
      const { error } = await supabase
        .from('doctors')
        .update({
          name: formData.name.trim(),
          crm: formData.crm.trim(),
        })
        .eq('id', editingDoctor.id);

      if (error) {
        console.error('❌ Erro ao atualizar médico:', error);
        alert(`Erro ao atualizar médico: ${error.message}`);
        return;
      }

      console.log('✅ Médico atualizado com sucesso');
      await loadDoctors();
      setShowForm(false);
      setEditingDoctor(null);
      setFormData({ name: '', crm: '' });
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
      await loadDoctors();
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
    setFormData({ name: '', crm: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Gestão de Médicos</h2>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cadastrado em
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.map((doctor) => (
              <tr key={doctor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {doctor.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doctor.crm}
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}