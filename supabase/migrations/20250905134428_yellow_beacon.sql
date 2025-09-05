/*
  # Sistema completo de usuários e autenticação

  1. Tabelas
    - `users` - Perfis de usuário com RLS
    - Trigger automático para criação de perfis

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas específicas por perfil de usuário
    - Trigger automático para novos usuários

  3. Funções
    - `handle_new_user()` - Cria perfil automaticamente
    - `update_updated_at_column()` - Atualiza timestamp
*/

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar função para lidar com novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'profile', 'parceiro')
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log do erro mas não falha a criação do usuário
    RAISE WARNING 'Erro ao criar perfil do usuário: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar tabela users se não existir
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  profile text NOT NULL CHECK (profile IN ('admin', 'parceiro', 'checkup', 'recepcao')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_profile ON public.users(profile);

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Permitir inserção de usuários" ON public.users;
DROP POLICY IF EXISTS "Usuários podem ver próprios dados" ON public.users;
DROP POLICY IF EXISTS "Usuários podem ver dados" ON public.users;
DROP POLICY IF EXISTS "Usuários podem atualizar próprios dados" ON public.users;
DROP POLICY IF EXISTS "Usuários podem atualizar dados" ON public.users;
DROP POLICY IF EXISTS "Admin pode excluir usuários" ON public.users;

-- Criar políticas RLS
CREATE POLICY "Permitir inserção de usuários"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Usuários podem ver próprios dados"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin pode ver todos os dados"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Usuários podem atualizar próprios dados"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin pode atualizar dados"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admin pode excluir usuários"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar trigger para novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Garantir que as outras tabelas existam (partners, units, etc.)
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar parceiros"
  ON public.partners
  FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Todos podem visualizar parceiros"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela units
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar unidades"
  ON public.units
  FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Todos podem visualizar unidades"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Criar tabela doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  crm text NOT NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_partner_id ON public.doctors(partner_id);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parceiros podem gerenciar próprios médicos"
  ON public.doctors
  FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
    OR partner_id IN (
      SELECT id FROM public.partners WHERE id = doctors.partner_id
    )
  );

CREATE POLICY "Todos podem visualizar médicos"
  ON public.doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- Criar tabela insurances
CREATE TABLE IF NOT EXISTS public.insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurances_partner_id ON public.insurances(partner_id);

ALTER TABLE public.insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parceiros podem gerenciar próprios convênios"
  ON public.insurances
  FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) = 'admin'
    OR partner_id IN (
      SELECT id FROM public.partners WHERE id = insurances.partner_id
    )
  );

CREATE POLICY "Todos podem visualizar convênios"
  ON public.insurances
  FOR SELECT
  TO authenticated
  USING (true);

-- Criar tabela exam_requests
CREATE TABLE IF NOT EXISTS public.exam_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  birth_date date NOT NULL,
  consultation_date date NOT NULL,
  doctor_id uuid REFERENCES public.doctors(id),
  exam_type text NOT NULL,
  status text NOT NULL DEFAULT 'encaminhado' CHECK (status IN ('encaminhado', 'executado', 'intervencao')),
  payment_type text NOT NULL CHECK (payment_type IN ('particular', 'convenio')),
  insurance_id uuid REFERENCES public.insurances(id),
  partner_id uuid REFERENCES public.partners(id),
  observations text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_requests_partner_id ON public.exam_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_exam_requests_status ON public.exam_requests(status);
CREATE INDEX IF NOT EXISTS idx_exam_requests_created_at ON public.exam_requests(created_at);

ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar solicitações de exame"
  ON public.exam_requests
  FOR ALL
  TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS update_exam_requests_updated_at ON public.exam_requests;
CREATE TRIGGER update_exam_requests_updated_at
  BEFORE UPDATE ON public.exam_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela batteries
CREATE TABLE IF NOT EXISTS public.batteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exams text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.batteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkup e Admin podem gerenciar baterias"
  ON public.batteries
  FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM public.users WHERE id = auth.uid()) IN ('admin', 'checkup')
  );

CREATE POLICY "Todos podem visualizar baterias"
  ON public.batteries
  FOR SELECT
  TO authenticated
  USING (true);

-- Criar tabela checkup_requests
CREATE TABLE IF NOT EXISTS public.checkup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  birth_date date NOT NULL,
  battery_id uuid REFERENCES public.batteries(id),
  requesting_company text NOT NULL,
  exams_to_perform text[] NOT NULL DEFAULT '{}',
  unit_id uuid REFERENCES public.units(id),
  observations text DEFAULT '',
  status text NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'encaminhado', 'executado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkup_requests_battery_id ON public.checkup_requests(battery_id);
CREATE INDEX IF NOT EXISTS idx_checkup_requests_unit_id ON public.checkup_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_checkup_requests_status ON public.checkup_requests(status);
CREATE INDEX IF NOT EXISTS idx_checkup_requests_created_at ON public.checkup_requests(created_at);

ALTER TABLE public.checkup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar solicitações de checkup"
  ON public.checkup_requests
  FOR ALL
  TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS update_checkup_requests_updated_at ON public.checkup_requests;
CREATE TRIGGER update_checkup_requests_updated_at
  BEFORE UPDATE ON public.checkup_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();