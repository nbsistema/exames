import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Building } from 'lucide-react';
import { supabase, supabaseAdmin, UserProfile } from '../../lib/supabase';
import { databaseAuth } from '../../lib/database-auth';

interface AppUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
  partner_id?: string;
  partner_name?: string;
  created_at: string;
  updated_at: string;
  _authProfile?: UserProfile | null;
  _profileMismatch?: boolean;
}

interface Partner {
  id: string;
  name: string;
  company_type: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile: 'parceiro' as UserProfile,
    partner_id: '' as string | undefined,
  });

  useEffect(() => {
    loadPartners();
    loadUsers();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, company_type')
        .order('name');

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
    }
  };

  const loadUsers = async () => {
    if (!supabase) {
      console.warn('⚠️ Supabase não configurado');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Carregando usuários (auth.users + public.users)…');

      // 1) Lista auth.users
      if (!supabaseAdmin) {
        console.error('❌ Service Role Key não configurada');
        setUsers([]);
        return;
      }
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Erro ao carregar auth.users:', authError);
        setUsers([]);
        return;
      }

      // 2) Busca perfis no DB com informações do parceiro
      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select(`
          id, 
          email, 
          name, 
          profile, 
          partner_id,
          partners!inner (id, name),
          created_at, 
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('❌ Erro ao carregar perfis do DB:', profileError);
        setUsers([]);
        return;
      }

      // 3) Combina os dados
      const combinedUsers: AppUser[] = authUsers.users.map((au) => {
        const db = profiles?.find((p) => p.id === au.id);
        const authProfile = (au.user_metadata?.profile ?? null) as UserProfile | null;

        const effectiveProfile = (db?.profile as UserProfile) ?? ('checkup' as UserProfile);
        const mismatch =
          authProfile != null &&
          db?.profile != null &&
          String(authProfile) !== String(db.profile);

        return {
          id: au.id,
          email: db?.email || au.email || '',
          name: db?.name || au.user_metadata?.name || au.email?.split('@')[0] || 'Usuário',
          profile: effectiveProfile,
          partner_id: db?.partner_id || undefined,
          partner_name: db?.partners?.name || undefined,
          created_at: db?.created_at || au.created_at,
          updated_at: db?.updated_at || au.updated_at || au.created_at,
          _authProfile: authProfile,
          _profileMismatch: !!mismatch,
        };
      });

      console.log('✅ Usuários carregados:', combinedUsers.length);
      setUsers(combinedUsers);
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
      console.log('👥 Criando/Atualizando usuário (auth + public.users):', formData);

      const email = formData.email.trim().toLowerCase();

      // 1) Verifica se o usuário já existe na tabela users pelo email
      const { data: existingDbUser, error: checkDbError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (checkDbError && checkDbError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar usuário existente no DB:', checkDbError);
        alert(`Erro ao verificar usuário no DB: ${checkDbError.message}`);
        return;
      }

      // 2) Verifica se o usuário já existe no auth.users
      const { data: authUsers, error: checkAuthError } = await supabaseAdmin.auth.admin.listUsers();
      if (checkAuthError) {
        console.error('❌ Erro ao verificar auth.users:', checkAuthError);
        alert(`Erro ao verificar auth.users: ${checkAuthError.message}`);
        return;
      }

      const existingAuthUser = authUsers.users.find(u => u.email === email);

      let userId: string;

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log('Usuário existente encontrado no auth, atualizando...');
      } else {
        // Cria novo usuário no auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: 'nb@123',
          email_confirm: true,
          user_metadata: { 
            name: formData.name.trim(), 
            profile: formData.profile 
          },
        });

        if (authError) {
          console.error('❌ Erro ao criar usuário no auth:', authError);
          alert(`Erro ao criar usuário no auth: ${authError.message}`);
          return;
        }

        userId = authData.user.id;
        console.log('Novo usuário criado no auth:', userId);
      }

      // 3) Upsert no DB com partner_id
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          name: formData.name.trim(),
          profile: formData.profile,
          partner_id: formData.partner_id || null,
          created_at: existingDbUser ? undefined : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (dbError) {
        console.error('❌ Erro ao upsert no DB:', dbError);
        alert(`Erro ao upsert no DB: ${dbError.message}`);
        return;
      }

      // 4) Atualiza metadata no auth para consistência
      if (existingAuthUser) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { 
            name: formData.name.trim(), 
            profile: formData.profile 
          },
        });
        if (updateAuthError) {
          console.warn('⚠️ Erro ao atualizar metadata no auth:', updateAuthError);
        }
      }

      await loadUsers();
      setShowForm(false);
      setFormData({ name: '', email: '', profile: 'parceiro', partner_id: '' });
      alert(
        'Usuário criado/atualizado com sucesso!\n\nCredenciais de acesso:\n• Email: ' +
          formData.email +
          '\n• Senha: nb@123'
      );
    } catch (error) {
      console.error('❌ Erro interno na criação/atualização:', error);
      alert('Erro interno ao criar/atualizar usuário. Verifique o console para mais detalhes.');
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
      partner_id: user.partner_id || '',
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !supabase || !supabaseAdmin) return;

    setSubmitting(true);
    try {
      console.log('✏️ Atualizando usuário:', editingUser.id, formData);

      // 1) Atualiza metadata no auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(editingUser.id, {
        user_metadata: {
          name: formData.name.trim(),
          profile: formData.profile,
        },
      });
      if (authError) {
        console.error('❌ Erro ao atualizar auth.users:', authError);
        alert(`Erro ao atualizar usuário (auth): ${authError.message}`);
        return;
      }

      // 2) Atualiza no DB incluindo partner_id
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.name.trim(),
          profile: formData.profile,
          partner_id: formData.partner_id || null,
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
      setFormData({ name: '', email: '', profile: 'parceiro', partner_id: '' });
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
      console.log('🗑️ Excluindo usuário:', userId);

      // 1) remove no auth
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.error('❌ Erro ao excluir do auth.users:', deleteAuthError);
        alert(`Erro ao excluir usuário: ${deleteAuthError.message}`);
        return;
      }

      // 2) remove do DB
      const { error: deleteProfileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteProfileError) {
        console.warn('⚠️ Erro ao excluir perfil:', deleteProfileError);
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
    setFormData({ name: '', email: '', profile: 'parceiro', partner_id: '' });
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
            <strong>Atenção:</strong> Existem usuários com divergência entre o perfil do <em>auth</em> e do banco.
            O sistema exibe o perfil do banco. Se precisar, rode o backfill para alinhar.
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </h3>
          <form onSubmit={editingUser ? handleUpdate : handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parceiro (opcional)</label>
              <select
                value={formData.partner_id || ''}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Nenhum parceiro</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} ({partner.company_type})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Apenas para usuários parceiros</p>
            </div>
            <div className="md:col-span-4 flex space-x-3">
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
                <br />• Parceiro é opcional e pode ser atribuído posteriormente
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parceiro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Carregando usuários...' : 'Nenhum usuário cadastrado'}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getProfileColor(user.profile)}`}
                      >
                        {profileLabels[user.profile]}
                      </span>
                      {user._profileMismatch && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          Divergência
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.partner_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          <Building className="w-3 h-3" />
                          {user.partner_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
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
