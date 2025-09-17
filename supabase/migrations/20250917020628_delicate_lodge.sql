/*
  # Criar tabela users como perfil extra para auth.users

  1. Nova Estrutura
    - `public.users` apenas como tabela de perfis extras
    - Referencia `auth.users(id)` com foreign key
    - Remove password_hash (não mais necessário)
    
  2. Triggers
    - Trigger para criar perfil automaticamente quando usuário é criado no auth
    - Trigger para limpar perfil quando usuário é removido do auth
    
  3. Políticas RLS
    - Acesso baseado em auth.uid()
    - Políticas específicas por perfil
*/

-- 1. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Recriar tabela users sem password_hash
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  profile text NOT NULL CHECK (profile IN ('admin', 'parceiro', 'checkup', 'recepcao')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_profile ON public.users(profile);

-- 4. Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Criar função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'profile', 'checkup')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 8. Criar função auxiliar para verificar perfil
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS text AS $$
BEGIN
  RETURN (SELECT profile FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Políticas RLS para users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated
  USING (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- 10. Atualizar políticas das outras tabelas para usar get_user_profile()
-- Partners
DROP POLICY IF EXISTS "partners_select_all" ON partners;
CREATE POLICY "partners_select_all" ON partners
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "partners_insert_admin" ON partners;
CREATE POLICY "partners_insert_admin" ON partners
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "partners_update_admin" ON partners;
CREATE POLICY "partners_update_admin" ON partners
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "partners_delete_admin" ON partners;
CREATE POLICY "partners_delete_admin" ON partners
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- Units
DROP POLICY IF EXISTS "units_select_all" ON units;
CREATE POLICY "units_select_all" ON units
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "units_insert_admin" ON units;
CREATE POLICY "units_insert_admin" ON units
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "units_update_admin" ON units;
CREATE POLICY "units_update_admin" ON units
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "units_delete_admin" ON units;
CREATE POLICY "units_delete_admin" ON units
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- Doctors
DROP POLICY IF EXISTS "doctors_select_all" ON doctors;
CREATE POLICY "doctors_select_all" ON doctors
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "doctors_insert_admin" ON doctors;
CREATE POLICY "doctors_insert_admin" ON doctors
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "doctors_insert_partner" ON doctors;
CREATE POLICY "doctors_insert_partner" ON doctors
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'parceiro');

DROP POLICY IF EXISTS "doctors_update_admin" ON doctors;
CREATE POLICY "doctors_update_admin" ON doctors
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "doctors_update_partner" ON doctors;
CREATE POLICY "doctors_update_partner" ON doctors
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'parceiro')
  WITH CHECK (get_user_profile() = 'parceiro');

DROP POLICY IF EXISTS "doctors_delete_admin" ON doctors;
CREATE POLICY "doctors_delete_admin" ON doctors
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "doctors_delete_partner" ON doctors;
CREATE POLICY "doctors_delete_partner" ON doctors
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'parceiro');

-- Insurances
DROP POLICY IF EXISTS "insurances_select_all" ON insurances;
CREATE POLICY "insurances_select_all" ON insurances
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insurances_insert_admin" ON insurances;
CREATE POLICY "insurances_insert_admin" ON insurances
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "insurances_insert_partner" ON insurances;
CREATE POLICY "insurances_insert_partner" ON insurances
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'parceiro');

DROP POLICY IF EXISTS "insurances_update_admin" ON insurances;
CREATE POLICY "insurances_update_admin" ON insurances
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "insurances_update_partner" ON insurances;
CREATE POLICY "insurances_update_partner" ON insurances
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'parceiro')
  WITH CHECK (get_user_profile() = 'parceiro');

DROP POLICY IF EXISTS "insurances_delete_admin" ON insurances;
CREATE POLICY "insurances_delete_admin" ON insurances
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "insurances_delete_partner" ON insurances;
CREATE POLICY "insurances_delete_partner" ON insurances
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'parceiro');

