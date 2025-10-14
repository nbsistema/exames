import React, { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, RefreshCw, Bell, CheckCircle, Download, Calendar, FileText, Edit } from 'lucide-react';
import { supabase, Unit } from '../../lib/supabase';
import jsPDF from 'jspdf';

export function CheckupTracking() {
  const [checkupRequests, setCheckupRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [observations, setObservations] = useState('');
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [userProfile, setUserProfile] = useState<string>('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [checkupDate, setCheckupDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    patient_name: '',
    birth_date: '',
    requesting_company: '',
    doctor_id: '',
    battery_id: '',
    exams_to_perform: [] as string[],
    checkup_date: ''
  });
  const [selectedBattery, setSelectedBattery] = useState<any>(null);

  // Função para formatar datas sem problemas de fuso horário
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Adiciona 'T00:00:00' para forçar interpretação no fuso horário local
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };
  
  useEffect(() => {
    loadUserProfile();
    loadData();
    
    // Auto-refresh a cada 1 minuto
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('profile')
          .eq('id', user.id)
          .single();
        setUserProfile(profile?.profile || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      const [checkupsRes, unitsRes, doctorsRes, batteriesRes] = await Promise.all([
        supabase
          .from('checkup_requests')
          .select(`
            *,
            batteries(name),
            units(name),
            checkup_doctors(name, crm)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('units').select('*').order('name'),
        supabase.from('checkup_doctors').select('*').order('name'),
        supabase.from('batteries').select('*').order('name')
      ]);

      if (checkupsRes.error) throw checkupsRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;
      if (batteriesRes.error) throw batteriesRes.error;

      setCheckupRequests(checkupsRes.data || []);
      setUnits(unitsRes.data || []);
      setDoctors(doctorsRes.data || []);
      setBatteries(batteriesRes.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  // 🔥 NOVO: Função para abrir modal de edição
  const openEditModal = (checkup: any) => {
    setSelectedCheckup(checkup);
    setEditFormData({
      patient_name: checkup.patient_name,
      birth_date: checkup.birth_date,
      requesting_company: checkup.requesting_company,
      doctor_id: checkup.doctor_id || '',
      battery_id: checkup.battery_id || '',
      exams_to_perform: checkup.exams_to_perform || [],
      checkup_date: checkup.checkup_date || ''
    });
    
    // Carregar bateria selecionada se houver
    if (checkup.battery_id) {
      const battery = batteries.find(b => b.id === checkup.battery_id);
      setSelectedBattery(battery || null);
    }
    
    setShowEditModal(true);
  };

  // 🔥 NOVO: Função para lidar com seleção de bateria no formulário de edição
  const handleBatterySelect = (batteryId: string) => {
    const battery = batteries.find(b => b.id === batteryId);
    setSelectedBattery(battery || null);
    setEditFormData({ 
      ...editFormData, 
      battery_id: batteryId,
      exams_to_perform: battery?.exams || []
    });
  };

  // 🔥 NOVO: Função para salvar edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckup) return;

    try {
      const { error } = await supabase
        .from('checkup_requests')
        .update({
          patient_name: editFormData.patient_name,
          birth_date: editFormData.birth_date,
          requesting_company: editFormData.requesting_company,
          doctor_id: editFormData.doctor_id || null,
          battery_id: editFormData.battery_id,
          exams_to_perform: editFormData.exams_to_perform,
          checkup_date: editFormData.checkup_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckup.id);

      if (error) throw error;

      await loadData(false);
      setShowEditModal(false);
      setSelectedCheckup(null);
      setEditFormData({
        patient_name: '',
        birth_date: '',
        requesting_company: '',
        doctor_id: '',
        battery_id: '',
        exams_to_perform: [],
        checkup_date: ''
      });
      setSelectedBattery(null);
      alert('Solicitação atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating checkup request:', error);
      alert('Erro ao atualizar solicitação');
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
    doc.text(`Data de Nascimento: ${formatDate(request.birth_date)}`, 20, 70);
    
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
      doc.text(`Data do Checkup: ${formatDate(request.checkup_date)}`, 20, 135);
    }
    
    doc.text(`Status: ${statusLabels[request.status as keyof typeof statusLabels]}`, 20, 145);
    doc.text(`Unidade: ${request.units?.name || 'Não definida'}`, 20, 155);
    
    // Data de criação - mantém datetime pois inclui hora
    doc.text(`Data da Solicitação: ${new Date(request.created_at).toLocaleDateString('pt-BR')}`, 20, 165);

    // Exames solicitados
    doc.setFontSize(16);
    doc.text('EXAMES SOLICITADOS', 20, 185);
    
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

    // Observações
    if (request.observations) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(16);
      doc.text('OBSERVAÇÕES', 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      const observationsLines = doc.splitTextToSize(request.observations, 170);
      doc.text(observationsLines, 20, yPosition);
    }

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento emitido em: ${new Date().toLocaleString('pt-BR')}`, 20, 285);
    doc.text(`ID da Solicitação: ${request.id}`, 150, 285);

    // Salvar PDF
    doc.save(`checkup-${request.patient_name}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleForwardToUnit = async () => {
    if (!selectedCheckup || !selectedUnit) return;

    try {
      const { error } = await supabase
        .from('checkup_requests')
        .update({
          unit_id: selectedUnit,
          status: 'encaminhado',
          observations: observations,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckup.id);

      if (error) throw error;

      await loadData(false);
      setShowForwardForm(false);
      setSelectedCheckup(null);
      setSelectedUnit('');
      setObservations('');
      alert('Check-up encaminhado para unidade com sucesso!');
    } catch (error) {
      console.error('Error forwarding checkup:', error);
      alert('Erro ao encaminhar check-up');
    }
  };

  const openDateModal = (checkup: any) => {
    setSelectedCheckup(checkup);
    setCheckupDate(checkup.checkup_date || '');
    setShowDateModal(true);
  };

  const saveCheckupDate = async () => {
    if (!selectedCheckup) return;

    try {
      const { error } = await supabase
        .from('checkup_requests')
        .update({
          checkup_date: checkupDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckup.id);

      if (error) throw error;

      await loadData(false);
      setShowDateModal(false);
      setSelectedCheckup(null);
      setCheckupDate('');
      alert('Data do checkup atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating checkup date:', error);
      alert('Erro ao atualizar data do checkup');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'laudos_prontos') {
        updateData.laudos_prontos_at = new Date().toISOString();
      } else if (newStatus === 'executado') {
        updateData.notificado_checkup_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('checkup_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await loadData(false);
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    }
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

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusCounts = () => {
    return {
      solicitado: checkupRequests.filter(c => c.status === 'solicitado').length,
      encaminhado: checkupRequests.filter(c => c.status === 'encaminhado').length,
      executado: checkupRequests.filter(c => c.status === 'executado').length,
      laudos_prontos: checkupRequests.filter(c => c.status === 'laudos_prontos').length,
    };
  };

  const statusCounts = getStatusCounts();

  const getStatusActions = (checkup: any) => {
    const actions = [];
    
    // Ações separadas por status atual
    if (userProfile === 'recepcao') {
      if (checkup.status === 'encaminhado') {
        // Quando está encaminhado, só mostra "Marcar Executado"
        actions.push({
          label: 'Marcar Executado',
          status: 'executado',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'green'
        });
      } else if (checkup.status === 'executado') {
        // Quando está executado, só mostra "Laudos Prontos"
        actions.push({
          label: 'Laudos Prontos',
          status: 'laudos_prontos',
          icon: <Bell className="w-4 h-4" />,
          color: 'purple'
        });
      }
    }
    
    // Ação específica para perfil checkup
    if (userProfile === 'checkup' && checkup.status === 'laudos_prontos') {
      actions.push({
        label: 'Buscar Laudos',
        status: 'executado',
        icon: <Download className="w-4 h-4" />,
        color: 'blue'
      });
    }
    
    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Acompanhamento de Check-up</h2>
          <p className="text-sm text-gray-600">
            Última atualização: {formatLastUpdate()} • 
            <span className="text-green-600 ml-1">Atualização automática a cada 1 minuto</span>
          </p>
          <div className="text-sm text-gray-500 mt-1">
            Perfil: <span className="font-medium capitalize">{userProfile}</span>
          </div>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{checkupRequests.length}</div>
          <div className="text-sm text-gray-600">Total de Check-ups</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{statusCounts.solicitado}</div>
          <div className="text-sm text-gray-600">Solicitados</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.encaminhado}</div>
          <div className="text-sm text-gray-600">Encaminhados</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{statusCounts.laudos_prontos}</div>
          <div className="text-sm text-gray-600">Laudos Prontos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{statusCounts.executado}</div>
          <div className="text-sm text-gray-600">Executados</div>
        </div>
      </div>

      {showForwardForm && selectedCheckup && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Encaminhar para Unidade - {selectedCheckup.patient_name}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Destino</label>
              <select
                required
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma unidade</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observações adicionais (opcional)..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleForwardToUnit}
                disabled={!selectedUnit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Encaminhar para Unidade
              </button>
              <button
                onClick={() => {
                  setShowForwardForm(false);
                  setSelectedCheckup(null);
                  setSelectedUnit('');
                  setObservations('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NOVO: Modal de Edição */}
      {showEditModal && selectedCheckup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                Editar Solicitação - {selectedCheckup.patient_name}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Paciente</label>
                    <input
                      type="text"
                      required
                      value={editFormData.patient_name}
                      onChange={(e) => setEditFormData({ ...editFormData, patient_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      required
                      value={editFormData.birth_date}
                      onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Solicitante</label>
                    <input
                      type="text"
                      required
                      value={editFormData.requesting_company}
                      onChange={(e) => setEditFormData({ ...editFormData, requesting_company: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Médico Responsável</label>
                    <select
                      value={editFormData.doctor_id}
                      onChange={(e) => setEditFormData({ ...editFormData, doctor_id: e.target.value })}
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
                      value={editFormData.checkup_date}
                      onChange={(e) => setEditFormData({ ...editFormData, checkup_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bateria de Check-up</label>
                    <select
                      required
                      value={editFormData.battery_id}
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
                              checked={editFormData.exams_to_perform.includes(exam)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditFormData({
                                    ...editFormData,
                                    exams_to_perform: [...editFormData.exams_to_perform, exam]
                                  });
                                } else {
                                  setEditFormData({
                                    ...editFormData,
                                    exams_to_perform: editFormData.exams_to_perform.filter(e => e !== exam)
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

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCheckup(null);
                      setEditFormData({
                        patient_name: '',
                        birth_date: '',
                        requesting_company: '',
                        doctor_id: '',
                        battery_id: '',
                        exams_to_perform: [],
                        checkup_date: ''
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
          </div>
        </div>
      )}

      {showDateModal && selectedCheckup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                Definir Data do Checkup
              </h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paciente: <span className="font-semibold">{selectedCheckup.patient_name}</span>
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Checkup
                </label>
                <input
                  type="date"
                  value={checkupDate}
                  onChange={(e) => setCheckupDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Data prevista para realização do checkup
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowDateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCheckupDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Data
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Check-ups ({checkupRequests.length} registros)
            </h3>
            <div className="text-sm text-gray-600">
              {refreshing && (
                <span className="flex items-center text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                  Atualizando...
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Nascimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bateria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exames
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data do Checkup
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checkupRequests.map((checkup) => {
                  const statusActions = getStatusActions(checkup);
                  
                  return (
                    <tr key={checkup.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {checkup.patient_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Data de Nascimento - Corrigida */}
                        {formatDate(checkup.birth_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkup.requesting_company}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkup.checkup_doctors ? 
                          `${checkup.checkup_doctors.name} (${checkup.checkup_doctors.crm})` : 
                          'Não informado'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkup.batteries?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          {checkup.exams_to_perform?.slice(0, 2).join(', ')}
                          {checkup.exams_to_perform?.length > 2 && ` +${checkup.exams_to_perform.length - 2} mais`}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {checkup.checkup_date ? (
                            <span className="text-green-600 font-medium">
                              {/* Data do Checkup - Corrigida */}
                              {formatDate(checkup.checkup_date)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Não agendado</span>
                          )}
                          <button
                            onClick={() => openDateModal(checkup)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Definir data do checkup"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(checkup.status)}`}>
                            {statusLabels[checkup.status as keyof typeof statusLabels]}
                          </span>
                          {checkup.laudos_prontos_at && (
                            <div className="text-xs text-gray-500">
                              {/* Data de laudos - mantém datetime pois inclui hora */}
                              Laudos: {new Date(checkup.laudos_prontos_at).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkup.units?.name || 'Não encaminhado'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Data de criação - mantém datetime pois inclui hora */}
                        {new Date(checkup.created_at).toLocaleDateString('pt-BR')} {new Date(checkup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-2">
                          {/* 🔥 NOVO: Botão de Edição */}
                          <button
                            onClick={() => openEditModal(checkup)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Editar Solicitação"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Botão para gerar PDF */}
                          <button
                            onClick={() => generatePDF(checkup)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Gerar PDF da Solicitação"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Ação de encaminhar para unidade */}
                          {checkup.status === 'solicitado' && userProfile === 'recepcao' && (
                            <button
                              onClick={() => {
                                setSelectedCheckup(checkup);
                                setShowForwardForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Encaminhar para Unidade"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}

                          {/* Ações de status */}
                          {statusActions.map((action, index) => (
                            <button
                              key={index}
                              onClick={() => updateStatus(checkup.id, action.status)}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-${action.color}-100 text-${action.color}-800 hover:bg-${action.color}-200 transition-colors`}
                              title={action.label}
                            >
                              {action.icon}
                              <span className="hidden sm:inline">{action.label}</span>
                            </button>
                          ))}

                          {/* Observações */}
                          {checkup.observations && (
                            <button
                              className="text-gray-600 hover:text-gray-800 transition-colors"
                              title={`Observações: ${checkup.observations}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
