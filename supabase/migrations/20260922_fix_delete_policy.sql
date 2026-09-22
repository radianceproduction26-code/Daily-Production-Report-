-- ==============================================================================
-- RADIANCE POLYMERS - FIX SHIFT REPORT DELETION RLS POLICY
-- Table: shift_reports_sync
-- Purpose: Grants DELETE permissions on shift_reports_sync to anon and authenticated
-- users so that deleted shift reports are permanently purged from Supabase Cloud.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'shift_reports_sync' 
        AND policyname = 'Allow public delete for shift_reports_sync'
    ) THEN
        CREATE POLICY "Allow public delete for shift_reports_sync"
            ON public.shift_reports_sync FOR DELETE
            TO anon, authenticated
            USING (true);
    END IF;
END $$;
