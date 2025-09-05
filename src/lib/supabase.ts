import { createClient } from '@supabase/supabase-js';
import './env-validator'; // Importar validador automaticamente

// Verificar se as variáveis de ambiente existem antes de criar o cliente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  console.warn('⚠️ Supabase não configurado - usando modo fallback');
}

// Validar formato da URL
if (supabaseUrl) {
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.error('❌ Invalid Supabase URL format:', supabaseUrl);
    console.warn('⚠️ URL inválida - usando modo fallback');
  }
}

// Limpar URL para evitar problemas de formatação
const cleanUrl = supabaseUrl?.trim().replace(/\/$/, '') || '';
const cleanKey = supabaseAnonKey?.trim() || '';

// Criar cliente Supabase apenas se as variáveis estiverem disponíveis
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    debug: import.meta.env.DEV,
    storage: window.localStorage
  },
  global: {
    headers: {
      'apikey': cleanKey
    },
  },
  db: {
    schema: 'public',
  },
}) : null;

// Cliente admin com Service Role Key para operações administrativas
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// Debug logs
if (import.meta.env.DEV) {
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase anon key (início):', supabaseAnonKey?.slice(0, 20) + '...');
  console.log('🔐 Supabase service key presente:', !!supabaseServiceKey);
  
  // Testar conexão apenas se o cliente foi criado
  if (supabase) {
    supabase.auth.getSession()
      .then(({ error }) => {
        if (error) {
          console.error('❌ Erro de conexão com Supabase Auth:', error);
        } else {
          console.log('✅ Conexão com Supabase Auth estabelecida');
        }
      })
      .catch(() => {
        console.warn('⚠️ Não foi possível testar a conexão com Supabase');
      });
  } else {
    console.warn('⚠️ Cliente Supabase não foi criado - usando modo fallback');
  }
}

// Tipos auxiliares
export type UserProfile = 'admin' | 'parceiro' | 'checkup' | 'recepcao';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  name: string;
  company_type: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  name: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  crm: string;
  partner_id: string;
  created_at: string;
}

export interface Insurance {
  id: string;
  name: string;
  partner_id: string;
  created_at: string;
}

export interface ExamRequest {
  id: string;
  patient_name: string;
  birth_date: string;
  consultation_date: string;
  doctor_id: string;
  exam_type: string;
  status: 'encaminhado' | 'executado' | 'intervencao';
  payment_type: 'particular' | 'convenio';
  insurance_id?: string;
  partner_id: string;
  observations: string;
  created_at: string;
  updated_at: string;
}

export interface Battery {
  id: string;
  name: string;
  exams: string[];
  created_at: string;
}

export interface CheckupRequest {
  id: string;
  patient_name: string;
  birth_date: string;
  battery_id: string;
  requesting_company: string;
  exams_to_perform: string[];
  unit_id?: string;
  observations: string;
  status: 'solicitado' | 'encaminhado' | 'executado';
  created_at: string;
  updated_at: string;
}