-- Exam Requests
DROP POLICY IF EXISTS "exam_requests_select_all" ON exam_requests;
CREATE POLICY "exam_requests_select_all" ON exam_requests
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "exam_requests_insert_admin" ON exam_requests;
CREATE POLICY "exam_requests_insert_admin" ON exam_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "exam_requests_insert_partner" ON exam_requests;
CREATE POLICY "exam_requests_insert_partner" ON exam_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'parceiro');

DROP POLICY IF EXISTS "exam_requests_update_admin" ON exam_requests;
CREATE POLICY "exam_requests_update_admin" ON exam_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "exam_requests_update_partner" ON exam_requests;
CREATE POLICY "exam_requests_update_partner" ON exam_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'parceiro')
  WITH CHECK (get_user_profile() = 'parceiro');

DROP POLICY IF EXISTS "exam_requests_update_reception" ON exam_requests;
CREATE POLICY "exam_requests_update_reception" ON exam_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'recepcao')
  WITH CHECK (get_user_profile() = 'recepcao');

DROP POLICY IF EXISTS "exam_requests_delete_admin" ON exam_requests;
CREATE POLICY "exam_requests_delete_admin" ON exam_requests
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

-- Batteries
DROP POLICY IF EXISTS "batteries_select_all" ON batteries;
CREATE POLICY "batteries_select_all" ON batteries
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "batteries_insert_admin" ON batteries;
CREATE POLICY "batteries_insert_admin" ON batteries
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "batteries_insert_checkup" ON batteries;
CREATE POLICY "batteries_insert_checkup" ON batteries
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'checkup');

DROP POLICY IF EXISTS "batteries_update_admin" ON batteries;
CREATE POLICY "batteries_update_admin" ON batteries
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "batteries_update_checkup" ON batteries;
CREATE POLICY "batteries_update_checkup" ON batteries
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'checkup')
  WITH CHECK (get_user_profile() = 'checkup');

DROP POLICY IF EXISTS "batteries_delete_admin" ON batteries;
CREATE POLICY "batteries_delete_admin" ON batteries
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "batteries_delete_checkup" ON batteries;
CREATE POLICY "batteries_delete_checkup" ON batteries
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'checkup');

-- Checkup Requests
DROP POLICY IF EXISTS "checkup_requests_select_all" ON checkup_requests;
CREATE POLICY "checkup_requests_select_all" ON checkup_requests
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "checkup_requests_insert_admin" ON checkup_requests;
CREATE POLICY "checkup_requests_insert_admin" ON checkup_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "checkup_requests_insert_checkup" ON checkup_requests;
CREATE POLICY "checkup_requests_insert_checkup" ON checkup_requests
  FOR INSERT TO authenticated
  WITH CHECK (get_user_profile() = 'checkup');

DROP POLICY IF EXISTS "checkup_requests_update_admin" ON checkup_requests;
CREATE POLICY "checkup_requests_update_admin" ON checkup_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'admin')
  WITH CHECK (get_user_profile() = 'admin');

DROP POLICY IF EXISTS "checkup_requests_update_checkup" ON checkup_requests;
CREATE POLICY "checkup_requests_update_checkup" ON checkup_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'checkup')
  WITH CHECK (get_user_profile() = 'checkup');

DROP POLICY IF EXISTS "checkup_requests_update_reception" ON checkup_requests;
CREATE POLICY "checkup_requests_update_reception" ON checkup_requests
  FOR UPDATE TO authenticated
  USING (get_user_profile() = 'recepcao')
  WITH CHECK (get_user_profile() = 'recepcao');

DROP POLICY IF EXISTS "checkup_requests_delete_admin" ON checkup_requests;
CREATE POLICY "checkup_requests_delete_admin" ON checkup_requests
  FOR DELETE TO authenticated
  USING (get_user_profile() = 'admin');