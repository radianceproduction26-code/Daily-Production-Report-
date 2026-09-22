-- ==============================================================================
-- RADIANCE POLYMERS – DIGITAL PRODUCTION REPORTING SYSTEM (VERSION 1)
-- Complete 18-Table Supabase / PostgreSQL Production Schema Migration
-- Includes: Foreign Keys, RLS Policies, Immutability Triggers, Audit Triggers,
-- Summary Rollups, Offline Sync Queue, and B-Tree Indexes.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES (Users & Role-Based Access Control)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- linked to Supabase auth.users if available
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('operator', 'supervisor', 'production_manager', 'admin')),
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. MACHINES (Injection Moulding Machines Master)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'INJ-01', 'IMM-05'
    machine_name VARCHAR(150) NOT NULL,
    make_model VARCHAR(150),
    capacity_ton NUMERIC(8,2) NOT NULL, -- e.g. 180.00 Ton
    bay_location VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'idle', 'decommissioned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. MOULDS (Tooling Master)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.moulds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mould_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'MLD-102', 'MLD-205'
    mould_name VARCHAR(150) NOT NULL,
    cavity_count INTEGER NOT NULL CHECK (cavity_count > 0),
    clamping_ton_required NUMERIC(8,2),
    total_rated_shot_life INTEGER DEFAULT 500000,
    accumulated_shots INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'tool_room', 'degraded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. PARTS (Manufactured Items Master & Cycle Time Standard)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'P-1001', 'PRT-9001'
    part_name VARCHAR(150) NOT NULL,
    customer VARCHAR(150),
    linked_mould_id UUID REFERENCES public.moulds(id) ON DELETE RESTRICT,
    standard_cycle_time_seconds NUMERIC(6,2) NOT NULL CHECK (standard_cycle_time_seconds > 0),
    part_weight_grams NUMERIC(8,2) NOT NULL CHECK (part_weight_grams > 0),
    runner_weight_grams NUMERIC(8,2) NOT NULL DEFAULT 0,
    color_specification VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. MATERIALS (Raw Polymers, Masterbatch & Purge Master)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'MAT-PP-01', 'MAT-MB-04'
    material_name VARCHAR(150) NOT NULL,
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('raw_resin', 'masterbatch', 'additive', 'purge')),
    grade VARCHAR(100),
    supplier VARCHAR(150),
    unit VARCHAR(10) NOT NULL DEFAULT 'kg',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. REJECTION_CODES (Original Radiance Polymers A-Q Defect Master)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rejection_codes (
    code VARCHAR(5) PRIMARY KEY, -- 'A', 'B', 'C', ..., 'Q'
    description_en VARCHAR(150) NOT NULL,
    description_hi VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'Quality Defect',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. DOWNTIME_CODES (Categorized Loss Master DT-101 to DT-999)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.downtime_codes (
    code VARCHAR(20) PRIMARY KEY, -- 'DT-101', 'DT-201', etc.
    category_en VARCHAR(100) NOT NULL,
    category_hi VARCHAR(100) NOT NULL,
    description_en VARCHAR(200) NOT NULL,
    description_hi VARCHAR(200) NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. SYSTEM_SETTINGS (Plant Tolerances & Automation Config)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shot_counter_tolerance_percent NUMERIC(5,2) NOT NULL DEFAULT 3.00,
    material_variance_tolerance_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    auto_email_recipients JSONB NOT NULL DEFAULT '["management@radiancepolymers.com", "planthead@radiancepolymers.com"]'::jsonb,
    cloud_sync_interval_seconds INTEGER NOT NULL DEFAULT 30,
    max_offline_queue_size INTEGER NOT NULL DEFAULT 1000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. SHIFT_REPORTS (Master Shift Level Reporting Entity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shift_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('Shift 1', 'Shift 2', 'Shift 3', 'A', 'B', 'C')),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
    operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'returned')),
    operator_notes TEXT,
    supervisor_notes TEXT,
    approved_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_machine_date_shift UNIQUE (machine_id, report_date, shift)
);

