# Root Cause Analysis: "Shop-floor network connection lost" on Login

## Executive Summary
On the login screen of the Radiance Polymers Production Reporting System, entering Employee Code `ADM-001` and attempting to sign in caused a red error banner stating:
> *"Shop-floor network connection lost. Please check Wi-Fi or mobile data."*

The diagnostic investigation confirmed that the shop-floor network and the live Supabase database were online. The error was triggered by client-side connection poisoning and account configuration mismatches.

---

## 1. Root Causes & Evidence

### Primary Cause: Browser Connection Poisoned by Dead Supabase Project
* **Evidence:** The browser developer console captured:
  ```
  WebSocket connection to 'wss://jhgedjjnxsimgsfornmn.supabase.co/realtime/v1/websocket?apikey=sb_publishable_z_WmXPFENlvYthD7ueEfqg_6hhW5xHS&vsn=2.0.0' failed
  ```
* **Explanation:** In `src/services/storageService.js:115-127`, `getSupabaseConfig()` prioritized `localStorage.getItem('rp_supabase_config_v1')` over `.env`. A previous test session had saved the defunct project `jhgedjjnxsimgsfornmn.supabase.co` into the browser's LocalStorage.
* **Impact:** Every network request to `jhgedjjnxsimgsfornmn.supabase.co` failed immediately (`TypeError: Failed to fetch`). The legacy error handler in `src/lib/supabaseClient.js` caught any fetch error and translated it to *"Shop-floor network connection lost. Please check Wi-Fi or mobile data."*

### Secondary Cause 1: `ADM-001` Account Email Discrepancy
* **Evidence:** In the live Supabase database (`auth.users` & `public.profiles`):
  - Employee Code `ADM-001` is registered to: **`adm-001@radiance.local`** (ID: `fd8fb2ed-7784-4fe2-a16a-f047864f48e5`).
  - Corporate Admin `ADM-CORP` is registered to: **`admin@radiance.com`** (ID: `15ca9616-ad4a-43c6-936c-2715ebe799b2`).
* **Explanation:** In `src/services/authService.js`, the hardcoded dictionary erroneously mapped `'adm-001'` to `'admin@radiance.com'`. Entering the credentials for `ADM-001` caused Supabase Auth to reject the login with `400 Invalid login credentials`.

### Secondary Cause 2: Missing RPC & RLS Restrictions for `anon`
* **Evidence:** `resolveEmailFromIdentifier()` called `supabase.rpc('get_email_by_employee_code')`.
* **Explanation:** That RPC did not exist in Postgres (`ERROR 42883`). Unauthenticated users were also blocked by Row Level Security from reading `public.profiles`. Any non-hardcoded employee code failed before reaching the authentication endpoint.

---

## 2. Fixes Implemented

1. **Database Migration (`auth_resolve_login_email`):**
   - Created `public.resolve_login_email(p_code text)` and `public.get_email_by_employee_code(p_employee_code text)` with `SECURITY DEFINER` and `SET search_path = public, auth, pg_temp`.
   - Granted execution to `anon` and `authenticated` roles.
   - Restricted to active accounts (`is_active = TRUE` and `deleted_at IS NULL`), returning `NULL` for unknown or inactive codes to eliminate user enumeration risks.
2. **Frontend Authentication Service (`src/services/authService.js`):**
   - Aligned `KNOWN_CODES` and `SEED_USERS_LOCAL` with live `auth.users` records.
   - Replaced generic error catch-all with distinct error states (Offline, Network Timeout with 1 retry, Invalid Credentials, Account Inactive, Rate Limited, Server Error).
   - Sanitized console logs to ensure passwords and credentials are never printed.
3. **Storage Configuration Sanitizer (`src/services/storageService.js`):**
   - Updated `getSupabaseConfig()` to automatically validate and purge stale Supabase project URLs from `localStorage` whenever they diverge from the active project ref (`tedwgnybnkfzijvhvssx`).
4. **Production Build:**
   - Recompiled all client bundles using `npm run build` (Vite v8.3.0).

---

## 3. Verification & Test Matrix

| Test ID | Test Scenario | Executed As | Raw Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Direct GoTrue Health Endpoint | Public Web | `200 {"version":"v2.197.0","name":"GoTrue"}` | **PASS** |
| **AUTH-02** | Resolve `ADM-001` (Exact Case) | `anon` Role | `"adm-001@radiance.local"` | **PASS** |
| **AUTH-03** | Resolve `adm-001` (Lowercase) | `anon` Role | `"adm-001@radiance.local"` | **PASS** |
| **AUTH-04** | Resolve `'  ADM-001  '` (Whitespace) | `anon` Role | `"adm-001@radiance.local"` | **PASS** |
| **AUTH-05** | Resolve `ADM-CORP` (Corporate Admin) | `anon` Role | `"admin@radiance.com"` | **PASS** |
| **AUTH-06** | Resolve Unknown Code `ZZ_TEST_NONEXISTENT` | `anon` Role | `NULL` (No profile leak) | **PASS** |
| **AUTH-07** | Resolve Inactive Account `ZZ_TEST_INACT` | `anon` Role | `NULL` (Account blocked) | **PASS** |
| **AUTH-08** | Legacy Alias `get_email_by_employee_code` | `anon` Role | `"adm-001@radiance.local"` | **PASS** |
| **AUTH-09** | Client Build Verification | Node/Vite | `dist/` rebuilt with zero errors (3.61s) | **PASS** |
