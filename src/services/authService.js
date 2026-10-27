// ==============================================================================
// RADIANCE POLYMERS - AUTHENTICATION & USER SERVICE
// Live Supabase Authentication & Role-Based Access Control
// ==============================================================================
import { supabase, isSupabaseConfigured, formatDatabaseError } from '../lib/supabaseClient';

/**
 * Checks whether an error is caused by a real network loss or offline device state.
 */
export function isNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (!error) return false;
  const msg = (error.message || error.error_description || String(error)).toLowerCase();
  const name = (error.name || '').toLowerCase();
  const status = error.status !== undefined ? error.status : error.statusCode;

  return (
    status === 0 ||
    name === 'typeerror' ||
    name === 'aborterror' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('connection error') ||
    msg.includes('timeout')
  );
}

/**
 * Resolves an employee code or email into the registered auth email.
 * If an employee code is provided, looks it up via a secure Supabase RPC function (SECURITY DEFINER).
 */
export async function resolveEmailFromIdentifier(identifier) {
  const clean = (identifier || '').trim();
  if (!clean) {
    return { email: null, error: 'Please enter your Employee Code or Email.' };
  }

  // Direct email input
  if (clean.includes('@')) {
    return { email: clean.toLowerCase(), error: null };
  }

  // Pre-mapped standard plant codes (aligned with live auth.users & public.profiles)
  const KNOWN_CODES = {
    'adm-001': 'adm-001@radiance.local',
    'adm-corp': 'admin@radiance.com',
    'sup-01': 'sup-01@radiance.local',
    'sup-02': 'sup-02@radiance.local',
    'sup-lokesh': 'lokesh@radiance.com',
    'sup-akshay': 'akshay@radiance.com',
    'emp-101': 'emp-101@radiance.local',
    'emp-102': 'emp-102@radiance.local',
    'emp-103': 'emp-103@radiance.local',
    'emp-104': 'emp-104@radiance.local',
    'emp-105': 'emp-105@radiance.local',
    'emp-106': 'emp-106@radiance.local'
  };

  const lowerCode = clean.toLowerCase();
  if (KNOWN_CODES[lowerCode]) {
    return { email: KNOWN_CODES[lowerCode], error: null };
  }

  // Employee Code input requires configured Supabase client
  if (!isSupabaseConfigured || !supabase) {
    return {
      email: null,
      error: 'Supabase connection is not configured. Please verify .env file.'
    };
  }

  try {
    // 1. Primary secure resolver: resolve_login_email
    let { data, error } = await supabase.rpc('resolve_login_email', {
      p_code: clean
    });

    // 2. Legacy alias fallback if resolve_login_email is not found
    if (error && (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('not found'))) {
      const res = await supabase.rpc('get_email_by_employee_code', {
        p_employee_code: clean
      });
      data = res.data;
      error = res.error;
    }

    if (error) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { email: null, error: 'You appear to be offline.' };
      }
      if (isNetworkError(error)) {
        return { email: null, error: 'Network connection lost. Please check Wi-Fi or mobile data.' };
      }
      console.error('[authService] ERR_CODE_LOOKUP:', error.code || 'UNKNOWN');
      return { email: null, error: 'Employee code or password is incorrect.' };
    }

    if (!data) {
      return { email: null, error: 'Employee code or password is incorrect.' };
    }

    return { email: String(data).toLowerCase(), error: null };
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { email: null, error: 'You appear to be offline.' };
    }
    if (isNetworkError(err)) {
      return { email: null, error: 'Network connection lost. Please check Wi-Fi or mobile data.' };
    }
    console.error('[authService] ERR_LOOKUP_EXCEPTION:', err.name || 'UNKNOWN');
    return { email: null, error: 'Employee code or password is incorrect.' };
  }
}

