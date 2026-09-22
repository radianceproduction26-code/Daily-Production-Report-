-- ==============================================================================
-- RADIANCE POLYMERS - CLOUD SYNC & LAPTOP MASTER SHEET MIGRATION
-- Table: shift_reports_sync
-- Purpose: Real-time cloud sync of all production shift reports for instant reflection
-- on Laptop Master Sheet and multi-device operational synchronization.
-- ==============================================================================

-- 1. Create the unified shift reports sync table
CREATE TABLE IF NOT EXISTS public.shift_reports_sync (
    id TEXT PRIMARY KEY,
    report_date DATE NOT NULL,
    shift TEXT NOT NULL,
    machine_number TEXT NOT NULL,
    machine_name TEXT,
    operator_name TEXT NOT NULL,
    supervisor_name TEXT,
    part_number TEXT,
    part_name TEXT,
    target_qty INTEGER DEFAULT 0,
    production_qty INTEGER DEFAULT 0,
    accepted_qty INTEGER DEFAULT 0,
    rejection_qty INTEGER DEFAULT 0,
    rejection_rate NUMERIC(5,2) DEFAULT 0.00,
    downtime_minutes INTEGER DEFAULT 0,
    efficiency_percent NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved'
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    full_data JSONB NOT NULL -- Complete raw report snapshot with sessions & hourly entries
);

-- 2. Indexes for high performance laptop master queries
CREATE INDEX IF NOT EXISTS idx_shift_reports_sync_date ON public.shift_reports_sync(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_shift_reports_sync_machine ON public.shift_reports_sync(machine_number);
CREATE INDEX IF NOT EXISTS idx_shift_reports_sync_status ON public.shift_reports_sync(status);
CREATE INDEX IF NOT EXISTS idx_shift_reports_sync_updated ON public.shift_reports_sync(updated_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.shift_reports_sync ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies safely (No destructive DROP statements)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'shift_reports_sync' 
        AND policyname = 'Allow public read access for shift_reports_sync'
    ) THEN
        CREATE POLICY "Allow public read access for shift_reports_sync"
            ON public.shift_reports_sync FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'shift_reports_sync' 
        AND policyname = 'Allow public insert/upsert for shift_reports_sync'
    ) THEN
        CREATE POLICY "Allow public insert/upsert for shift_reports_sync"
            ON public.shift_reports_sync FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'shift_reports_sync' 
        AND policyname = 'Allow public update for shift_reports_sync'
    ) THEN
        CREATE POLICY "Allow public update for shift_reports_sync"
            ON public.shift_reports_sync FOR UPDATE
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 5. Enable Realtime Replication for instant laptop master sheet updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'shift_reports_sync'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_reports_sync;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