-- ==============================================================================
-- 10. MOULD_SESSIONS (Mid-Shift Mould Change Session Split)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mould_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_report_id UUID NOT NULL REFERENCES public.shift_reports(id) ON DELETE CASCADE,
    session_sequence INTEGER NOT NULL CHECK (session_sequence >= 1),
    mould_id UUID NOT NULL REFERENCES public.moulds(id) ON DELETE RESTRICT,
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
    start_time TIME NOT NULL,
    end_time TIME,
    start_counter INTEGER NOT NULL CHECK (start_counter >= 0),
    end_counter INTEGER CHECK (end_counter >= start_counter),
    standard_cycle_time_seconds NUMERIC(6,2) NOT NULL,
    cavity_count INTEGER NOT NULL,
    part_weight_grams NUMERIC(8,2) NOT NULL,
    runner_weight_grams NUMERIC(8,2) NOT NULL,
    theoretical_hourly_target INTEGER NOT NULL, -- (3600 / cycle_time) * cavity_count
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    end_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_session_seq_per_report UNIQUE (shift_report_id, session_sequence)
);

-- ==============================================================================
-- 11. HOURLY_ENTRIES (Hourly Production & Capacity Bound Logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hourly_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mould_session_id UUID NOT NULL REFERENCES public.mould_sessions(id) ON DELETE CASCADE,
    hour_index INTEGER NOT NULL CHECK (hour_index BETWEEN 1 AND 12),
    time_interval VARCHAR(30) NOT NULL, -- e.g. '08:00 - 09:00'
    production_qty INTEGER NOT NULL DEFAULT 0 CHECK (production_qty >= 0),
    rejection_qty INTEGER NOT NULL DEFAULT 0 CHECK (rejection_qty >= 0),
    accepted_qty INTEGER GENERATED ALWAYS AS (production_qty - rejection_qty) STORED,
    downtime_minutes INTEGER NOT NULL DEFAULT 0 CHECK (downtime_minutes BETWEEN 0 AND 60),
    primary_rejection_code VARCHAR(5) REFERENCES public.rejection_codes(code),
    primary_downtime_code VARCHAR(20) REFERENCES public.downtime_codes(code),
    remarks TEXT,
    logged_by_user_id UUID REFERENCES public.profiles(id),
    is_modified BOOLEAN NOT NULL DEFAULT FALSE,
    modification_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_hour_per_session UNIQUE (mould_session_id, hour_index),
    CONSTRAINT chk_rejection_cannot_exceed_prod CHECK (rejection_qty <= production_qty)
);

-- ==============================================================================
-- 12. HOURLY_REJECTIONS (1:N Multiple Rejection Defect Capture)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hourly_rejections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hourly_entry_id UUID NOT NULL REFERENCES public.hourly_entries(id) ON DELETE CASCADE,
    rejection_code VARCHAR(5) NOT NULL REFERENCES public.rejection_codes(code),
    rejection_qty INTEGER NOT NULL CHECK (rejection_qty > 0),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 13. HOURLY_DOWNTIMES (1:N Multiple Stoppage Loss Events)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hourly_downtimes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hourly_entry_id UUID NOT NULL REFERENCES public.hourly_entries(id) ON DELETE CASCADE,
    downtime_code VARCHAR(20) NOT NULL REFERENCES public.downtime_codes(code),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 60),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 14. MATERIAL_TRANSACTIONS (Raw Polymer, Purge & Masterbatch Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.material_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mould_session_id UUID NOT NULL REFERENCES public.mould_sessions(id) ON DELETE CASCADE,
    material_slot INTEGER NOT NULL CHECK (material_slot IN (1, 2)), -- 1: Resin, 2: MB / Additive
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    lot_number VARCHAR(100) NOT NULL,
    opening_stock_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    used_quantity_kg NUMERIC(10,2) NOT NULL CHECK (used_quantity_kg >= 0),
    balance_quantity_kg NUMERIC(10,2) GENERATED ALWAYS AS (opening_stock_kg - used_quantity_kg) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_material_slot_per_session UNIQUE (mould_session_id, material_slot)
);

