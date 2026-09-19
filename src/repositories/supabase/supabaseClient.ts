import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

/**
 * Verifies live connection to Supabase database
 */
export async function checkSupabaseConnectivity(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('ambulances').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
