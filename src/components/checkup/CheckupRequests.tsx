import React, { useState, useEffect } from 'react';
import { Plus, Eye, Calendar, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';

export function CheckupRequests() {
  const [checkupRequests, setCheckupRequests] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState<any>(null);
  const [formData, setFormData] = useState({
    patient_name: '',
    birth_date: '',
    battery_id: '',
    requesting_company: '',
    exams_to_perform: [] as string[],
    checkup_date: '',
    doctor_id: '',
  });

  useEffect(() => {
    loadCheckupRequests();
    loadBatteries();
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('checkup_doctors')
        .select('*')
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

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

  const loadCheckupRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('checkup_requests')
        .select(`
          *,
          batteries(name),
          units(name),
          checkup_doctors(name, crm)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCheckupRequests(data || []);
    } catch (error) {
      console.error('Error loading checkup requests:', error);
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
      // Preparar dados para envio
      const submitData: any = {
        patient_name: formData.patient_name,
        birth_date: formData.birth_date,
        battery_id: formData.battery_id,
        requesting_company: formData.requesting_company,
        exams_to_perform: formData.exams_to_perform,
        checkup_date: formData.checkup_date || null,
        status: 'solicitado'
      };

      // Só adicionar doctor_id se não estiver vazio
      if (formData.doctor_id) {
        submitData.doctor_id = formData.doctor_id;
      }

      console.log('Enviando dados:', submitData);

      const { error } = await supabase
        .from('checkup_requests')
        .insert([submitData]);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        patient_name: '',
        birth_date: '',
        battery_id: '',
        requesting_company: '',
        exams_to_perform: [],
        checkup_date: '',
        doctor_id: '',
      });
      setSelectedBattery(null);
      await loadCheckupRequests();
      alert('Solicitação de check-up criada com sucesso!');
    } catch (error: any) {
      console.error('Error creating checkup request:', error);
      alert(`Erro ao criar solicitação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

 const generatePDF = (request: any) => {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('SOLICITAÇÃO DE CHECK-UP', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Documento Emitido em: ' + new Date().toLocaleDateString('pt-BR'), 105, 25, { align: 'center' });

  // Informações do paciente
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text('DADOS DO PACIENTE', 20, 45);
  
  doc.setFontSize(12);
  doc.text(`Nome: ${request.patient_name}`, 20, 60);
  
  // Data de nascimento corrigida
  const birthDate = request.birth_date ? 
    new Date(request.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 
    'N/A';
  doc.text(`Data de Nascimento: ${birthDate}`, 20, 70);
    
    // Informações da solicitação
    doc.setFontSize(16);
    doc.text('DADOS DA SOLICITAÇÃO', 20, 90);
    
    doc.setFontSize(12);
    doc.text(`Empresa Solicitante: ${request.requesting_company}`, 20, 105);
    doc.text(`Bateria de Exames: ${request.batteries?.name || 'N/A'}`, 20, 115);
    
    if (request.checkup_doctors) {
      doc.text(`Médico Responsável: ${request.checkup_doctors.name} - CRM: ${request.checkup_doctors.crm}`, 20, 125);
    }
    
    if (request.checkup_date) {
    // Data do checkup corrigida
    const checkupDate = new Date(request.checkup_date + 'T00:00:00').toLocaleDateString('pt-BR');
     doc.text(`Data do Checkup: ${checkupDate}`, 20, 135);
  }
  
    
    doc.text(`Status: ${statusLabels[request.status as keyof typeof statusLabels]}`, 20, 145);
    doc.text(`Data da Solicitação: ${new Date(request.created_at).toLocaleDateString('pt-BR')}`, 20, 155);

    // Exames solicitados
    doc.setFontSize(16);
    doc.text('EXAMES SOLICITADOS', 20, 175);
    
    doc.setFontSize(10);
    let yPosition = 190;
    request.exams_to_perform.forEach((exam: string, index: number) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${index + 1}. ${exam}`, 25, yPosition);
      yPosition += 7;
    });

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento emitido em: ${new Date().toLocaleString('pt-BR')}`, 20, 285);
    doc.text(`ID da Solicitação: ${request.id}`, 150, 285);

    // Salvar PDF
    doc.save(`checkup-${request.patient_name}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado':
        return 'bg-yellow-100 text-yellow-800';
      case 'encaminhado':
        return 'bg-blue-100 text-blue-800';
      case 'executado':
        return 'bg-green-100 text-green-800';
      case 'laudos_prontos':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabels = {
    solicitado: 'Solicitado',
    encaminhado: 'Encaminhado',
    executado: 'Executado',
    laudos_prontos: 'Laudos Prontos'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Médico Responsável</label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um médico</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - CRM: {doctor.crm}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Checkup</label>
                <input
                  type="date"
                  value={formData.checkup_date}
                  onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Opcional"
                />
                <p className="text-xs text-gray-500 mt-1">Data prevista para realização do checkup (opcional)</p>
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
                    {selectedBattery.exams.map((exam: string, index: number) => (
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
                  setFormData({ 
                    patient_name: '', 
                    birth_date: '', 
                    battery_id: '', 
                    requesting_company: '', 
                    exams_to_perform: [],
                    checkup_date: '',
                    doctor_id: '' 
                  });
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

    {/* TABELA DE SOLICITAÇÕES */}
<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900">
      Histórico de Solicitações ({checkupRequests.length})
    </h3>
  </div>
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Paciente
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Data Nasc.
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Empresa
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Médico
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Bateria
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Data Checkup
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
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
  {checkupRequests.map((request) => (
    <tr key={request.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {request.patient_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {/* Data de Nascimento - Corrigida */}
        {new Date(request.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {request.requesting_company}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {request.checkup_doctors ? 
          `${request.checkup_doctors.name} (${request.checkup_doctors.crm})` : 
          'Não informado'
        }
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {request.batteries?.name || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center gap-2">
          {request.checkup_date ? (
            <span className="text-green-600 font-medium">
              {/* Data do Checkup - Corrigida */}
              {new Date(request.checkup_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          ) : (
            <span className="text-gray-400">Não agendado</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
          {statusLabels[request.status as keyof typeof statusLabels]}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {/* Data de criação - mantém como estava pois é datetime */}
        {new Date(request.created_at).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => generatePDF(request)}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 transition-colors"
          title="Gerar PDF"
        >
          <Download className="w-4 h-4" />
          <span>PDF</span>
        </button>
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
