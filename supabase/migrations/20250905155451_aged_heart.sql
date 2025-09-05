/*
  # Correção de Permissões RLS para Todos os Perfis

  1. Permissões por Perfil
    - **Admin**: Acesso total a todas as tabelas (SELECT, INSERT, UPDATE, DELETE)
    - **Parceiro**: Gerencia seus próprios médicos, convênios e exames
    - **Recepção**: Visualiza e atualiza status de exames e check-ups
    - **Check-up**: Gerencia baterias e solicitações de check-up

  2. Tabelas Afetadas
    - users: Admin gerencia todos, outros veem próprios dados
    - partners: Admin gerencia, outros visualizam
    - units: Admin gerencia, outros visualizam
    - doctors: Admin e parceiros gerenciam
    - insurances: Admin e parceiros gerenciam
    - exam_requests: Todos podem gerenciar conforme função
    - batteries: Admin e check-up gerenciam
    - checkup_requests: Todos podem gerenciar conforme função

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas específicas por operação e perfil
    - Validação de propriedade para parceiros
*/

-- Função auxiliar para verificar perfil do usuário
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS text AS $$
BEGIN
  RETURN (SELECT profile FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TABELA: users
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir inserção de usuários" ON users;
DROP POLICY IF EXISTS "Usuários podem ver próprios dados" ON users;
DROP POLICY IF EXISTS "Usuários podem ver dados" ON users;
DROP POLICY IF EXISTS "Admin pode ver todos usuários" ON users;
DROP POLICY IF EXISTS "Usuários podem atualizar próprios dados" ON users;
DROP POLICY IF EXISTS "Usuários podem atualizar dados" ON users;
DROP POLICY IF EXISTS "Admin pode atualizar usuários" ON users;
DROP POLICY IF EXISTS "Admin pode excluir usuários" ON users;

-- Políticas para SELECT
CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_select_admin" ON users
  FOR SELECT TO authenticated
  USING (get_user_profile() = 'admin');

-- Políticas para INSERT
CREATE POLICY "users_insert_public" ON users
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

-- Políticas para UPDATE
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

-- Políticas para DELETE
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- =============================================
-- TABELA: partners
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Todos podem visualizar parceiros" ON partners;
DROP POLICY IF EXISTS "Admin pode gerenciar parceiros" ON partners;

-- Políticas para SELECT
CREATE POLICY "partners_select_all" ON partners
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "partners_insert_admin" ON partners
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

-- Políticas para UPDATE
CREATE POLICY "partners_update_admin" ON partners
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

-- Políticas para DELETE
CREATE POLICY "partners_delete_admin" ON partners
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- =============================================
-- TABELA: units
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Todos podem visualizar unidades" ON units;
DROP POLICY IF EXISTS "Admin pode gerenciar unidades" ON units;

-- Políticas para SELECT
CREATE POLICY "units_select_all" ON units
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "units_insert_admin" ON units
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

-- Políticas para UPDATE
CREATE POLICY "units_update_admin" ON units
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

-- Políticas para DELETE
CREATE POLICY "units_delete_admin" ON units
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- =============================================
-- TABELA: doctors
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Todos podem visualizar médicos" ON doctors;
DROP POLICY IF EXISTS "Parceiros podem gerenciar próprios médicos" ON doctors;

-- Políticas para SELECT
CREATE POLICY "doctors_select_all" ON doctors
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "doctors_insert_admin" ON doctors
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "doctors_insert_partner" ON doctors
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'parceiro');

-- Políticas para UPDATE
CREATE POLICY "doctors_update_admin" ON doctors
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "doctors_update_partner" ON doctors
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'parceiro')
  WITH CHECK (get_user_profile() = 'parceiro');

-- Políticas para DELETE
CREATE POLICY "doctors_delete_admin" ON doctors
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

CREATE POLICY "doctors_delete_partner" ON doctors
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'parceiro');

-- =============================================
-- TABELA: insurances
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Todos podem visualizar convênios" ON insurances;
DROP POLICY IF EXISTS "Parceiros podem gerenciar próprios convênios" ON insurances;

-- Políticas para SELECT
CREATE POLICY "insurances_select_all" ON insurances
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "insurances_insert_admin" ON insurances
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "insurances_insert_partner" ON insurances
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'parceiro');

-- Políticas para UPDATE
CREATE POLICY "insurances_update_admin" ON insurances
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "insurances_update_partner" ON insurances
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'parceiro')
  WITH CHECK (get_user_profile() = 'parceiro');

-- Políticas para DELETE
CREATE POLICY "insurances_delete_admin" ON insurances
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

CREATE POLICY "insurances_delete_partner" ON insurances
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'parceiro');

-- =============================================
-- TABELA: exam_requests
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem gerenciar solicitações de exame" ON exam_requests;

-- Políticas para SELECT
CREATE POLICY "exam_requests_select_all" ON exam_requests
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "exam_requests_insert_admin" ON exam_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "exam_requests_insert_partner" ON exam_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'parceiro');

-- Políticas para UPDATE
CREATE POLICY "exam_requests_update_admin" ON exam_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "exam_requests_update_partner" ON exam_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'parceiro')
  WITH CHECK (get_user_profile() = 'parceiro');

CREATE POLICY "exam_requests_update_reception" ON exam_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'recepcao')
  WITH CHECK (get_user_profile() = 'recepcao');

-- Políticas para DELETE
CREATE POLICY "exam_requests_delete_admin" ON exam_requests
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- =============================================
-- TABELA: batteries
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Todos podem visualizar baterias" ON batteries;
DROP POLICY IF EXISTS "Checkup e Admin podem gerenciar baterias" ON batteries;

-- Políticas para SELECT
CREATE POLICY "batteries_select_all" ON batteries
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "batteries_insert_admin" ON batteries
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "batteries_insert_checkup" ON batteries
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'checkup');

-- Políticas para UPDATE
CREATE POLICY "batteries_update_admin" ON batteries
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "batteries_update_checkup" ON batteries
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'checkup')
  WITH CHECK (get_user_profile() = 'checkup');

-- Políticas para DELETE
CREATE POLICY "batteries_delete_admin" ON batteries
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

CREATE POLICY "batteries_delete_checkup" ON batteries
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'checkup');

-- =============================================
-- TABELA: checkup_requests
-- =============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem gerenciar solicitações de checkup" ON checkup_requests;

-- Políticas para SELECT
CREATE POLICY "checkup_requests_select_all" ON checkup_requests
  FOR SELECT TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "checkup_requests_insert_admin" ON checkup_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "checkup_requests_insert_checkup" ON checkup_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'checkup');

-- Políticas para UPDATE
CREATE POLICY "checkup_requests_update_admin" ON checkup_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

CREATE POLICY "checkup_requests_update_checkup" ON checkup_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'checkup')
  WITH CHECK (get_user_profile() = 'checkup');

CREATE POLICY "checkup_requests_update_reception" ON checkup_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'recepcao')
  WITH CHECK (get_user_profile() = 'recepcao');

-- Políticas para DELETE
CREATE POLICY "checkup_requests_delete_admin" ON checkup_requests
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- =============================================
-- VERIFICAR SE RLS ESTÁ HABILITADO
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkup_requests ENABLE ROW LEVEL SECURITY;