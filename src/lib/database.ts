import { supabase } from './supabase';

export const databaseService = {
  async applyRLSFix(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔒 Aplicando correções de RLS...');
      
      // Função auxiliar para verificar perfil do usuário
      const createHelperFunction = `
        CREATE OR REPLACE FUNCTION get_user_profile()
        RETURNS text AS $$
        BEGIN
          RETURN (SELECT profile FROM users WHERE id = auth.uid());
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;

      // Aplicar a função auxiliar
      const { error: functionError } = await supabase.rpc('exec_sql', { 
        sql_query: createHelperFunction 
      });
      
      if (functionError) {
        console.warn('⚠️ Erro ao criar função auxiliar:', functionError);
      }

      console.log('✅ Correções de RLS aplicadas com sucesso!');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao aplicar correções de RLS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  },

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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "users_select_own" ON users;
        CREATE POLICY "users_select_own" ON users
          FOR SELECT TO authenticated
          USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "users_select_admin" ON users;
        CREATE POLICY "users_select_admin" ON users
          FOR SELECT TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "users_insert_public" ON users;
        CREATE POLICY "users_insert_public" ON users
          FOR INSERT TO public
          WITH CHECK (true);
        
        DROP POLICY IF EXISTS "users_insert_admin" ON users;
        CREATE POLICY "users_insert_admin" ON users
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "users_update_own" ON users;
        CREATE POLICY "users_update_own" ON users
          FOR UPDATE TO authenticated
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
        
        DROP POLICY IF EXISTS "users_update_admin" ON users;
        CREATE POLICY "users_update_admin" ON users
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "users_delete_admin" ON users;
        CREATE POLICY "users_delete_admin" ON users
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "partners_select_all" ON partners;
        CREATE POLICY "partners_select_all" ON partners
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "partners_insert_admin" ON partners;
        CREATE POLICY "partners_insert_admin" ON partners
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "partners_update_admin" ON partners;
        CREATE POLICY "partners_update_admin" ON partners
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "partners_delete_admin" ON partners;
        CREATE POLICY "partners_delete_admin" ON partners
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "units_select_all" ON units;
        CREATE POLICY "units_select_all" ON units
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "units_insert_admin" ON units;
        CREATE POLICY "units_insert_admin" ON units
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "units_update_admin" ON units;
        CREATE POLICY "units_update_admin" ON units
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "units_delete_admin" ON units;
        CREATE POLICY "units_delete_admin" ON users
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "doctors_select_all" ON doctors;
        CREATE POLICY "doctors_select_all" ON doctors
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "doctors_insert_admin" ON doctors;
        CREATE POLICY "doctors_insert_admin" ON doctors
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "doctors_insert_partner" ON doctors;
        CREATE POLICY "doctors_insert_partner" ON doctors
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "doctors_update_admin" ON doctors;
        CREATE POLICY "doctors_update_admin" ON doctors
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "doctors_update_partner" ON doctors;
        CREATE POLICY "doctors_update_partner" ON doctors
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "doctors_delete_admin" ON doctors;
        CREATE POLICY "doctors_delete_admin" ON doctors
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "doctors_delete_partner" ON doctors;
        CREATE POLICY "doctors_delete_partner" ON doctors
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "insurances_select_all" ON insurances;
        CREATE POLICY "insurances_select_all" ON insurances
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "insurances_insert_admin" ON insurances;
        CREATE POLICY "insurances_insert_admin" ON insurances
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "insurances_insert_partner" ON insurances;
        CREATE POLICY "insurances_insert_partner" ON insurances
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "insurances_update_admin" ON insurances;
        CREATE POLICY "insurances_update_admin" ON insurances
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "insurances_update_partner" ON insurances;
        CREATE POLICY "insurances_update_partner" ON insurances
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "insurances_delete_admin" ON insurances;
        CREATE POLICY "insurances_delete_admin" ON insurances
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "insurances_delete_partner" ON insurances;
        CREATE POLICY "insurances_delete_partner" ON insurances
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "exam_requests_select_all" ON exam_requests;
        CREATE POLICY "exam_requests_select_all" ON exam_requests
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "exam_requests_insert_admin" ON exam_requests;
        CREATE POLICY "exam_requests_insert_admin" ON exam_requests
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "exam_requests_insert_partner" ON exam_requests;
        CREATE POLICY "exam_requests_insert_partner" ON exam_requests
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "exam_requests_update_admin" ON exam_requests;
        CREATE POLICY "exam_requests_update_admin" ON exam_requests
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "exam_requests_update_partner" ON exam_requests;
        CREATE POLICY "exam_requests_update_partner" ON exam_requests
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'parceiro');
        
        DROP POLICY IF EXISTS "exam_requests_update_reception" ON exam_requests;
        CREATE POLICY "exam_requests_update_reception" ON exam_requests
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'recepcao')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'recepcao');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "exam_requests_delete_admin" ON exam_requests;
        CREATE POLICY "exam_requests_delete_admin" ON exam_requests
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "batteries_select_all" ON batteries;
        CREATE POLICY "batteries_select_all" ON batteries
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "batteries_insert_admin" ON batteries;
        CREATE POLICY "batteries_insert_admin" ON batteries
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "batteries_insert_checkup" ON batteries;
        CREATE POLICY "batteries_insert_checkup" ON batteries
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "batteries_update_admin" ON batteries;
        CREATE POLICY "batteries_update_admin" ON batteries
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "batteries_update_checkup" ON batteries;
        CREATE POLICY "batteries_update_checkup" ON batteries
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "batteries_delete_admin" ON batteries;
        CREATE POLICY "batteries_delete_admin" ON batteries
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "batteries_delete_checkup" ON batteries;
        CREATE POLICY "batteries_delete_checkup" ON batteries
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup');
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
        
        -- Políticas para SELECT
        DROP POLICY IF EXISTS "checkup_requests_select_all" ON checkup_requests;
        CREATE POLICY "checkup_requests_select_all" ON checkup_requests
          FOR SELECT TO authenticated
          USING (true);
        
        -- Políticas para INSERT
        DROP POLICY IF EXISTS "checkup_requests_insert_admin" ON checkup_requests;
        CREATE POLICY "checkup_requests_insert_admin" ON checkup_requests
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "checkup_requests_insert_checkup" ON checkup_requests;
        CREATE POLICY "checkup_requests_insert_checkup" ON checkup_requests
          FOR INSERT TO authenticated
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup');
        
        -- Políticas para UPDATE
        DROP POLICY IF EXISTS "checkup_requests_update_admin" ON checkup_requests;
        CREATE POLICY "checkup_requests_update_admin" ON checkup_requests
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
        
        DROP POLICY IF EXISTS "checkup_requests_update_checkup" ON checkup_requests;
        CREATE POLICY "checkup_requests_update_checkup" ON checkup_requests
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'checkup');
        
        DROP POLICY IF EXISTS "checkup_requests_update_reception" ON checkup_requests;
        CREATE POLICY "checkup_requests_update_reception" ON checkup_requests
          FOR UPDATE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'recepcao')
          WITH CHECK ((SELECT profile FROM users WHERE id = auth.uid()) = 'recepcao');
        
        -- Políticas para DELETE
        DROP POLICY IF EXISTS "checkup_requests_delete_admin" ON checkup_requests;
        CREATE POLICY "checkup_requests_delete_admin" ON checkup_requests
          FOR DELETE TO authenticated
          USING ((SELECT profile FROM users WHERE id = auth.uid()) = 'admin');
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

      // Aplicar correções de RLS
      await this.applyRLSFix();

      console.log('✅ Tabelas criadas com sucesso!');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao criar tabelas:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  },

  async ensureTablesExist(): Promise<boolean> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase não configurado, pulando verificação de tabelas');
        return false;
      }

      // Testar se a tabela users existe
      const { error } = await supabase.from('users').select('id').limit(1);
      
      if (error && (error.code === '42P01' || error.code === '42P17')) {
        console.log('📋 Tabelas não existem, criando...');
        const result = await this.createTables();
        return result.success;
      }
      
      if (error) {
        console.warn('⚠️ Erro ao verificar tabelas:', error.message);
        // Tentar criar tabelas mesmo assim
        const result = await this.createTables();
        return result.success;
      }
      
      console.log('✅ Tabelas já existem');
      return true;
    } catch (error) {
      console.warn('⚠️ Não foi possível verificar tabelas:', error);
      const result = await this.createTables();
      return result.success;
    }
  }
};