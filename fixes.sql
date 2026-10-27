-- ==============================================================================
-- RADIANCE POLYMERS - SECURE EMPLOYEE CODE RESOLVER FOR ANONYMOUS AUTHENTICATION
-- Applied Migration: auth_resolve_login_email
-- ==============================================================================

-- 1. Create secure resolver function with strict search_path
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_email text;
    v_clean_code text;
BEGIN
    v_clean_code := UPPER(TRIM(p_code));

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN NULL;
    END IF;

    -- Look up email for active profile only
    SELECT u.email INTO v_email
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE UPPER(TRIM(p.employee_code)) = v_clean_code
      AND p.is_active = TRUE
      AND u.deleted_at IS NULL
    LIMIT 1;

    RETURN v_email;
END;
$$;

-- Grant execution to anon and authenticated roles
REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- 2. Legacy alias for backward compatibility with frontend clients
CREATE OR REPLACE FUNCTION public.get_email_by_employee_code(p_employee_code text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.resolve_login_email(p_employee_code);
$$;

REVOKE ALL ON FUNCTION public.get_email_by_employee_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_code(text) TO anon, authenticated;
