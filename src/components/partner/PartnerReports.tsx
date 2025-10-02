import React, { useState, useEffect } from 'react';
import { Download, FileText, Filter, Calendar, User, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function PartnerReports() {
  const [partnerRequests, setExamRequests] = useState<any[]>([]);
  const [filteredExams, setFilteredExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userProfile, setUserProfile] = useState<string>('');
  const [userPartnerId, setUserPartnerId] = useState<string | null>(null);
  const [currentPartner, setCurrentPartner] = useState<any>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentType: '',
    conduct: '',
    patientName: ''
  });

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userProfile) {
      loadExamRequests();
    }
  }, [userProfile, userPartnerId]);

  useEffect(() => {
    applyFilters();
  }, [examRequests, filters]);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('profile, partner_id, partners(name)')
          .eq('id', user.id)
          .single();
      
        if (userData) {
          setUserProfile(userData.profile || '');
          setUserPartnerId(userData.partner_id);
          if (userData.partners) {
            setCurrentPartner(userData.partners);
          }
          console.log('👤 Usuário relatórios:', {
            profile: userData.profile,
            partnerId: userData.partner_id,
            partnerName: userData.partners?.name
          });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadExamRequests = async () => {
    setLoading(true);
  
    try {
      let query = supabase
        .from('exam_requests')
        .select(`
          *,
          doctors(name, crm),
          insurances(name),
          partners(name)
        `)
        .order('created_at', { ascending: false });

      // 🔒 FILTRO POR PARCEIRO - usuários parceiros veem apenas seus exames
      if (userProfile === 'parceiro' && userPartnerId) {
        console.log('🔒 Filtrando exames do parceiro para relatório:', userPartnerId);
        query = query.eq('partner_id', userPartnerId);
      }

      const { data, error } = await query;

      if (error) throw error;
    
      console.log('📊 Exames para relatório:', data?.length);
      setExamRequests(data || []);
    } catch (error) {
      console.error('Error loading exam requests for reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...examRequests];

    // Filtro por data
    if (filters.startDate) {
      filtered = filtered.filter(exam => 
        new Date(exam.created_at) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Fim do dia
      filtered = filtered.filter(exam => 
        new Date(exam.created_at) <= endDate
      );
    }

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(exam => exam.status === filters.status);
    }

    // Filtro por tipo de pagamento
    if (filters.paymentType) {
      filtered = filtered.filter(exam => exam.payment_type === filters.paymentType);
    }

    // Filtro por conduta
    if (filters.conduct) {
      filtered = filtered.filter(exam => exam.conduct === filters.conduct);
    }

    // Filtro por nome do paciente
    if (filters.patientName) {
      filtered = filtered.filter(exam => 
        exam.patient_name.toLowerCase().includes(filters.patientName.toLowerCase())
      );
    }

    setFilteredExams(filtered);
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Preparar dados para exportação
      const exportData = filteredExams.map(exam => ({
        'Paciente': exam.patient_name,
        'Telefone': exam.phone || 'Não informado',
        'Data Nascimento': new Date(exam.birth_date).toLocaleDateString('pt-BR'),
        'Data Consulta': new Date(exam.consultation_date).toLocaleDateString('pt-BR'),
        'Médico': exam.doctors?.name || 'N/A',
        'CRM': exam.doctors?.crm || 'N/A',
        'Tipo de Exame': exam.exam_type,
        'Status': getStatusLabel(exam.status),
        'Conduta': getConductLabel(exam.conduct),
        'Observações Conduta': exam.conduct_observations || '',
        'Tipo Pagamento': exam.payment_type === 'particular' ? 'Particular' : 'Convênio',
        'Convênio': exam.insurances?.name || 'N/A',
        'Parceiro': exam.partners?.name || 'N/A',
        'Observações': exam.observations || '',
        'Data Criação': new Date(exam.created_at).toLocaleDateString('pt-BR'),
        'Hora Criação': new Date(exam.created_at).toLocaleTimeString('pt-BR')
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Exames');

      // Gerar nome do arquivo
      const partnerName = currentPartner?.name ? `_${currentPartner.name.replace(/\s+/g, '_')}` : '';
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Relatorio_Exames${partnerName}_${dateStr}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(wb, fileName);

      console.log('✅ Excel exportado com sucesso:', exportData.length, 'registros');
    } catch (error) {
      console.error('❌ Erro ao exportar Excel:', error);
      alert('Erro ao exportar para Excel');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Criar novo PDF
      const doc = new jsPDF();
      
      // Configurações do PDF
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);

      // Cabeçalho
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE EXAMES', margin, 20);
      
      // Informações do relatório
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Parceiro: ${currentPartner?.name || 'Todos'}`, margin, 30);
      doc.text(`Período: ${filters.startDate ? new Date(filters.startDate).toLocaleDateString('pt-BR') : 'Início'} a ${filters.endDate ? new Date(filters.endDate).toLocaleDateString('pt-BR') : 'Fim'}`, margin, 35);
      doc.text(`Total de registros: ${filteredExams.length}`, margin, 40);
      doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, margin, 45);

      // Preparar dados para a tabela
      const tableData = filteredExams.map(exam => [
        exam.patient_name,
        exam.phone || 'Não informado',
        new Date(exam.birth_date).toLocaleDateString('pt-BR'),
        new Date(exam.consultation_date).toLocaleDateString('pt-BR'),
        exam.doctors?.name || 'N/A',
        exam.exam_type.substring(0, 30) + (exam.exam_type.length > 30 ? '...' : ''),
        getStatusLabel(exam.status),
        getConductLabel(exam.conduct),
        exam.payment_type === 'particular' ? 'Particular' : `Convênio (${exam.insurances?.name || 'N/A'})`
      ]);

      // Configurar colunas da tabela
      const headers = [
        'Paciente',
        'Telefone',
        'Nascimento',
        'Consulta',
        'Médico',
        'Exame',
        'Status',
        'Conduta',
        'Pagamento'
      ];

      // Adicionar tabela ao PDF
      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: 50,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 15 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 15 },
          7: { cellWidth: 15 },
          8: { cellWidth: 20 }
        },
        didDrawPage: (data: any) => {
          // Rodapé em cada página
          doc.setFontSize(8);
          doc.setTextColor(128);
          doc.text(
            `Página ${data.pageNumber}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      // Gerar nome do arquivo
      const partnerName = currentPartner?.name ? `_${currentPartner.name.replace(/\s+/g, '_')}` : '';
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Relatorio_Exames${partnerName}_${dateStr}.pdf`;

      // Salvar PDF
      doc.save(fileName);

      console.log('✅ PDF exportado com sucesso:', filteredExams.length, 'registros');
    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error);
      alert('Erro ao exportar para PDF');
    } finally {
      setExporting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      encaminhado: 'Encaminhado ao CTR',
      executado: 'Executado'
    };
    return labels[status] || status;
  };

  const getConductLabel = (conduct: string) => {
    const labels: { [key: string]: string } = {
      cirurgica: 'Cirúrgica',
      ambulatorial: 'Ambulatorial'
    };
    return labels[conduct] || (conduct ? conduct : 'Não definida');
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      paymentType: '',
      conduct: '',
      patientName: ''
    });
  };

  const getStats = () => {
    const total = filteredExams.length;
    const encaminhados = filteredExams.filter(e => e.status === 'encaminhado').length;
    const executados = filteredExams.filter(e => e.status === 'executado').length;
    const particulares = filteredExams.filter(e => e.payment_type === 'particular').length;
    const convenios = filteredExams.filter(e => e.payment_type === 'convenio').length;

    return { total, encaminhados, executados, particulares, convenios };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Relatórios de Exames</h2>
          <p className="text-sm text-gray-600">
            {currentPartner ? `Parceiro: ${currentPartner.name}` : 'Todos os parceiros'} • 
            {filteredExams.length} exames no total
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToExcel}
            disabled={exporting || filteredExams.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>{exporting ? 'Exportando...' : 'Excel'}</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting || filteredExams.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exportando...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
          <div className="text-sm text-blue-600">Total</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">{stats.encaminhados}</div>
          <div className="text-sm text-blue-600">Encaminhados</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">{stats.executados}</div>
          <div className="text-sm text-green-600">Executados</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-800">{stats.particulares}</div>
          <div className="text-sm text-purple-600">Particulares</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-800">{stats.convenios}</div>
          <div className="text-sm text-orange-600">Convênios</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filtros do Relatório
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Data Início
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Data Fim
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="encaminhado">Encaminhado</option>
              <option value="executado">Executado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
            <select
              value={filters.paymentType}
              onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="particular">Particular</option>
              <option value="convenio">Convênio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conduta</label>
            <select
              value={filters.conduct}
              onChange={(e) => setFilters({ ...filters, conduct: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              <option value="cirurgica">Cirúrgica</option>
              <option value="ambulatorial">Ambulatorial</option>
              <option value="null">Não definida</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              Paciente
            </label>
            <input
              type="text"
              value={filters.patientName}
              onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
              placeholder="Buscar paciente..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4 space-x-3">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Limpar Filtros
          </button>
          <button
            onClick={loadExamRequests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Atualizar Dados
          </button>
        </div>
      </div>

      {/* Preview dos dados */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Prévia dos Dados ({filteredExams.length} registros)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredExams.length === 0 ? 'Nenhum dado para exibir' : 'Visualização dos dados que serão exportados'}
          </p>
        </div>
        
        {filteredExams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Consulta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exame
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conduta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExams.slice(0, 10).map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exam.patient_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.phone || 'Não informado'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exam.consultation_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.doctors?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="break-words">
                        {exam.exam_type.length > 50 
                          ? `${exam.exam_type.substring(0, 50)}...` 
                          : exam.exam_type
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getStatusLabel(exam.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getConductLabel(exam.conduct)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {exam.payment_type === 'particular' ? 'Particular' : `Convênio (${exam.insurances?.name || 'N/A'})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredExams.length > 10 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Mostrando 10 de {filteredExams.length} registros. Exporte para ver todos os dados.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum dado encontrado com os filtros aplicados</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajuste os filtros ou atualize os dados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
