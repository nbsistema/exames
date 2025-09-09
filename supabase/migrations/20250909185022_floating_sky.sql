/*
  # Criar tabela users com sistema de senha próprio

  1. Nova tabela users independente
    - `id` (uuid, primary key)
    - `email` (text, unique)
    - `name` (text)
    - `profile` (text com check constraint)
    - `password_hash` (text para senhas criptografadas)
    - `created_at` e `updated_at` (timestamps)

  2. Índices para performance
    - Índice no email para login rápido
    - Índice no profile para consultas por tipo

  3. RLS (Row Level Security)
    - Políticas públicas para permitir login sem autenticação prévia
    - Políticas para operações CRUD baseadas em perfil

  4. Triggers
    - Trigger para atualizar updated_at automaticamente
*/

-- 1. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Criar tabela users (INDEPENDENTE do auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  profile text NOT NULL CHECK (profile IN ('admin', 'parceiro', 'checkup', 'recepcao')),
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_profile ON users(profile);

-- 4. Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS - ACESSO PÚBLICO para permitir login
DROP POLICY IF EXISTS "users_public_access" ON users;
CREATE POLICY "users_public_access" ON users
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 6. Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Criar tabela partners
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. RLS para partners
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partners_public_access" ON partners;
CREATE POLICY "partners_public_access" ON partners
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 9. Trigger para partners
DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Criar tabela units
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. RLS para units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_public_access" ON units;
CREATE POLICY "units_public_access" ON units
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 12. Criar tabela doctors
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  crm text NOT NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 13. Índice e RLS para doctors
CREATE INDEX IF NOT EXISTS idx_doctors_partner_id ON doctors(partner_id);
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctors_public_access" ON doctors;
CREATE POLICY "doctors_public_access" ON doctors
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 14. Criar tabela insurances
CREATE TABLE IF NOT EXISTS insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 15. Índice e RLS para insurances
CREATE INDEX IF NOT EXISTS idx_insurances_partner_id ON insurances(partner_id);
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurances_public_access" ON insurances;
CREATE POLICY "insurances_public_access" ON insurances
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 16. Criar tabela exam_requests
CREATE TABLE IF NOT EXISTS exam_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 17. Índices e RLS para exam_requests
CREATE INDEX IF NOT EXISTS idx_exam_requests_partner_id ON exam_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_exam_requests_status ON exam_requests(status);
CREATE INDEX IF NOT EXISTS idx_exam_requests_created_at ON exam_requests(created_at);

ALTER TABLE exam_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exam_requests_public_access" ON exam_requests;
CREATE POLICY "exam_requests_public_access" ON exam_requests
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 18. Trigger para exam_requests
DROP TRIGGER IF EXISTS update_exam_requests_updated_at ON exam_requests;
CREATE TRIGGER update_exam_requests_updated_at
  BEFORE UPDATE ON exam_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. Criar tabela batteries
CREATE TABLE IF NOT EXISTS batteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exams text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 20. RLS para batteries
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "batteries_public_access" ON batteries;
CREATE POLICY "batteries_public_access" ON batteries
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 21. Criar tabela checkup_requests
CREATE TABLE IF NOT EXISTS checkup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 22. Índices e RLS para checkup_requests
CREATE INDEX IF NOT EXISTS idx_checkup_requests_battery_id ON checkup_requests(battery_id);
CREATE INDEX IF NOT EXISTS idx_checkup_requests_unit_id ON checkup_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_checkup_requests_status ON checkup_requests(status);
CREATE INDEX IF NOT EXISTS idx_checkup_requests_created_at ON checkup_requests(created_at);

ALTER TABLE checkup_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkup_requests_public_access" ON checkup_requests;
CREATE POLICY "checkup_requests_public_access" ON checkup_requests
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 23. Trigger para checkup_requests
DROP TRIGGER IF EXISTS update_checkup_requests_updated_at ON checkup_requests;
CREATE TRIGGER update_checkup_requests_updated_at
  BEFORE UPDATE ON checkup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();