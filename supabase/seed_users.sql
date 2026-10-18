-- ==============================================================================
-- RADIANCE POLYMERS - SEED USERS FOR AUTH & PROFILES
-- Run this in Supabase Dashboard > SQL Editor to instantly create all accounts
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to seed an auth user if not already present
CREATE OR REPLACE FUNCTION public.seed_user(
    p_email TEXT,
    p_password TEXT,
    p_employee_code TEXT,
    p_full_name TEXT,
    p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(p_email);

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            LOWER(p_email),
            crypt(p_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('role', p_role, 'employee_code', p_employee_code, 'full_name', p_full_name)::jsonb,
            NOW(),
            NOW()
        );
    END IF;

    -- Ensure profile exists with correct role
    INSERT INTO public.profiles (id, full_name, employee_code, role, is_active)
    VALUES (v_user_id, p_full_name, p_employee_code, p_role, TRUE)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        employee_code = EXCLUDED.employee_code,
        role = EXCLUDED.role,
        is_active = TRUE;
END;
$$;

-- 1. Admin Account (Full access to all tabs & settings)
SELECT public.seed_user('admin@radiance.com', 'Admin@123', 'ADM-001', 'Plant Admin', 'admin');
SELECT public.seed_user('adm-001@radiance.local', 'Admin@123', 'ADM-001', 'Plant Admin', 'admin');

-- 2. Supervisors (Shift signoffs, analytics, report reviews)
SELECT public.seed_user('lokesh@radiance.com', 'Super@123', 'SUP-01', 'Mr. Lokesh', 'supervisor');
SELECT public.seed_user('sup-01@radiance.local', 'Super@123', 'SUP-01', 'Mr. Lokesh', 'supervisor');

SELECT public.seed_user('akshay@radiance.com', 'Super@123', 'SUP-02', 'Mr. Akshay', 'supervisor');
SELECT public.seed_user('sup-02@radiance.local', 'Super@123', 'SUP-02', 'Mr. Akshay', 'supervisor');

-- 3. Operators (Shop floor hourly entry & shift console)
SELECT public.seed_user('emp-101@radiance.local', 'Op@1234', 'EMP-101', 'Shreyank', 'operator');
SELECT public.seed_user('emp-102@radiance.local', 'Op@1234', 'EMP-102', 'Dheera', 'operator');
SELECT public.seed_user('emp-103@radiance.local', 'Op@1234', 'EMP-103', 'Mahadev', 'operator');
SELECT public.seed_user('emp-104@radiance.local', 'Op@1234', 'EMP-104', 'Ravi', 'operator');
SELECT public.seed_user('emp-105@radiance.local', 'Op@1234', 'EMP-105', 'Bipendar', 'operator');
SELECT public.seed_user('emp-106@radiance.local', 'Op@1234', 'EMP-106', 'Ramkesh', 'operator');
