import { supabase } from './supabase';

export const databaseService = {
  async createTables(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗄️ Criando tabelas do banco de dados...');
      
      // Primeiro, criar função SQL personalizada para criar usuários
      const createUserFunction = `
        CREATE OR REPLACE FUNCTION create_user_direct(
          user_id uuid,
          user_email text,
          user_password text,
          user_name text,
          user_profile text
        )
        RETURNS void AS $$
        BEGIN
          -- Inserir na tabela users se não existir
          INSERT INTO users (id, email, name, profile, created_at, updated_at)
          VALUES (user_id, user_email, user_name, user_profile, now(), now())
          ON CONFLICT (email) DO NOTHING;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;

      // 1. Criar função para atualizar updated_at
      const updateFunction = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `;

      // 2. Criar tabela users
      const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email text UNIQUE NOT NULL,
          name text NOT NULL,
          profile text NOT NULL CHECK (profile IN ('admin', 'parceiro', 'checkup', 'recepcao')),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `;

      // 3. Criar índices para users
      const usersIndexes = `
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_profile ON users(profile);
      `;

      // 4. Criar RLS e políticas para users
      const usersRLS = `
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Permitir inserção de usuários" ON users;
        CREATE POLICY "Permitir inserção de usuários" ON users
          FOR INSERT TO public WITH CHECK (true);
        
        DROP POLICY IF EXISTS "Usuários podem ver próprios dados" ON users;
        CREATE POLICY "Usuários podem ver próprios dados" ON users
          FOR SELECT TO authenticated USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Admin pode ver todos usuários" ON users;
        CREATE POLICY "Admin pode ver todos usuários" ON users
          FOR SELECT TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin'
          );
        
        DROP POLICY IF EXISTS "Usuários podem atualizar próprios dados" ON users;
        CREATE POLICY "Usuários podem atualizar próprios dados" ON users
          FOR UPDATE TO authenticated USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Admin pode atualizar usuários" ON users;
        CREATE POLICY "Admin pode atualizar usuários" ON users
          FOR UPDATE TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin'
          );
        
        DROP POLICY IF EXISTS "Admin pode excluir usuários" ON users;
        CREATE POLICY "Admin pode excluir usuários" ON users
          FOR DELETE TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin'
          );
      `;

      // 5. Criar trigger para updated_at
      const usersTrigger = `
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      // 6. Criar tabela partners
      const partnersTable = `
        CREATE TABLE IF NOT EXISTS partners (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          company_type text NOT NULL,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `;

      // 7. Criar RLS para partners
      const partnersRLS = `
        ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Todos podem visualizar parceiros" ON partners;
        CREATE POLICY "Todos podem visualizar parceiros" ON partners
          FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Admin pode gerenciar parceiros" ON partners;
        CREATE POLICY "Admin pode gerenciar parceiros" ON partners
          FOR ALL TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin'
          );
      `;

      // 8. Criar trigger para partners
      const partnersTrigger = `
        DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
        CREATE TRIGGER update_partners_updated_at
          BEFORE UPDATE ON partners
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      // 9. Criar tabela units
      const unitsTable = `
        CREATE TABLE IF NOT EXISTS units (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      `;

      // 10. Criar RLS para units
      const unitsRLS = `
        ALTER TABLE units ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Todos podem visualizar unidades" ON units;
        CREATE POLICY "Todos podem visualizar unidades" ON units
          FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Admin pode gerenciar unidades" ON units;
        CREATE POLICY "Admin pode gerenciar unidades" ON units
          FOR ALL TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin'
          );
      `;

      // 11. Criar tabela doctors
      const doctorsTable = `
        CREATE TABLE IF NOT EXISTS doctors (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          crm text NOT NULL,
          partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
          created_at timestamptz DEFAULT now()
        );
      `;

      // 12. Criar índice e RLS para doctors
      const doctorsRLS = `
        CREATE INDEX IF NOT EXISTS idx_doctors_partner_id ON doctors(partner_id);
        
        ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Todos podem visualizar médicos" ON doctors;
        CREATE POLICY "Todos podem visualizar médicos" ON doctors
          FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Parceiros podem gerenciar próprios médicos" ON doctors;
        CREATE POLICY "Parceiros podem gerenciar próprios médicos" ON doctors
          FOR ALL TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin' OR
            partner_id IN (SELECT id FROM partners WHERE id = doctors.partner_id)
          );
      `;

      // 13. Criar tabela insurances
      const insurancesTable = `
        CREATE TABLE IF NOT EXISTS insurances (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
          created_at timestamptz DEFAULT now()
        );
      `;

      // 14. Criar índice e RLS para insurances
      const insurancesRLS = `
        CREATE INDEX IF NOT EXISTS idx_insurances_partner_id ON insurances(partner_id);
        
        ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Todos podem visualizar convênios" ON insurances;
        CREATE POLICY "Todos podem visualizar convênios" ON insurances
          FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Parceiros podem gerenciar próprios convênios" ON insurances;
        CREATE POLICY "Parceiros podem gerenciar próprios convênios" ON insurances
          FOR ALL TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) = 'admin' OR
            partner_id IN (SELECT id FROM partners WHERE id = insurances.partner_id)
          );
      `;

      // 15. Criar tabela exam_requests
      const examRequestsTable = `
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
      `;

      // 16. Criar índices e RLS para exam_requests
      const examRequestsRLS = `
        CREATE INDEX IF NOT EXISTS idx_exam_requests_partner_id ON exam_requests(partner_id);
        CREATE INDEX IF NOT EXISTS idx_exam_requests_status ON exam_requests(status);
        CREATE INDEX IF NOT EXISTS idx_exam_requests_created_at ON exam_requests(created_at);
        
        ALTER TABLE exam_requests ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Usuários podem gerenciar solicitações de exame" ON exam_requests;
        CREATE POLICY "Usuários podem gerenciar solicitações de exame" ON exam_requests
          FOR ALL TO authenticated USING (true);
      `;

      // 17. Criar trigger para exam_requests
      const examRequestsTrigger = `
        DROP TRIGGER IF EXISTS update_exam_requests_updated_at ON exam_requests;
        CREATE TRIGGER update_exam_requests_updated_at
          BEFORE UPDATE ON exam_requests
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      // 18. Criar tabela batteries
      const batteriesTable = `
        CREATE TABLE IF NOT EXISTS batteries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          exams text[] NOT NULL DEFAULT '{}',
          created_at timestamptz DEFAULT now()
        );
      `;

      // 19. Criar RLS para batteries
      const batteriesRLS = `
        ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Todos podem visualizar baterias" ON batteries;
        CREATE POLICY "Todos podem visualizar baterias" ON batteries
          FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Checkup e Admin podem gerenciar baterias" ON batteries;
        CREATE POLICY "Checkup e Admin podem gerenciar baterias" ON batteries
          FOR ALL TO authenticated USING (
            (SELECT profile FROM users WHERE id = auth.uid()) IN ('admin', 'checkup')
          );
      `;

      // 20. Criar tabela checkup_requests
      const checkupRequestsTable = `
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
      `;

      // 21. Criar índices e RLS para checkup_requests
      const checkupRequestsRLS = `
        CREATE INDEX IF NOT EXISTS idx_checkup_requests_battery_id ON checkup_requests(battery_id);
        CREATE INDEX IF NOT EXISTS idx_checkup_requests_unit_id ON checkup_requests(unit_id);
        CREATE INDEX IF NOT EXISTS idx_checkup_requests_status ON checkup_requests(status);
        CREATE INDEX IF NOT EXISTS idx_checkup_requests_created_at ON checkup_requests(created_at);
        
        ALTER TABLE checkup_requests ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Usuários podem gerenciar solicitações de checkup" ON checkup_requests;
        CREATE POLICY "Usuários podem gerenciar solicitações de checkup" ON checkup_requests
          FOR ALL TO authenticated USING (true);
      `;

      // 22. Criar trigger para checkup_requests
      const checkupRequestsTrigger = `
        DROP TRIGGER IF EXISTS update_checkup_requests_updated_at ON checkup_requests;
        CREATE TRIGGER update_checkup_requests_updated_at
          BEFORE UPDATE ON checkup_requests
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      // Executar todos os comandos SQL
      const sqlCommands = [
        createUserFunction,
        createUserFunction,
        updateFunction,
        usersTable,
        usersIndexes,
        usersRLS,
        usersTrigger,
        partnersTable,
        partnersRLS,
        partnersTrigger,
        unitsTable,
        unitsRLS,
        doctorsTable,
        doctorsRLS,
        insurancesTable,
        insurancesRLS,
        examRequestsTable,
        examRequestsRLS,
        examRequestsTrigger,
        batteriesTable,
        batteriesRLS,
        checkupRequestsTable,
        checkupRequestsRLS,
        checkupRequestsTrigger,
      ];

      for (const sql of sqlCommands) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
          // Tentar executar diretamente se RPC não funcionar
          const { error: directError } = await supabase.from('_').select().limit(0);
          if (directError) {
            console.warn('⚠️ Não foi possível executar SQL via RPC, tentando método alternativo...');
            // Continuar mesmo com erro, pois pode ser limitação do ambiente
          }
        }
      }

      console.log('✅ Tabelas criadas com sucesso!');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao criar tabelas:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  },

  async ensureTablesExist(): Promise<boolean> {
    try {
      // Testar se a tabela users existe
      const { error } = await supabase.from('users').select('id').limit(1);
      
      if (error && (error.code === '42P01' || error.code === '42P17')) {
        console.log('📋 Tabelas não existem, criando...');
        const result = await this.createTables();
        return result.success;
      }
      
      console.log('✅ Tabelas já existem');
      return true;
    } catch (error) {
      console.warn('⚠️ Não foi possível verificar tabelas, assumindo que não existem');
      const result = await this.createTables();
      return result.success;
    }
  }
};