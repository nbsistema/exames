import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Importe o supabase

interface CheckupDoctor {
  id: string;
  name: string;
  crm: string;
  created_at: string;
  updated_at: string;
}

export function DoctorManagement() {
  const [doctors, setDoctors] = useState<CheckupDoctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    crm: ''
  });
  const [editingDoctor, setEditingDoctor] = useState<CheckupDoctor | null>(null);
  const [loading, setLoading] = useState(false);

  // Carregar médicos do checkup CORRIGIDO
  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      // 🔥 CORREÇÃO: Chamada direta para o Supabase
      const { data, error } = await supabase
        .from('checkup_doctors')
        .select('*')
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Erro ao carregar médicos do checkup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.crm.trim()) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      if (editingDoctor) {
        // 🔥 CORREÇÃO: Atualizar médico existente direto no Supabase
        const { error } = await supabase
          .from('checkup_doctors')
          .update({
            name: formData.name.trim(),
            crm: formData.crm.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDoctor.id);

        if (error) throw error;
      } else {
        // 🔥 CORREÇÃO: Criar novo médico direto no Supabase
        const { error } = await supabase
          .from('checkup_doctors')
          .insert([{
            name: formData.name.trim(),
            crm: formData.crm.trim()
          }]);

        if (error) throw error;
      }

      loadDoctors();
      resetForm();
      alert(editingDoctor ? 'Médico atualizado com sucesso!' : 'Médico cadastrado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar médico:', error);
      
      // Tratamento de erro mais específico
      if (error.code === '23505') {
        alert('Erro: CRM já está cadastrado no sistema.');
      } else {
        alert('Erro ao salvar médico. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doctor: CheckupDoctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      crm: doctor.crm
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este médico?')) {
      setLoading(true);
      try {
        // 🔥 CORREÇÃO: Excluir médico direto no Supabase
        const { error } = await supabase
          .from('checkup_doctors')
          .delete()
          .eq('id', id);

        if (error) throw error;

        loadDoctors();
        alert('Médico excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir médico:', error);
        alert('Erro ao excluir médico.');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', crm: '' });
    setEditingDoctor(null);
    setShowForm(false);
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.crm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Cadastro de Médicos - Checkup</h2>
        <button
          onClick={() => setShowForm(true)}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Médico</span>
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-medium mb-4">
            {editingDoctor ? 'Editar Médico' : 'Cadastrar Novo Médico'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Médico *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o nome completo"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CRM *
                </label>
                <input
                  type="text"
                  value={formData.crm}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: SP-123456"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : (editingDoctor ? 'Atualizar' : 'Cadastrar')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou CRM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
      </div>

      {/* Lista de médicos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading && doctors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando médicos...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CRM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Cadastro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDoctors.map((doctor) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(doctor)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
                          title="Editar médico"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doctor.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                          title="Excluir médico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredDoctors.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                {doctors.length === 0 ? 'Nenhum médico cadastrado' : 'Nenhum médico encontrado'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