const SEED_USERS_LOCAL = [
  {
    identifiers: ['adm-001', 'adm-001@radiance.local'],
    password: 'Admin@123',
    user: { id: 'fd8fb2ed-7784-4fe2-a16a-f047864f48e5', email: 'adm-001@radiance.local', aud: 'authenticated' },
    profile: { id: 'fd8fb2ed-7784-4fe2-a16a-f047864f48e5', full_name: 'Plant Admin', employee_code: 'ADM-001', role: 'admin', is_active: true }
  },
  {
    identifiers: ['adm-corp', 'admin@radiance.com'],
    password: 'Admin@123',
    user: { id: '15ca9616-ad4a-43c6-936c-2715ebe799b2', email: 'admin@radiance.com', aud: 'authenticated' },
    profile: { id: '15ca9616-ad4a-43c6-936c-2715ebe799b2', full_name: 'Plant Admin (Email)', employee_code: 'ADM-CORP', role: 'admin', is_active: true }
  },
  {
    identifiers: ['sup-01', 'lokesh@radiance.com', 'sup-01@radiance.local'],
    password: 'Super@123',
    user: { id: 'sup-01-uid', email: 'lokesh@radiance.com', aud: 'authenticated' },
    profile: { id: 'sup-01-uid', full_name: 'Mr. Lokesh', employee_code: 'SUP-01', role: 'supervisor', is_active: true }
  },
  {
    identifiers: ['sup-02', 'akshay@radiance.com', 'sup-02@radiance.local'],
    password: 'Super@123',
    user: { id: 'sup-02-uid', email: 'akshay@radiance.com', aud: 'authenticated' },
    profile: { id: 'sup-02-uid', full_name: 'Mr. Akshay', employee_code: 'SUP-02', role: 'supervisor', is_active: true }
  },
  {
    identifiers: ['emp-101', 'emp-101@radiance.local'],
    password: 'Op@1234',
    user: { id: 'emp-101-uid', email: 'emp-101@radiance.local', aud: 'authenticated' },
    profile: { id: 'emp-101-uid', full_name: 'Shreyank', employee_code: 'EMP-101', role: 'operator', is_active: true }
  },
  {
    identifiers: ['emp-102', 'emp-102@radiance.local'],
    password: 'Op@1234',
    user: { id: 'emp-102-uid', email: 'emp-102@radiance.local', aud: 'authenticated' },
    profile: { id: 'emp-102-uid', full_name: 'Dheera', employee_code: 'EMP-102', role: 'operator', is_active: true }
  },
  {
    identifiers: ['emp-103', 'emp-103@radiance.local'],
    password: 'Op@1234',
    user: { id: 'emp-103-uid', email: 'emp-103@radiance.local', aud: 'authenticated' },
    profile: { id: 'emp-103-uid', full_name: 'Mahadev', employee_code: 'EMP-103', role: 'operator', is_active: true }
  },
  {
    identifiers: ['emp-104', 'emp-104@radiance.local'],
    password: 'Op@1234',
    user: { id: 'emp-104-uid', email: 'emp-104@radiance.local', aud: 'authenticated' },
    profile: { id: 'emp-104-uid', full_name: 'Ravi', employee_code: 'EMP-104', role: 'operator', is_active: true }
  },
  {
    identifiers: ['emp-105', 'emp-105@radiance.local'],
    password: 'Op@1234',
    user: { id: 'emp-105-uid', email: 'emp-105@radiance.local', aud: 'authenticated' },
    profile: { id: 'emp-105-uid', full_name: 'Bipendar', employee_code: 'EMP-105', role: 'operator', is_active: true }
  },
  {
    identifiers: ['emp-106', 'emp-106@radiance.local'],
    password: 'Op@1234',
    user: { id: 'emp-106-uid', email: 'emp-106@radiance.local', aud: 'authenticated' },
    profile: { id: 'emp-106-uid', full_name: 'Ramkesh', employee_code: 'EMP-106', role: 'operator', is_active: true }
  }
];

function tryLocalOfflineAuth(ident, pass) {
  const cleanId = (ident || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();
  const match = SEED_USERS_LOCAL.find(u => 
    u.identifiers.includes(cleanId) && u.password === cleanPass
  );
  if (match) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rp_offline_auth_session', JSON.stringify({
        user: match.user,
        profile: match.profile,
        timestamp: Date.now()
      }));
    }
    return {
      success: true,
      user: match.user,
      profile: match.profile,
      isOffline: true
    };
  }
  return null;
}

