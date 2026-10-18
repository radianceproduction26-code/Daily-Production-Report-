-- ==============================================================================
-- RADIANCE POLYMERS - LIVE PRODUCTION REPORTING DATABASE SCHEMA
-- Compatible with SQLite 3 (node:sqlite) and PostgreSQL / Supabase
-- ==============================================================================

-- 1. Authentication & Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'operator', -- operator, supervisor, production_manager, admin
    pin_code TEXT DEFAULT '2026',
    badge_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. System Rules & Validation Tolerances
CREATE TABLE IF NOT EXISTS system_rules (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON formatted value
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Machines Fleet Master (MC01..MC14)
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    machine_number TEXT UNIQUE NOT NULL,
    machine_name TEXT NOT NULL,
    make TEXT,
    model TEXT,
    capacity_ton REAL DEFAULT 450,
    tonnage REAL DEFAULT 450,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Moulds / Tooling Catalog
CREATE TABLE IF NOT EXISTS moulds (
    id TEXT PRIMARY KEY,
    mould_number TEXT UNIQUE NOT NULL,
    mould_name TEXT NOT NULL,
    cavity_count INTEGER NOT NULL DEFAULT 2,
    clamping_ton_required REAL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Parts Master
CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    part_number TEXT UNIQUE NOT NULL,
    part_name TEXT NOT NULL,
    customer TEXT,
    standard_cycle_time_seconds REAL NOT NULL DEFAULT 20.0,
    cavity_count INTEGER NOT NULL DEFAULT 2,
    part_weight_grams REAL NOT NULL DEFAULT 42.5,
    runner_weight_grams REAL NOT NULL DEFAULT 7.0,
    raw_material_grade TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Machine-to-Part Mappings
CREATE TABLE IF NOT EXISTS machine_part_mappings (
    id TEXT PRIMARY KEY,
    machine_number TEXT NOT NULL,
    part_number TEXT NOT NULL,
    mould_number TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. BOM (Bill of Materials) & Raw Polymers Master
CREATE TABLE IF NOT EXISTS bom_materials (
    id TEXT PRIMARY KEY,
    material_code TEXT UNIQUE NOT NULL,
    material_name TEXT NOT NULL,
    material_type TEXT NOT NULL DEFAULT 'Virgin Resin', -- Virgin Resin, Masterbatch, Engineering Resin, Purge
    grade TEXT,
    supplier TEXT,
    standard_price_per_kg REAL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Rejection Defect Codes (A through Q)
CREATE TABLE IF NOT EXISTS rejection_codes (
    code TEXT PRIMARY KEY,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    category TEXT DEFAULT 'Quality Defect',
    is_active INTEGER NOT NULL DEFAULT 1
);

-- 9. Downtime Stoppage Codes (DT-401 through DT-409)
CREATE TABLE IF NOT EXISTS downtime_codes (
    code TEXT PRIMARY KEY,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Operational',
    is_active INTEGER NOT NULL DEFAULT 1
);

-- 10. Production Shift Reports (with Lumps Generated kg)
CREATE TABLE IF NOT EXISTS shift_reports (
    id TEXT PRIMARY KEY,
    report_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    machine_number TEXT NOT NULL,
    machine_name TEXT,
    operator_name TEXT NOT NULL,
    supervisor_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, unlocked
    lumps_generated_kg REAL NOT NULL DEFAULT 0.0,
    supervisor_notes TEXT,
    submitted_at TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    full_data TEXT NOT NULL -- Complete raw report JSON snapshot
);

-- 11. Hourly Production Entries (includes Lumps kg per hour!)
CREATE TABLE IF NOT EXISTS hourly_entries (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    session_id TEXT,
    hour_index INTEGER NOT NULL,
    hour_interval TEXT NOT NULL,
    theoretical_target INTEGER NOT NULL DEFAULT 0,
    production_qty INTEGER NOT NULL DEFAULT 0,
    rejection_qty INTEGER NOT NULL DEFAULT 0,
    accepted_qty INTEGER NOT NULL DEFAULT 0,
    downtime_minutes INTEGER NOT NULL DEFAULT 0,
    lumps_kg REAL NOT NULL DEFAULT 0.0, -- Lumps generated at this production hour
    primary_rejection_code TEXT,
    primary_downtime_code TEXT,
    remarks TEXT,
    rejection_breakdown TEXT, -- JSON
    downtime_breakdown TEXT,  -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Audit Trail Logs (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_value TEXT, -- JSON
    new_value TEXT, -- JSON
    reason TEXT
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_shift_reports_date ON shift_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_shift_reports_machine ON shift_reports(machine_number);
CREATE INDEX IF NOT EXISTS idx_shift_reports_status ON shift_reports(status);
CREATE INDEX IF NOT EXISTS idx_hourly_entries_report ON hourly_entries(report_id, hour_index);
CREATE INDEX IF NOT EXISTS idx_mappings_machine ON machine_part_mappings(machine_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(timestamp DESC);
