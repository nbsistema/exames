import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase, Battery } from '../../lib/supabase';

export function CheckupRequests() {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);
  const [formData, setFormData] = useState({
    patient_name: '',
    birth_date: '',
    battery_id: '',
    requesting_company: '',
    exams_to_perform: [] as string[],
  });

  useEffect(() => {
    loadBatteries();
  }, []);

  const loadBatteries = async () => {
    try {
      const { data, error } = await supabase
        .from('batteries')
        .select('*')
        .order('name');

      if (error) throw error;
      setBatteries(data || []);
    } catch (error) {
      console.error('Error loading batteries:', error);
    }
  };

  const handleBatterySelect = (batteryId: string) => {
    const battery = batteries.find(b => b.id === batteryId);
    setSelectedBattery(battery || null);
    setFormData({ 
      ...formData, 
      battery_id: batteryId,
      exams_to_perform: battery?.exams || []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('checkup_requests')
        .insert([formData]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        patient_name: '',
        birth_date: '',
        battery_id: '',
        requesting_company: '',
        exams_to_perform: [],
      });
      setSelectedBattery(null);
      alert('Solicitação de check-up criada com sucesso!');
    } catch (error) {
      console.error('Error creating checkup request:', error);
      alert('Erro ao criar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Solicitações de Check-up</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Solicitação</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova Solicitação de Check-up</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Solicitante</label>
                <input
                  type="text"
                  required
                  value={formData.requesting_company}
                  onChange={(e) => setFormData({ ...formData, requesting_company: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bateria de Check-up</label>
                <select
                  required
                  value={formData.battery_id}
                  onChange={(e) => handleBatterySelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma bateria</option>
                  {batteries.map((battery) => (
                    <option key={battery.id} value={battery.id}>
                      {battery.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedBattery && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exames a Realizar</label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Bateria selecionada: <strong>{selectedBattery.name}</strong></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedBattery.exams.map((exam, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.exams_to_perform.includes(exam)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                exams_to_perform: [...formData.exams_to_perform, exam]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                exams_to_perform: formData.exams_to_perform.filter(e => e !== exam)
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{exam}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || formData.exams_to_perform.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Criando...' : 'Criar Solicitação'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', birth_date: '', battery_id: '', requesting_company: '', exams_to_perform: [] });
                  setSelectedBattery(null);
                }}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}