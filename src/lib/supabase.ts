import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isSupabaseEnvConfigured } from '@/src/lib/supabaseEnv';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

export function isSupabaseEnabled(): boolean {
  return isSupabaseEnvConfigured();
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase env not configured (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)');
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  }
  return client;
}

/** 학번 → Supabase Auth 가상 이메일 (실제 메일 발송 없음, example.com은 RFC 예약 도메인) */
export const AUTH_EMAIL_DOMAIN = 'example.com';
export const AUTH_EMAIL_PREFIX = 'drop';

export function studentIdToAuthEmail(studentId: string): string {
  const safe = studentId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${AUTH_EMAIL_PREFIX}-${safe}@${AUTH_EMAIL_DOMAIN}`;
}

export function authEmailToStudentId(email: string): string {
  return email.split('@')[0] ?? email;
}
