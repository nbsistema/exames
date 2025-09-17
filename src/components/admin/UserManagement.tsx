import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { supabase, supabaseAdmin, UserProfile } from '../../lib/supabase';
import { databaseAuth } from '../../lib/database-auth';

interface AppUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile; // sempre o do DB
  created_at: string;
  updated_at: string;
  _authProfile?: UserProfile | null;
  _profileMismatch?: boolean;
}

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
      if (!supabaseAdmin) {
        console.error('❌ Service Role Key não configurada');
        setUsers([]);
        return;
      }

      // 1) auth.users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Erro ao carregar auth.users:', authError);
        setUsers([]);
        return;
      }

      // 2) public.users
      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select('id, email, name, profile, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('❌ Erro ao carregar public.users:', profileError);
        setUsers([]);
        return;
      }

      // 3) Combinar (sem fallback para mascarar)
      const combined: AppUser[] = authUsers.users.map((au) => {
        const db = profiles?.find((p) => p.id === au.id);
        const authProfile = (au.user_metadata?.profile ?? null) as UserProfile | null;

        const effectiveProfile = (db?.profile as UserProfile) ?? ('checkup' as UserProfile);
        const mismatch =
          authProfile != null &&
          db?.profile != null &&
          (authProfile as string) !== (db.profile as string);

        return {
          id: au.id,
          email: db?.email || au.email || '',
          name: db?.name || au.user_metadata?.name || au.email?.split('@')[0] || 'Usuário',
          profile: effectiveProfile,
          created_at: db?.created_at || au.created_at,
          updated_at: db?.updated_at || au.updated_at || au.created_at,
          _authProfile: authProfile,
          _profileMismatch: !!mismatch,
        };
      });

      setUsers(combined);
    } catch (error) {
      console.error('❌ Erro interno ao carregar usuários:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { error } = await databaseAuth.createUser(
        formData.email.trim().toLowerCase(),
        formData.name.trim(),
        formData.profile,
        'nb@123'
      );

      if (error) {
        console.error('❌ Erro ao criar usuário:', error);
        alert(`Erro ao criar usuário: ${error}`);
        return;
      }

      await loadUsers();
      setShowForm(false);
      setFormData({ name: '', email: '', profile: 'parceiro' });
      alert(
        'Usuário criado com sucesso!\n\nCredenciais de acesso:\n• Email: ' +
          formData.email +
          '\n• Senha: nb@123'
      );
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
      profile: user.profile, // <- valor atual do DB, editável
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !supabase || !supabaseAdmin) return;

    setSubmitting(true);
    try {
      // 1) Atualiza metadata (para manter auth consistente com o DB)
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(editingUser.id, {
        user_metadata: {
          name: formData.name.trim(),
          profile: formData.profile, // <- perfil desejado
        },
      });
      if (authError) {
        console.error('❌ Erro ao atualizar auth.users:', authError);
        alert(`Erro ao atualizar usuário (auth): ${authError.message}`);
        return;
      }

      // 2) Atualiza na tabela public.users (fonte de verdade no front)
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.name.trim(),
          profile: formData.profile, // <- perfil desejado
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (profileError) {
        console.error('❌ Erro ao atualizar perfil (DB):', profileError);
        alert(`Erro ao atualizar perfil (DB): ${profileError.message}`);
        return;
      }

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
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) return;
    if (!supabaseAdmin) {
      alert('Operação não disponível - Service Role Key não configurada');
      return;
    }

    setLoading(true);
    try {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.error('❌ Erro ao excluir do auth.users:', deleteAuthError);
        alert(`Erro ao excluir usuário: ${deleteAuthError.message}`);
        return;
      }

      const { error: deleteProfileError } = await supabaseAdmin.from('users').delete().eq('id', userId);
      if (deleteProfileError) {
        console.warn('⚠️ Erro ao excluir perfil (usuário já removido do auth):', deleteProfileError);
      }

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

  const profileLabels: Record<UserProfile, string> = {
    admin: 'Administrador',
    parceiro: 'Parceiro',
    checkup: 'Check-up',
    recepcao: 'Recepção',
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

  const hasMismatch = users.some((u) => u._profileMismatch);

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

      {hasMismatch && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div className="text-sm">
            <strong>Atenção:</strong> Existem usuários com divergência entre o perfil do <em>auth</em> e o do banco.
            O sistema exibe o perfil do banco. Faça o backfill se necessário.
          </div>
        </div>
      )}

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
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  editingUser ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="email@exemplo.com"
              />
              {editingUser && <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>}
            </div>

            {/* PERFIL EDITÁVEL NA EDIÇÃO */}
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
              {editingUser && (
                <p className="text-xs text-gray-500 mt-1">
                  Selecione o perfil desejado e clique em <strong>Atualizar Usuário</strong>.
                </p>
              )}
            </div>

            <div className="md:col-span-3 flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (editingUser ? 'Atualizando...' : 'Criando...') : editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
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
                <br />• Usuário é criado no <code>auth.users</code> e em <code>public.users</code> com o perfil selecionado
                <br />• Email confirmado automaticamente
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getProfileColor(
                            user.profile
                          )}`}
                        >
                          {profileLabels[user.profile]}
                        </span>
                        {user._profileMismatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            Divergência
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          disabled={loading || submitting}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                          title="Editar usuário (inclui mudar perfil)"
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
