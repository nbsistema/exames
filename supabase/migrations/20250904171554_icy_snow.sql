/*
  # Sistema NB Hub Exames - Schema Inicial

  1. Novas Tabelas
    - `users` - Usuários do sistema com perfis
    - `partners` - Parceiros/empresas
    - `units` - Unidades cadastradas
    - `doctors` - Médicos cadastrados
    - `insurances` - Convênios
    - `exam_requests` - Solicitações de exames
    - `batteries` - Baterias de check-up
    - `checkup_requests` - Solicitações de check-up

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas baseadas em perfis de usuário
    - Autenticação obrigatória para todas as operações
*/

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários personalizados
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  profile text NOT NULL CHECK (profile IN ('admin', 'parceiro', 'checkup', 'recepcao')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de parceiros
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  company_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de unidades
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela de médicos
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  crm text NOT NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Tabela de convênios
CREATE TABLE IF NOT EXISTS insurances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Tabela de solicitações de exames
CREATE TABLE IF NOT EXISTS exam_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name text NOT NULL,
  birth_date date NOT NULL,
  consultation_date date NOT NULL,
  doctor_id uuid REFERENCES doctors(id),
  exam_type text NOT NULL,
  status text NOT NULL DEFAULT 'encaminhado' CHECK (status IN ('encaminhado', 'executado', 'intervencao')),
  payment_type text NOT NULL CHECK (payment_type IN ('particular', 'convenio')),
  insurance_id uuid REFERENCES insurances(id),
  partner_id uuid REFERENCES partners(id),
  observations text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de baterias de check-up
CREATE TABLE IF NOT EXISTS batteries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  exams text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Tabela de solicitações de check-up
CREATE TABLE IF NOT EXISTS checkup_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name text NOT NULL,
  birth_date date NOT NULL,
  battery_id uuid REFERENCES batteries(id),
  requesting_company text NOT NULL,
  exams_to_perform text[] NOT NULL DEFAULT '{}',
  unit_id uuid REFERENCES units(id),
  observations text DEFAULT '',
  status text NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'encaminhado', 'executado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkup_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Usuários podem ver próprios dados"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprios dados"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Políticas para partners (apenas admin pode gerenciar)
CREATE POLICY "Admin pode gerenciar parceiros"
  ON partners FOR ALL
  TO authenticated
  USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Todos podem visualizar parceiros"
  ON partners FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para units (apenas admin pode gerenciar)
CREATE POLICY "Admin pode gerenciar unidades"
  ON units FOR ALL
  TO authenticated
  USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Todos podem visualizar unidades"
  ON units FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para doctors
CREATE POLICY "Parceiros podem gerenciar próprios médicos"
  ON doctors FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM users WHERE id = auth.uid()) = 'admin' OR
    partner_id IN (
      SELECT id FROM partners 
      WHERE id IN (
        SELECT partner_id FROM doctors 
        WHERE partner_id = doctors.partner_id
      )
    )
  );

-- Políticas para insurances
CREATE POLICY "Parceiros podem gerenciar próprios convênios"
  ON insurances FOR ALL
  TO authenticated
  USING (
    (SELECT profile FROM users WHERE id = auth.uid()) = 'admin' OR
    partner_id IN (
      SELECT id FROM partners 
      WHERE id = insurances.partner_id
    )
  );

-- Políticas para exam_requests
CREATE POLICY "Usuários podem gerenciar solicitações de exame"
  ON exam_requests FOR ALL
  TO authenticated
  USING (true);

-- Políticas para batteries (apenas checkup e admin podem gerenciar)
CREATE POLICY "Checkup e Admin podem gerenciar baterias"
  ON batteries FOR ALL
  TO authenticated
  USING ((SELECT profile FROM users WHERE id = auth.uid()) IN ('admin', 'checkup'));

-- Políticas para checkup_requests
CREATE POLICY "Usuários podem gerenciar solicitações de checkup"
  ON checkup_requests FOR ALL
  TO authenticated
  USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at 
  BEFORE UPDATE ON partners 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_requests_updated_at 
  BEFORE UPDATE ON exam_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkup_requests_updated_at 
  BEFORE UPDATE ON checkup_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();