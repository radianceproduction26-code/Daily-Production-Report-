// ==============================================================================
// RADIANCE POLYMERS - SUPABASE CLIENT SINGLETON
// Handles cloud connection, credentials validation, and network error handling
// ==============================================================================
import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

// Startup check for required environment variables
const missingVars = [];
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
  console.error(
    `[SupabaseClient] Missing required environment variable(s): ${missingVars.join(', ')}. ` +
    `Please set them in your .env file in the project root.`
  );
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 10
);

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
  const code = String(error.code || '');
  const status = error.status || error.statusCode;

  // Real network failure
  if (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    error.name === 'TypeError' ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network') ||
    status === 0
  ) {
    return 'Network connection lost. Please check Wi-Fi or mobile data.';
  }

  // Session expiry
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('expired')) {
    return 'Your session has expired. Please log in again.';
  }

  // RLS / Permission error (401 / 403 / 42501)
  if (
    code === '42501' ||
    status === 401 ||
    status === 403 ||
    msg.includes('row-level security') ||
    msg.includes('RLS') ||
    msg.includes('policy') ||
    msg.includes('permission denied')
  ) {
    return 'Access denied. Contact admin.';
  }

  // Duplicate entry constraint
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'Duplicate entry: A record with this code or number already exists.';
  }

  return msg;
}
