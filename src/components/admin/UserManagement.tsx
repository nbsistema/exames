import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase, supabaseAdmin, AppUser, UserProfile } from '../../lib/supabase';
import { authService } from '../../lib/auth';

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile: 'parceiro' as UserProfile,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Carregando usuários da tabela public.users...');
      
      // Consultar apenas a tabela public.users (não auth.users)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, profile, created_at, updated_at')
        .order('created_at', { ascending: false });

      
      // Usar a função createUser do contexto de autenticação
      const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          profile: profile
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Erro na criação:', result.error);
        return { error: result.error || 'Erro ao criar usuário' };
      }
        console.error('❌ Erro ao carregar usuários:', error);
      console.log('✅ Usuários carregados:', data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error('❌ Erro interno ao carregar usuários:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar dados antes de enviar
    if (!formData.email.trim() || !formData.name.trim()) {
      alert('Email e nome são obrigatórios');
      return;
    }
    
    if (!formData.email.includes('@')) {
      alert('Email deve ter formato válido');
      return;
    }
    
    setSubmitting(true);

    try {
      console.log('👥 Iniciando criação de usuário:', formData);
      
      // Usar a Netlify Function para criar usuário
      const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: 'nb@123', // Senha padrão
          name: formData.name.trim(),
          profile: formData.profile
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Erro ao criar usuário:', result.error);
        
        // Mostrar erro mais amigável
        if (result.error && (result.error.includes('já está cadastrado') || result.error.includes('already registered'))) {
          alert('Este email já está cadastrado no sistema.');
        } else {
          alert(`Erro ao criar usuário: ${result.error || 'Erro desconhecido'}`);
        }
        return;
      }

      console.log('✅ Usuário criado com sucesso');
      
      // Aguardar um pouco antes de recarregar a lista
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loadUsers();
      setShowForm(false);
      setFormData({ name: '', email: '', profile: 'parceiro' });
      alert('Usuário criado com sucesso!\n\nCredenciais de acesso:\n• Email: ' + formData.email + '\n• Senha: nb@123\n\nO usuário foi automaticamente sincronizado com a tabela users.');
    } catch (error) {
      console.error('❌ Erro interno na criação:', error);
      alert('Erro interno ao criar usuário. Verifique o console para mais detalhes.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      profile: user.profile,
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !supabase) return;
    
    setSubmitting(true);

    try {
      console.log('✏️ Atualizando usuário:', editingUser.id, formData);
      
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name.trim(),
          profile: formData.profile,
        })
        .eq('id', editingUser.id);

      if (error) {
        console.error('❌ Erro ao atualizar usuário:', error);
        alert(`Erro ao atualizar usuário: ${error.message}`);
        return;
      }

      console.log('✅ Usuário atualizado com sucesso');
      await loadUsers();
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', profile: 'parceiro' });
      alert('Usuário atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro interno na atualização:', error);
      alert('Erro interno ao atualizar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      return;
    }

    if (!supabaseAdmin) {
      alert('Operação não disponível - Service Role Key não configurada');
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Excluindo usuário:', userId);
      
      // 1. Remover da tabela public.users
      const { error: deleteUserError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteUserError) {
        console.error('❌ Erro ao excluir da tabela users:', deleteUserError);
        alert(`Erro ao excluir usuário: ${deleteUserError.message}`);
        return;
      }

      // 2. Remover do auth.users
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        console.warn('⚠️ Erro ao excluir do auth (usuário já removido da tabela):', deleteAuthError);
        // Continuar mesmo com erro no auth, pois o usuário já foi removido da tabela
      }

      console.log('✅ Usuário excluído com sucesso');
      await loadUsers();
      alert('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro interno na exclusão:', error);
      alert('Erro interno ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', profile: 'parceiro' });
  };

  const profileLabels = {
    admin: 'Administrador',
    parceiro: 'Parceiro',
    checkup: 'Check-up',
    recepcao: 'Recepção'
  };

  const getProfileColor = (profile: UserProfile) => {
    switch (profile) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'parceiro':
        return 'bg-blue-100 text-blue-800';
      case 'checkup':
        return 'bg-purple-100 text-purple-800';
      case 'recepcao':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && users.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-900">Gestão de Usuários</h2>
          <p className="text-sm text-gray-600">
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={submitting}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </h3>
          <form onSubmit={editingUser ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nome completo do usuário"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required={!editingUser}
                disabled={!!editingUser}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="email@exemplo.com"
              />
              {editingUser && (
                <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso</label>
              <select
                value={formData.profile}
                onChange={(e) => setFormData({ ...formData, profile: e.target.value as UserProfile })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="parceiro">Parceiro</option>
                <option value="recepcao">Recepção</option>
                <option value="checkup">Check-up</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="md:col-span-3 flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (editingUser ? 'Atualizando...' : 'Criando...') : (editingUser ? 'Atualizar Usuário' : 'Criar Usuário')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
          {!editingUser && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Informações importantes:</strong>
                <br />• Senha padrão: <code className="bg-blue-100 px-1 rounded">nb@123</code>
                <br />• O usuário pode fazer login imediatamente após a criação
                <br />• Os dados são salvos diretamente na tabela public.users
                <br />• As senhas são criptografadas automaticamente
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perfil
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Carregando usuários...' : 'Nenhum usuário cadastrado'}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getProfileColor(user.profile)}`}>
                        {profileLabels[user.profile]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          disabled={loading || submitting}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                          title="Editar usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={loading || submitting}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}