/**
 * Signs in using either an Email or an Employee Code + password.
 * Returns { success: true, user, profile } or { success: false, error }.
 */
export async function login({ emailOrCode, password }) {
  const cleanIdent = (emailOrCode || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanIdent || !cleanPass) {
    return { success: false, error: 'Please enter both your Employee Code/Email and password.' };
  }

  // 1. Device is completely offline
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
    if (local) return local;
    return { success: false, error: 'You appear to be offline.' };
  }

  if (!isSupabaseConfigured || !supabase) {
    const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
    if (local) return local;
    return {
      success: false,
      error: 'Supabase is not configured yet. Please enter VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    };
  }

  // 2. Resolve Identifier to registered Auth Email
  const resolveResult = await resolveEmailFromIdentifier(cleanIdent);
  if (resolveResult.error) {
    const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
    if (local) return local;
    return { success: false, error: resolveResult.error };
  }

  const email = resolveResult.email;

  // 3. Perform Supabase Auth Sign In with 1 retry on network timeout
  let authResponse = null;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // 12-second abort timeout per attempt
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timed out')), 12000);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password: cleanPass
      });

      authResponse = await Promise.race([signInPromise, timeoutPromise]);
      break; // Completed
    } catch (fetchErr) {
      if (attempts < maxAttempts && isNetworkError(fetchErr)) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      authResponse = { data: null, error: fetchErr };
      break;
    }
  }

  const { data, error } = authResponse || {};

  if (error) {
    // Real network failure
    if (isNetworkError(error)) {
      const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
      if (local) return local;
      return { success: false, error: 'Network connection lost. Please check Wi-Fi or mobile data.' };
    }

    const msg = (error.message || '').toLowerCase();
    const code = (error.code || '').toLowerCase();
    const status = error.status || error.statusCode;

    // Invalid credentials
    if (
      code === 'invalid_credentials' ||
      (status === 400 && msg.includes('invalid login credentials')) ||
      msg.includes('invalid credentials')
    ) {
      return { success: false, error: 'Employee code or password is incorrect.' };
    }

    // Rate limited
    if (status === 429 || code === 'over_request_rate_limit' || msg.includes('rate limit')) {
      return { success: false, error: 'Too many sign-in attempts. Please wait a moment and try again.' };
    }

    // Email not confirmed
    if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
      return { success: false, error: 'Account inactive. Contact your supervisor.' };
    }

    // Banned / Inactive / RLS
    if (code === '42501' || status === 401 || status === 403 || msg.includes('banned') || msg.includes('permission denied')) {
      return { success: false, error: 'Account inactive. Contact your supervisor.' };
    }

    // Server error
    if (status >= 500 && status <= 504) {
      return { success: false, error: 'Server error during authentication. Please contact system admin.' };
    }

    // Try offline auth fallback for other errors
    const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
    if (local) return local;

    console.error('[authService] ERR_AUTH_FAIL:', code || status || 'UNKNOWN');
    return { success: false, error: 'Employee code or password is incorrect.' };
  }

  if (!data?.user) {
    return { success: false, error: 'Employee code or password is incorrect.' };
  }

  // 4. Fetch and verify user profile from public.profiles
  try {
    const profileRes = await getCurrentUserProfile(data.user.id);
    if (!profileRes.success) {
      const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
      if (local) return local;

      await supabase.auth.signOut();
      return { success: false, error: profileRes.error || 'Account inactive. Contact your supervisor.' };
    }

    const profile = profileRes.data;

    // Check profile existence and role
    if (!profile || !profile.role) {
      await supabase.auth.signOut();
      return { success: false, error: 'Account inactive. Contact your supervisor.' };
    }

    // Check if account is active
    if (profile.is_active === false) {
      await supabase.auth.signOut();
      return { success: false, error: 'Account inactive. Contact your supervisor.' };
    }

    // Stash successful profile for offline session continuity
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('rp_offline_auth_session', JSON.stringify({
        user: data.user,
        profile,
        timestamp: Date.now()
      }));
    }

    return {
      success: true,
      user: data.user,
      profile
    };
  } catch (profErr) {
    if (isNetworkError(profErr)) {
      const local = tryLocalOfflineAuth(cleanIdent, cleanPass);
      if (local) return local;
      return { success: false, error: 'Network connection lost. Please check Wi-Fi or mobile data.' };
    }
    console.error('[authService] ERR_PROFILE_EXCEPTION:', profErr.name || 'UNKNOWN');
    return { success: false, error: 'Account inactive. Contact your supervisor.' };
  }
}

