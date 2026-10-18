// ==============================================================================
// RADIANCE POLYMERS - SUPABASE CLIENT SINGLETON
// Handles cloud connection, credentials validation, and network error handling
// ==============================================================================
import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 10
);

if (!isSupabaseConfigured) {
  console.warn(
    '[SupabaseClient] Supabase credentials missing or incomplete. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Client options optimized for mobile/tablet shop floor usage
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'rp_supabase_auth_session'
      },
      global: {
        headers: {
          'x-client-info': 'radiance-production-app@1.0.0'
        }
      }
    })
  : null;

/**
 * Standardized network / database error message translator for shop-floor non-developers.
 */
export function formatDatabaseError(error, defaultMsg = 'Operation failed.') {
  if (!error) return defaultMsg;
  const msg = error.message || String(error);

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
    return 'Shop-floor network connection lost. Please check Wi-Fi or mobile data.';
  }
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('expired')) {
    return 'Your session has expired. Please log in again.';
  }
  if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('policy')) {
    return 'Permission denied: Your role does not have authorization to perform this action.';
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'Duplicate entry: A record with this code or number already exists.';
  }

  return msg;
}
