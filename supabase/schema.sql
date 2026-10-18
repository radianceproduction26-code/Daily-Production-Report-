-- ==============================================================================
-- RADIANCE POLYMERS - DIGITAL PRODUCTION REPORTING SYSTEM
-- Supabase Postgres Schema, RLS Security Policies, Triggers & Seed Catalogs
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing triggers if present to ensure clean idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_supervisor_or_admin();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROFILES TABLE (Linked 1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    employee_code TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'supervisor', 'operator')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper functions for RLS checks (SECURITY DEFINER avoids infinite policy recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('supervisor', 'admin') AND is_active = TRUE
    );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. MASTER DATA TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 Machines Fleet (MC01..MC14)
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_number TEXT UNIQUE NOT NULL, -- e.g. MC03
    machine_name TEXT NOT NULL,         -- e.g. Milacron 450T
    make TEXT,
    model TEXT,
    capacity_ton NUMERIC DEFAULT 450 CHECK (capacity_ton > 0),
    hourly_cost_rate NUMERIC DEFAULT 1500 CHECK (hourly_cost_rate >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Parts Master
CREATE TABLE IF NOT EXISTS public.parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT UNIQUE NOT NULL,   -- e.g. F53200000A
    part_name TEXT NOT NULL,             -- e.g. RBC SHROUD
    customer TEXT,                       -- e.g. Kinetic
    standard_cycle_time_seconds NUMERIC NOT NULL CHECK (standard_cycle_time_seconds > 0),
    cavity_count INTEGER NOT NULL CHECK (cavity_count > 0),
    part_weight_grams NUMERIC NOT NULL CHECK (part_weight_grams > 0),
    runner_weight_grams NUMERIC NOT NULL DEFAULT 0 CHECK (runner_weight_grams >= 0),
    raw_material_grade TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.3 Raw Materials & Resins
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code TEXT UNIQUE NOT NULL, -- e.g. MAT-PP-01, MB01
    material_name TEXT NOT NULL,         -- e.g. PP Copolymer 575P
    material_type TEXT NOT NULL DEFAULT 'Virgin Resin' CHECK (material_type IN ('Virgin Resin', 'Masterbatch', 'Regrind', 'Engineering Resin', 'Purge')),
    grade TEXT,
    supplier TEXT,
    cost_per_kg NUMERIC DEFAULT 0 CHECK (cost_per_kg >= 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.4 BOM (Bill of Materials) - Part to Raw Material Composition
CREATE TABLE IF NOT EXISTS public.part_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
    percentage NUMERIC DEFAULT 100 CHECK (percentage > 0 AND percentage <= 100),
    quantity_per_shot_grams NUMERIC CHECK (quantity_per_shot_grams >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_part_material UNIQUE (part_id, material_id)
);

-- 4.5 Machine to Part Tooling Mappings
CREATE TABLE IF NOT EXISTS public.machine_part_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    mould_number TEXT,
    approved_to_run BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_machine_part UNIQUE (machine_id, part_id)
);

-- 4.6 Rejection Defect Codes (A through Q)
CREATE TABLE IF NOT EXISTS public.rejection_reasons (
    code TEXT PRIMARY KEY,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    category TEXT DEFAULT 'Quality Defect',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7 Downtime Loss Codes (DT-401 through DT-409)
CREATE TABLE IF NOT EXISTS public.downtime_reasons (
    code TEXT PRIMARY KEY,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Operational',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PRODUCTION REPORTS (Shift Logs, 12-Hour Breakdown, Materials & Lumps)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.production_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('Shift A', 'Shift B')),
    machine_number TEXT NOT NULL,
    machine_name TEXT,
    part_number TEXT NOT NULL,
    part_name TEXT,
    operator_id UUID REFERENCES public.profiles(id),
    operator_code TEXT,
    operator_name TEXT NOT NULL,
    supervisor_id UUID REFERENCES public.profiles(id),
    supervisor_name TEXT,
    produced_qty INTEGER NOT NULL DEFAULT 0 CHECK (produced_qty >= 0),
    accepted_qty INTEGER NOT NULL DEFAULT 0 CHECK (accepted_qty >= 0),
    rejection_qty INTEGER NOT NULL DEFAULT 0 CHECK (rejection_qty >= 0),
    downtime_minutes INTEGER NOT NULL DEFAULT 0 CHECK (downtime_minutes >= 0),
    lumps_generated_kg NUMERIC NOT NULL DEFAULT 0.0 CHECK (lumps_generated_kg >= 0),
    hourly_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
    materials_consumed JSONB NOT NULL DEFAULT '[]'::jsonb,
    remarks TEXT,
    supervisor_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_date_shift_machine UNIQUE (report_date, shift, machine_number)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_employee_code ON public.profiles(employee_code);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON public.parts(part_number);
CREATE INDEX IF NOT EXISTS idx_part_bom_part ON public.part_bom(part_id);
CREATE INDEX IF NOT EXISTS idx_mappings_machine ON public.machine_part_mappings(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_reports_date ON public.production_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_reports_machine ON public.production_reports(machine_number);
CREATE INDEX IF NOT EXISTS idx_production_reports_status ON public.production_reports(status);
CREATE INDEX IF NOT EXISTS idx_production_reports_created_by ON public.production_reports(created_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_part_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
-- Any authenticated user can read their own profile, or admins can read all
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin());

-- Only admins can update profiles (promote to supervisor/admin, deactivate, etc.)
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 7.2 MASTER DATA & BOM POLICIES
-- All logged-in staff can read master data & BOM
CREATE POLICY "machines_select_all" ON public.machines
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "machines_admin_all" ON public.machines
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "parts_select_all" ON public.parts
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "parts_admin_all" ON public.parts
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "materials_select_all" ON public.raw_materials
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "materials_admin_all" ON public.raw_materials
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "bom_select_all" ON public.part_bom
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "bom_admin_all" ON public.part_bom
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "mappings_select_all" ON public.machine_part_mappings
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "mappings_admin_all" ON public.machine_part_mappings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "rejections_select_all" ON public.rejection_reasons
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "rejections_admin_all" ON public.rejection_reasons
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "downtime_select_all" ON public.downtime_reasons
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "downtime_admin_all" ON public.downtime_reasons
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.3 PRODUCTION REPORTS POLICIES
-- All authenticated staff can read production reports (shifts, ledger, KPI dashboard)
CREATE POLICY "reports_select_all" ON public.production_reports
    FOR SELECT TO authenticated USING (TRUE);

-- Operators and supervisors can insert new shift reports
CREATE POLICY "reports_insert_auth" ON public.production_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Operators can update only draft reports they created; supervisors/admins can update/approve any report
CREATE POLICY "reports_update_policy" ON public.production_reports
    FOR UPDATE TO authenticated
    USING (
        public.is_supervisor_or_admin()
        OR (created_by = auth.uid() AND status = 'draft')
    )
    WITH CHECK (
        public.is_supervisor_or_admin()
        OR (created_by = auth.uid() AND status IN ('draft', 'submitted'))
    );

-- Only admins can delete a report
CREATE POLICY "reports_delete_policy" ON public.production_reports
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. AUTOMATIC PROFILE CREATION TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, employee_code, role, is_active)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'employee_code', UPPER(SPLIT_PART(new.email, '@', 1))),
        COALESCE(new.raw_user_meta_data->>'role', 'operator'),
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SEED BASELINE DATA (Machines, Reasons, Resins, Initial Parts & BOM)
-- ─────────────────────────────────────────────────────────────────────────────

-- 9.1 Machines
INSERT INTO public.machines (machine_number, machine_name, make, model, capacity_ton, hourly_cost_rate, status)
VALUES
    ('MC01', 'Milacron 150T', 'Milacron', '150T', 150, 950, 'active'),
    ('MC02', 'Milacron 200T', 'Milacron', '200T', 200, 1100, 'active'),
    ('MC03', 'Milacron 450T (Pilot)', 'Milacron', '450T', 450, 1650, 'active'),
    ('MC04', 'Milacron 350T', 'Milacron', '350T', 350, 1500, 'active'),
    ('MC05', 'Milacron 250T', 'Milacron', '250T', 250, 1300, 'active'),
    ('MC06', 'Milacron 180T', 'Milacron', '180T', 180, 1150, 'active')
ON CONFLICT (machine_number) DO UPDATE SET
    machine_name = EXCLUDED.machine_name,
    capacity_ton = EXCLUDED.capacity_ton,
    updated_at = NOW();

-- 9.2 Rejection Reasons
INSERT INTO public.rejection_reasons (code, description_en, description_hi, category, is_active)
VALUES
    ('A', 'Flash / Extra Material', 'फ़्लैश (अतिरिक्त सामग्री)', 'Moulding Defect', TRUE),
    ('B', 'Short Mould / Incomplete Fill', 'शॉर्ट मोल्ड (अधूरा भरना)', 'Moulding Defect', TRUE),
    ('C', 'Sink Marks / Shrinkage', 'सिंक मार्क (सतह पर गड्ढा)', 'Cooling Defect', TRUE),
    ('D', 'Silver Streaks / Moisture Marks', 'सिल्वर स्ट्रीक्स (नमी के निशान)', 'Material Defect', TRUE),
    ('E', 'Burn Marks / Air Trap', 'बर्न मार्क्स (जलने के निशान)', 'Tooling Defect', TRUE),
    ('F', 'Flow Marks / Weld Lines', 'वेल्ड लाइन / फ्लो मार्क्स', 'Moulding Defect', TRUE),
    ('G', 'Warpage / Dimensional Distortion', 'वारपेज (मुड़ जाना)', 'Cooling Defect', TRUE),
    ('H', 'Black Spots / Contamination', 'काला धब्बा (संदूषण)', 'Material Defect', TRUE),
    ('I', 'Color Streaks / Poor Mixing', 'रंग में असमानता', 'Masterbatch Defect', TRUE),
    ('J', 'Jetting Lines', 'जेटिंग लाइनें', 'Tooling Defect', TRUE),
    ('K', 'Ejector Pin Marks / Indentations', 'इजेक्टर पिन के निशान', 'Tooling Defect', TRUE),
    ('L', 'Cracking / Crazing / Brittleness', 'क्रैकिंग / दरारें', 'Material Defect', TRUE),
    ('M', 'Bubbles / Blisters / Voids', 'बुलबुले / छाले', 'Material Defect', TRUE),
    ('N', 'Gloss Variation / Dull Spots', 'चमक में भिन्नता', 'Surface Defect', TRUE),
    ('O', 'Thread / Insert Damage', 'थ्रेड या इंसर्ट क्षति', 'Mechanical Defect', TRUE),
    ('P', 'Degating Damage / Gate Tear', 'गेट पर क्षति', 'Trimming Defect', TRUE),
    ('Q', 'Other Defect / Visual Flaw', 'अन्य दोष', 'General Defect', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 9.3 Downtime Reasons
INSERT INTO public.downtime_reasons (code, description_en, description_hi, category, is_active)
VALUES
    ('DT-401', 'Mould Change / Tool Setup', 'मोल्ड बदलाव / टूल सेटअप', 'Tooling', TRUE),
    ('DT-402', 'Material Shortage / Loading', 'सामग्री की कमी / लोडिंग', 'Operational', TRUE),
    ('DT-403', 'Mechanical Breakdown / Repair', 'मैकेनिकल खराबी', 'Maintenance', TRUE),
    ('DT-404', 'Electrical Failure / Heater Problem', 'विद्युत या हीटर खराबी', 'Maintenance', TRUE),
    ('DT-405', 'Quality Trial / Parameter Setting', 'गुणवत्ता परीक्षण / पैरामीटर सेटिंग', 'Quality', TRUE),
    ('DT-406', 'Planned Maintenance / Greasing', 'नियोजित रखरखाव / ग्रीसिंग', 'Maintenance', TRUE),
    ('DT-407', 'Power Outage / Utility Interruption', 'बिजली कटौती', 'Facility', TRUE),
    ('DT-408', 'No Operator / Manpower Shortage', 'ऑपरेटर की अनुपलब्धता', 'Operational', TRUE),
    ('DT-409', 'Other Stoppage / Waiting', 'अन्य स्टॉपेज', 'General', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 9.4 Raw Materials
INSERT INTO public.raw_materials (material_code, material_name, material_type, grade, supplier, cost_per_kg, unit, status)
VALUES
    ('MAT-PP-01', 'PP Copolymer 575P', 'Virgin Resin', 'Sabic PP 575P Injection Grade', 'SABIC India', 115.0, 'kg', 'active'),
    ('MAT-ABS-02', 'ABS Hi-Impact AF312', 'Virgin Resin', 'LG Chem AF312 Flame Retardant', 'LG Chem', 185.0, 'kg', 'active'),
    ('MAT-PA6-01', 'Nylon 6 30% GF', 'Engineering Resin', 'BASF Ultramid B3EG6 Heat Stab', 'BASF', 290.0, 'kg', 'active'),
    ('MB01', 'Black Color Masterbatch (MB01)', 'Masterbatch', 'Carbon Black MB-01 40% Loading', 'Clariant Polymers', 240.0, 'kg', 'active'),
    ('R001', 'Virgin Resin PP Natural (R001)', 'Virgin Resin', 'Injection Grade PP R001', 'Reliance Industries', 120.0, 'kg', 'active')
ON CONFLICT (material_code) DO NOTHING;

-- 9.5 Parts
INSERT INTO public.parts (part_number, part_name, customer, standard_cycle_time_seconds, cavity_count, part_weight_grams, runner_weight_grams, raw_material_grade, status)
VALUES
    ('F53200000A', 'RBC SHROUD', 'Kinetic', 20.0, 1, 879.5, 4.0, 'PP30%GF BLK (S)', 'active'),
    ('5036677', 'COVER TOP', 'FFPL', 20.0, 1, 687.0, 42.0, 'PP20%GF BLK (A)', 'active'),
    ('5012394', 'PRECLEANER', 'FFPL', 20.0, 1, 559.0, 1.0, 'PP20%GF BLK (M)', 'active')
ON CONFLICT (part_number) DO UPDATE SET
    part_name = EXCLUDED.part_name,
    customer = EXCLUDED.customer,
    standard_cycle_time_seconds = EXCLUDED.standard_cycle_time_seconds,
    part_weight_grams = EXCLUDED.part_weight_grams,
    runner_weight_grams = EXCLUDED.runner_weight_grams,
    updated_at = NOW();

-- 9.6 BOM Linkages (Parts -> Raw Materials)
DO $$
DECLARE
    v_part_id UUID;
    v_resin_id UUID;
    v_mb_id UUID;
BEGIN
    SELECT id INTO v_part_id FROM public.parts WHERE part_number = 'F53200000A';
    SELECT id INTO v_resin_id FROM public.raw_materials WHERE material_code = 'MAT-PP-01';
    SELECT id INTO v_mb_id FROM public.raw_materials WHERE material_code = 'MB01';

    IF v_part_id IS NOT NULL AND v_resin_id IS NOT NULL THEN
        INSERT INTO public.part_bom (part_id, material_id, percentage, quantity_per_shot_grams, is_active)
        VALUES (v_part_id, v_resin_id, 98.0, 865.0, TRUE)
        ON CONFLICT (part_id, material_id) DO NOTHING;
    END IF;

    IF v_part_id IS NOT NULL AND v_mb_id IS NOT NULL THEN
        INSERT INTO public.part_bom (part_id, material_id, percentage, quantity_per_shot_grams, is_active)
        VALUES (v_part_id, v_mb_id, 2.0, 18.5, TRUE)
        ON CONFLICT (part_id, material_id) DO NOTHING;
    END IF;
END $$;

-- 9.7 Machine-Part Mappings (MC03 Pilot Line)
DO $$
DECLARE
    v_mc03_id UUID;
    v_p1 UUID;
    v_p2 UUID;
    v_p3 UUID;
BEGIN
    SELECT id INTO v_mc03_id FROM public.machines WHERE machine_number = 'MC03';
    SELECT id INTO v_p1 FROM public.parts WHERE part_number = 'F53200000A';
    SELECT id INTO v_p2 FROM public.parts WHERE part_number = '5036677';
    SELECT id INTO v_p3 FROM public.parts WHERE part_number = '5012394';

    IF v_mc03_id IS NOT NULL THEN
        IF v_p1 IS NOT NULL THEN
            INSERT INTO public.machine_part_mappings (machine_id, part_id, approved_to_run)
            VALUES (v_mc03_id, v_p1, TRUE) ON CONFLICT (machine_id, part_id) DO NOTHING;
        END IF;
        IF v_p2 IS NOT NULL THEN
            INSERT INTO public.machine_part_mappings (machine_id, part_id, approved_to_run)
            VALUES (v_mc03_id, v_p2, TRUE) ON CONFLICT (machine_id, part_id) DO NOTHING;
        END IF;
        IF v_p3 IS NOT NULL THEN
            INSERT INTO public.machine_part_mappings (machine_id, part_id, approved_to_run)
            VALUES (v_mc03_id, v_p3, TRUE) ON CONFLICT (machine_id, part_id) DO NOTHING;
        END IF;
    END IF;
END $$;