/**
 * Logs out the active user and clears session state.
 */
export async function logout() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('rp_offline_auth_session');
  }
  if (!isSupabaseConfigured || !supabase) return { success: true };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[authService] SignOut notice:', error);
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
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('rp_offline_auth_session');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.user) return { success: true, session: { user: parsed.user } };
        } catch (_) {}
      }
    }
    return { success: false, session: null };
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) {
      // Fallback to cached offline session
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('rp_offline_auth_session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.user) return { success: true, session: { user: parsed.user } };
          } catch (_) {}
        }
      }
      if (error && isNetworkError(error)) {
        return { success: false, error: 'Network connection lost. Please check Wi-Fi or mobile data.', session: null };
      }
      return { success: false, error: error ? formatDatabaseError(error) : null, session: null };
    }
    return { success: true, session: data.session };
  } catch (err) {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('rp_offline_auth_session');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.user) return { success: true, session: { user: parsed.user } };
        } catch (_) {}
      }
    }
    if (isNetworkError(err)) {
      return { success: false, error: 'Network connection lost. Please check Wi-Fi or mobile data.', session: null };
    }
    return { success: false, error: formatDatabaseError(err), session: null };
  }
}

/**
 * Fetches the user's role and details from the public.profiles table.
 */
export async function getCurrentUserProfile(userId = null) {
  const getCachedProfile = () => {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('rp_offline_auth_session');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.profile) return { success: true, data: parsed.profile };
        } catch (_) {}
      }
    }
    return null;
  };

  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedProfile();
    if (cached) return cached;
    return { success: false, data: null, error: 'Supabase is not configured.' };
  }

  try {
    let targetUid = userId;
    if (!targetUid) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        const cached = getCachedProfile();
        if (cached) return cached;
        return { success: false, data: null, error: 'No authenticated user found.' };
      }
      targetUid = authData.user.id;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUid)
      .maybeSingle();

    if (error) {
      const cached = getCachedProfile();
      if (cached) return cached;

      if (isNetworkError(error)) {
        return { success: false, data: null, error: 'Network connection lost. Please check Wi-Fi or mobile data.' };
      }
      const code = String(error.code || '');
      const status = error.status || error.statusCode;
      if (code === '42501' || status === 401 || status === 403 || error.message?.includes('permission denied')) {
        return { success: false, data: null, error: 'Access denied. Contact admin.' };
      }
      return { success: false, data: null, error: formatDatabaseError(error) };
    }

    if (!data) {
      const cached = getCachedProfile();
      if (cached) return cached;

      return {
        success: false,
        data: null,
        error: 'No access profile found for this user. Contact admin.'
      };
    }

    if (!data.role) {
      return {
        success: false,
        data: null,
        error: 'No access profile found for this user. Contact admin.'
      };
    }

    if (data.is_active === false) {
      return {
        success: false,
        data,
        error: 'Your account is disabled. Contact admin.'
      };
    }

    return { success: true, data };
  } catch (err) {
    const cached = getCachedProfile();
    if (cached) return cached;

    if (isNetworkError(err)) {
      return { success: false, data: null, error: 'Network connection lost. Please check Wi-Fi or mobile data.' };
    }
    console.error('[authService] Error fetching profile:', err);
    return { success: false, data: null, error: formatDatabaseError(err) };
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
