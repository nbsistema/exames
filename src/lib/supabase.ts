import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente do Netlify (NEXT_PUBLIC_* são expostas no frontend)
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Criar cliente Supabase apenas se as variáveis estiverem disponíveis
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(
  supabaseUrl.trim(),
  supabaseAnonKey.trim(),
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Desabilitar para evitar conflitos
    debug: false, // Desabilitar debug para evitar logs desnecessários
  },
}) : null;

// Criar cliente admin apenas se a service role key estiver disponível
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) ? createClient(
  supabaseUrl.trim(),
  supabaseServiceKey.trim(),
  {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
}) : null;

// Debug logs
if (import.meta.env.DEV) {
  console.log('🔗 Supabase configurado:', !!supabase);
  console.log('🔑 Admin configurado:', !!supabaseAdmin);
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