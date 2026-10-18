// ==============================================================================
// RADIANCE POLYMERS - AUTHENTICATION & USER SERVICE
// Supports both Email and Employee Code login with Supabase Auth & RLS
// ==============================================================================
import { supabase, isSupabaseConfigured, formatDatabaseError } from '../lib/supabaseClient';

/**
 * Normalizes an employee code (e.g. EMP-101 or emp101) into an internal Supabase auth email.
 */
export function normalizeEmployeeCodeToEmail(input) {
  const clean = (input || '').trim().toLowerCase();
  if (clean.includes('@')) return clean;
  // Convert code to standardized local email (e.g. emp-101@radiance.local)
  const code = clean.replace(/\s+/g, '-');
  return `${code}@radiance.local`;
}

/**
 * Signs in using either an email or an Employee Code + password/PIN.
 */
export async function login({ emailOrCode, password }) {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase is not configured yet. Please enter VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    };
  }

  const cleanIdent = (emailOrCode || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanIdent || !cleanPass) {
    return { success: false, error: 'Please enter both your Employee Code/Email and password.' };
  }

  const email = normalizeEmployeeCodeToEmail(cleanIdent);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid Employee Code or password. Please try again.' };
      }
      return { success: false, error: formatDatabaseError(error, 'Sign-in failed.') };
    }

    if (!data?.user) {
      return { success: false, error: 'Authentication failed. No user record returned.' };
    }

    // Verify profile active status
    const profileRes = await getCurrentUserProfile(data.user.id);
    if (!profileRes.success) {
      return { success: false, error: profileRes.error || 'User profile could not be loaded.' };
    }

    const profile = profileRes.data;
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Your account is deactivated. Please contact the plant administrator.'
      };
    }

    return {
      success: true,
      user: data.user,
      profile
    };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err, 'Connection error during login.') };
  }
}

/**
 * Logs out the active user and clears local session cache.
 */
export async function logout() {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Logout notice:', error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

/**
 * Retrieves the currently active Supabase auth session.
 */
export async function getActiveSession() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, session: null };
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { success: false, error: formatDatabaseError(error), session: null };
    return { success: true, session: data.session };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err), session: null };
  }
}

/**
 * Fetches the user's role and details from the public.profiles table.
 */
export async function getCurrentUserProfile(userId = null) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: null };
  }

  try {
    let targetUid = userId;
    if (!targetUid) {
      const { data: authData } = await supabase.auth.getUser();
      targetUid = authData?.user?.id;
    }

    if (!targetUid) {
      return { success: false, data: null, error: 'No authenticated user found.' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUid)
      .maybeSingle();

    if (error) {
      return { success: false, error: formatDatabaseError(error), data: null };
    }

    if (!data) {
      return {
        success: false,
        data: null,
        error: 'Profile not found in database. Contact administrator.'
      };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err), data: null };
  }
}

/**
 * Subscribes to Supabase authentication state changes (login, logout, token refresh).
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured || !supabase) {
    return { unsubscribe: () => {} };
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: () => subscription?.unsubscribe() };
}