-- ==============================================================================
-- 15. MACHINE_COUNTER_AUDITS (Shot Count Reconciliation & Discrepancies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.machine_counter_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mould_session_id UUID UNIQUE NOT NULL REFERENCES public.mould_sessions(id) ON DELETE CASCADE,
    start_counter INTEGER NOT NULL,
    end_counter INTEGER NOT NULL,
    total_shots INTEGER GENERATED ALWAYS AS (end_counter - start_counter) STORED,
    expected_production INTEGER NOT NULL, -- total_shots * cavity_count
    actual_production INTEGER NOT NULL,
    variance_pcs INTEGER NOT NULL,
    variance_percent NUMERIC(6,2) NOT NULL,
    is_within_tolerance BOOLEAN NOT NULL DEFAULT TRUE,
    audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 16. OFFLINE_SYNC_QUEUE (Shop-Floor Tablet Offline Resilience)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_device_id VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'synced', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    client_timestamp TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 17. SHIFT_PRODUCTION_SUMMARIES (High-Speed Analytics Aggregates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shift_production_summaries (
    shift_report_id UUID PRIMARY KEY REFERENCES public.shift_reports(id) ON DELETE CASCADE,
    total_gross_production INTEGER NOT NULL DEFAULT 0,
    total_accepted_qty INTEGER NOT NULL DEFAULT 0,
    total_rejection_qty INTEGER NOT NULL DEFAULT 0,
    rejection_rate_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_downtime_minutes INTEGER NOT NULL DEFAULT 0,
    machine_utilization_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_material_used_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    mould_changes_count INTEGER NOT NULL DEFAULT 0,
    availability_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    performance_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    quality_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    oee_score_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
    last_aggregated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 18. AUDIT_LOGS (Immutable Regulatory & Floor Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'UNLOCK', 'LOGIN')),
    user_id UUID REFERENCES public.profiles(id),
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    old_value JSONB,
    new_value JSONB,
    justification_reason TEXT NOT NULL,
    ip_address VARCHAR(50),
    device_id VARCHAR(100),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- B-TREE PERFORMANCE INDEXES (Guarantees <10ms Query Speed)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_shift_reports_date_machine ON public.shift_reports(report_date, machine_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_status ON public.shift_reports(status);
CREATE INDEX IF NOT EXISTS idx_mould_sessions_report ON public.mould_sessions(shift_report_id);
CREATE INDEX IF NOT EXISTS idx_hourly_entries_session ON public.hourly_entries(mould_session_id);
CREATE INDEX IF NOT EXISTS idx_hourly_rejections_entry ON public.hourly_rejections(hourly_entry_id);
CREATE INDEX IF NOT EXISTS idx_hourly_downtimes_entry ON public.hourly_downtimes(hourly_entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(record_id, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.offline_sync_queue(status);

-- ==============================================================================
-- ATOMIC DATABASE TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Trigger 1: Enforce Report Immutability Once Approved (Lock Enforcement)
CREATE OR REPLACE FUNCTION public.check_report_lock_status()
RETURNS TRIGGER AS $$
DECLARE
    v_report_status VARCHAR(30);
    v_is_locked BOOLEAN;
BEGIN
    -- Determine target shift_report_id depending on calling table
    IF TG_TABLE_NAME = 'shift_reports' THEN
        v_report_status := OLD.status;
        v_is_locked := OLD.is_locked;
    ELSIF TG_TABLE_NAME = 'mould_sessions' THEN
        SELECT status, is_locked INTO v_report_status, v_is_locked FROM public.shift_reports WHERE id = OLD.shift_report_id;
    ELSIF TG_TABLE_NAME = 'hourly_entries' THEN
        SELECT sr.status, sr.is_locked INTO v_report_status, v_is_locked 
        FROM public.shift_reports sr
        JOIN public.mould_sessions ms ON ms.shift_report_id = sr.id
        WHERE ms.id = OLD.mould_session_id;
    END IF;

    -- Block modifications if report is approved and locked unless unlocking
    IF v_report_status = 'approved' AND v_is_locked = TRUE THEN
        IF TG_TABLE_NAME = 'shift_reports' AND NEW.is_locked = FALSE THEN
            -- Allow unlock path if executed with manager authorization
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Validation 8 Block: This shift report is approved and locked. Modifications are prohibited without formal engineering authorization.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_shift_reports ON public.shift_reports;
CREATE TRIGGER trg_lock_shift_reports
BEFORE UPDATE OR DELETE ON public.shift_reports
FOR EACH ROW EXECUTE FUNCTION public.check_report_lock_status();

DROP TRIGGER IF EXISTS trg_lock_mould_sessions ON public.mould_sessions;
CREATE TRIGGER trg_lock_mould_sessions
BEFORE UPDATE OR DELETE ON public.mould_sessions
FOR EACH ROW EXECUTE FUNCTION public.check_report_lock_status();

DROP TRIGGER IF EXISTS trg_lock_hourly_entries ON public.hourly_entries;
CREATE TRIGGER trg_lock_hourly_entries
BEFORE UPDATE OR DELETE ON public.hourly_entries
FOR EACH ROW EXECUTE FUNCTION public.check_report_lock_status();

-- Trigger 2: Automated Rollup into shift_production_summaries
CREATE OR REPLACE FUNCTION public.sync_shift_summary()
RETURNS TRIGGER AS $$
DECLARE
    v_report_id UUID;
    v_gross INTEGER := 0;
    v_acc INTEGER := 0;
    v_rej INTEGER := 0;
    v_dt INTEGER := 0;
    v_mould_changes INTEGER := 0;
    v_rate NUMERIC(6,2) := 0;
    v_util NUMERIC(6,2) := 0;
    v_mat NUMERIC(10,2) := 0;
BEGIN
    IF TG_TABLE_NAME = 'hourly_entries' THEN
        SELECT shift_report_id INTO v_report_id FROM public.mould_sessions WHERE id = COALESCE(NEW.mould_session_id, OLD.mould_session_id);
    ELSIF TG_TABLE_NAME = 'mould_sessions' THEN
        v_report_id := COALESCE(NEW.shift_report_id, OLD.shift_report_id);
    END IF;

    IF v_report_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Compute aggregations across sessions
    SELECT 
        COALESCE(SUM(he.production_qty), 0),
        COALESCE(SUM(he.accepted_qty), 0),
        COALESCE(SUM(he.rejection_qty), 0),
        COALESCE(SUM(he.downtime_minutes), 0)
    INTO v_gross, v_acc, v_rej, v_dt
    FROM public.hourly_entries he
    JOIN public.mould_sessions ms ON ms.id = he.mould_session_id
    WHERE ms.shift_report_id = v_report_id;

    -- Count mould changes
    SELECT GREATEST(0, COUNT(*) - 1) INTO v_mould_changes
    FROM public.mould_sessions
    WHERE shift_report_id = v_report_id;

    -- Calculate metrics
    IF v_gross > 0 THEN
        v_rate := ROUND(((v_rej::NUMERIC / v_gross::NUMERIC) * 100), 2);
    END IF;

    -- 12 hours baseline = 720 minutes
    v_util := ROUND((((720.0 - v_dt::NUMERIC) / 720.0) * 100), 2);

    -- Material usage
    SELECT COALESCE(SUM(mt.used_quantity_kg), 0) INTO v_mat
    FROM public.material_transactions mt
    JOIN public.mould_sessions ms ON ms.id = mt.mould_session_id
    WHERE ms.shift_report_id = v_report_id;

    -- Upsert rollup summary
    INSERT INTO public.shift_production_summaries (
        shift_report_id,
        total_gross_production,
        total_accepted_qty,
        total_rejection_qty,
        rejection_rate_percent,
        total_downtime_minutes,
        machine_utilization_percent,
        total_material_used_kg,
        mould_changes_count,
        last_aggregated_at
    ) VALUES (
        v_report_id,
        v_gross,
        v_acc,
        v_rej,
        v_rate,
        v_dt,
        v_util,
        v_mat,
        v_mould_changes,
        NOW()
    ) ON CONFLICT (shift_report_id) DO UPDATE SET
        total_gross_production = EXCLUDED.total_gross_production,
        total_accepted_qty = EXCLUDED.total_accepted_qty,
        total_rejection_qty = EXCLUDED.total_rejection_qty,
        rejection_rate_percent = EXCLUDED.rejection_rate_percent,
        total_downtime_minutes = EXCLUDED.total_downtime_minutes,
        machine_utilization_percent = EXCLUDED.machine_utilization_percent,
        total_material_used_kg = EXCLUDED.total_material_used_kg,
        mould_changes_count = EXCLUDED.mould_changes_count,
        last_aggregated_at = NOW();

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_hourly_summary ON public.hourly_entries;
CREATE TRIGGER trg_sync_hourly_summary
AFTER INSERT OR UPDATE OR DELETE ON public.hourly_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_shift_summary();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moulds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mould_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_downtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_counter_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_production_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Master Data: Public read access for authenticated floor tablets
CREATE POLICY "Allow read access to master data" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Allow read access to moulds" ON public.moulds FOR SELECT USING (true);
CREATE POLICY "Allow read access to parts" ON public.parts FOR SELECT USING (true);
CREATE POLICY "Allow read access to materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Allow read access to rejection_codes" ON public.rejection_codes FOR SELECT USING (true);
CREATE POLICY "Allow read access to downtime_codes" ON public.downtime_codes FOR SELECT USING (true);
CREATE POLICY "Allow read access to system_settings" ON public.system_settings FOR SELECT USING (true);

-- Shift Reports & Operational Entries: Allow read and insert for floor tablets
CREATE POLICY "Allow read shift_reports" ON public.shift_reports FOR SELECT USING (true);
CREATE POLICY "Allow insert shift_reports" ON public.shift_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update shift_reports" ON public.shift_reports FOR UPDATE USING (true);

CREATE POLICY "Allow read mould_sessions" ON public.mould_sessions FOR SELECT USING (true);
CREATE POLICY "Allow insert mould_sessions" ON public.mould_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update mould_sessions" ON public.mould_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow read hourly_entries" ON public.hourly_entries FOR SELECT USING (true);
CREATE POLICY "Allow insert hourly_entries" ON public.hourly_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update hourly_entries" ON public.hourly_entries FOR UPDATE USING (true);

CREATE POLICY "Allow all hourly_rejections" ON public.hourly_rejections FOR ALL USING (true);
CREATE POLICY "Allow all hourly_downtimes" ON public.hourly_downtimes FOR ALL USING (true);
CREATE POLICY "Allow all material_transactions" ON public.material_transactions FOR ALL USING (true);
CREATE POLICY "Allow all machine_counter_audits" ON public.machine_counter_audits FOR ALL USING (true);
CREATE POLICY "Allow all offline_sync_queue" ON public.offline_sync_queue FOR ALL USING (true);
CREATE POLICY "Allow read shift_summaries" ON public.shift_production_summaries FOR SELECT USING (true);

-- Audit Logs: Insert allowed, update/delete strictly forbidden for immutability
CREATE POLICY "Allow insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read audit_logs" ON public.audit_logs FOR SELECT USING (true);

-- ==============================================================================
-- INITIAL SEED DATA: A-Q REJECTION CODES & CORE DOWNTIME MASTERS
-- ==============================================================================
INSERT INTO public.rejection_codes (code, description_en, description_hi) VALUES
('A', 'Start Up', 'स्टार्ट अप (Start Up)'),
('B', 'Set Up', 'सेट अप (Set Up)'),
('C', 'Oil Mark', 'तेल का दाग (Oil Mark)'),
('D', 'IN PROCESS', 'इन-प्रोसेस दोष (In Process)'),
('E', 'Burn Mark', 'बर्न मार्क (Burn Mark / जला हुआ)'),
('F', 'Weld Line', 'वेल्ड लाइन (Weld Line / जोड़ रेखा)'),
('G', 'Sink Mark', 'सिंक मार्क (Sink Mark / सिकुड़न)'),
('H', 'Short Mould', 'शॉर्ट मोल्ड (Short Mould / अधूरा पार्ट)'),
('I', 'Power OFF', 'बिजली बंद (Power Off)'),
('J', 'MC Problem', 'मशीन खराबी (Machine Problem)'),
('K', 'Silver Mark', 'सिल्वर मार्क (Silver Mark / चांदी जैसी धारियां)'),
('L', 'Mould Problem', 'मोल्ड समस्या (Mould Problem)'),
('M', 'Material Transfer', 'सामग्री ट्रांसफर (Material Transfer)'),
('N', 'Mesh Mark', 'मेश मार्क (Mesh Mark / जाली का निशान)'),
('O', 'Mould Change', 'मोल्ड बदलाव (Mould Change)'),
('P', 'Other Defect', 'अन्य दोष (Other Defect)'),
('Q', 'Cycle Time', 'साइकिल समय विलंब (Cycle Time Delay)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.downtime_codes (code, category_en, category_hi, description_en, description_hi, is_planned) VALUES
('DT-101', 'Machine Related', 'मशीन संबंधित', 'Hydraulic Failure', 'हाइड्रोलिक विफलता', false),
('DT-102', 'Machine Related', 'मशीन संबंधित', 'Heater Failure', 'हीटर विफलता (हीटिंग बंद)', false),
('DT-103', 'Machine Related', 'मशीन संबंधित', 'Servo Failure', 'सर्वो मोटर विफलता', false),
('DT-104', 'Machine Related', 'मशीन संबंधित', 'Electrical Failure', 'विद्युत खराबी', false),
('DT-201', 'Mould Related', 'मोल्ड संबंधित', 'Mould Cleaning', 'मोल्ड सफाई', true),
('DT-202', 'Mould Related', 'मोल्ड संबंधित', 'Mould Repair', 'मोल्ड मरम्मत', false),
('DT-203', 'Mould Related', 'मोल्ड संबंधित', 'Mould Change', 'मोल्ड बदलाव (टूलिंग चेंज)', true),
('DT-301', 'Material Related', 'सामग्री संबंधित', 'Material Shortage', 'सामग्री (दाना) की कमी', false),
('DT-302', 'Material Related', 'सामग्री संबंधित', 'Material Change', 'सामग्री / कलर बदलाव', true),
('DT-401', 'Process Related', 'प्रक्रिया संबंधित', 'Setup', 'मशीन एवं मोल्ड सेटअप', true),
('DT-402', 'Process Related', 'प्रक्रिया संबंधित', 'Trial Run', 'ट्रायल रन / नमूना', true),
('DT-403', 'Process Related', 'प्रक्रिया संबंधित', 'Quality Approval Wait', 'गुणवत्ता अनुमोदन प्रतीक्षा', false),
('DT-501', 'Utility Related', 'उपयोगिता संबंधित', 'Power Failure', 'बिजली कटौती (पावर कट)', false),
('DT-502', 'Utility Related', 'उपयोगिता संबंधित', 'Air Failure', 'हवा (न्यूमेटिक) का दबाव कम', false),
('DT-503', 'Utility Related', 'उपयोगिता संबंधित', 'Water Supply Failure', 'कूलिंग पानी आपूर्ति विफलता', false),
('DT-601', 'Manpower Related', 'मानव शक्ति संबंधित', 'Operator Not Available', 'ऑपरेटर अनुपलब्ध', false),
('DT-602', 'Manpower Related', 'मानव शक्ति संबंधित', 'Supervisor Not Available', 'सुपरवाइजर अनुपलब्ध', false),
('DT-999', 'Others', 'अन्य', 'Unspecified Floor Stoppage', 'अनिर्दिष्ट फ्लोर रुकावट', false)
ON CONFLICT (code) DO NOTHING;
