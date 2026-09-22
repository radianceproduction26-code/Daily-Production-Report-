-- ============================================================================
-- Radiance Polymers - Digital Production Reporting System Version 1.0
-- Database Migration Script: Machine Numbering Standardization (MC01 - MC99)
-- Migration Date: 2026-09-16
-- Description: Standardizes machine codes to strict industrial standard 'MC' + 2 Digits.
--              Migrates historical references with zero data loss and cascaded integrity.
-- ============================================================================

BEGIN;

-- 1. Temporarily defer foreign key constraints if applicable or perform cascaded update
-- Notice: We perform atomic in-place updates matching existing legacy keys (e.g. 'm-imm-01' -> 'm-mc-01')

-- 2. Create helper temporary mapping table for safe foreign key remapping
CREATE TEMP TABLE temp_machine_migration_map (
    old_id VARCHAR(50) PRIMARY KEY,
    new_id VARCHAR(50) NOT NULL,
    old_number VARCHAR(20) NOT NULL,
    new_number VARCHAR(20) NOT NULL,
    machine_name VARCHAR(100) NOT NULL,
    make_model VARCHAR(100) NOT NULL,
    tonnage NUMERIC NOT NULL,
    rated_kwh NUMERIC NOT NULL
) ON COMMIT DROP;

INSERT INTO temp_machine_migration_map (old_id, new_id, old_number, new_number, machine_name, make_model, tonnage, rated_kwh) VALUES
('m-imm-01', 'm-mc-01', 'IMM-01', 'MC01', 'Engel Victory 150T', 'Engel Victory 330/150', 150, 32.5),
('m-imm-02', 'm-mc-02', 'IMM-02', 'MC02', 'Toshiba IS 200T', 'Toshiba IS-200GS', 200, 40.0),
('m-imm-03', 'm-mc-03', 'IMM-03', 'MC03', 'KraussMaffei 250T', 'KraussMaffei CX 250-1000', 250, 48.0),
('m-imm-04', 'm-mc-04', 'IMM-04', 'MC04', 'L&T Demag 350T', 'L&T Demag Ergotech 350', 350, 65.0),
('m-imm-05', 'm-mc-05', 'IMM-05', 'MC05', 'Haitian Mars 450T', 'Haitian MA4500II/2250', 450, 82.0),
('m-imm-06', 'm-mc-06', 'IMM-06', 'MC06', 'Milacron Magna 650T', 'Milacron Magna T-650', 650, 115.0);

-- 3. Update Audit Logs referring to legacy machine identifiers
UPDATE audit_logs
SET entity_id = m.new_id
FROM temp_machine_migration_map m
WHERE audit_logs.entity_type = 'machine' AND audit_logs.entity_id = m.old_id;

UPDATE audit_logs
SET new_values = jsonb_set(new_values, '{machine_number}', to_jsonb(m.new_number::text))
FROM temp_machine_migration_map m
WHERE (new_values->>'machine_number') = m.old_number;

UPDATE audit_logs
SET old_values = jsonb_set(old_values, '{machine_number}', to_jsonb(m.new_number::text))
FROM temp_machine_migration_map m
WHERE (old_values->>'machine_number') = m.old_number;

-- 4. Update Shift Reports & Production Sessions
-- First insert or prepare new machine records if foreign key checks are strict
-- We alter constraints to ON UPDATE CASCADE if not already set, or update child references
ALTER TABLE production_sessions DROP CONSTRAINT IF EXISTS fk_production_sessions_machine;
ALTER TABLE shift_reports DROP CONSTRAINT IF EXISTS fk_shift_reports_machine;

-- Update machines table IDs and Numbers
UPDATE machines
SET 
    id = m.new_id,
    machine_number = m.new_number,
    qr_code_hash = 'QR-' || m.new_number || '-' || UPPER(SUBSTRING(m.make_model FROM 1 FOR 4)),
    iot_device_id = 'IOT-ESP32-' || m.new_number,
    updated_at = NOW()
FROM temp_machine_migration_map m
WHERE machines.id = m.old_id OR machines.machine_number = m.old_number;

-- Update child references in production_sessions
UPDATE production_sessions
SET 
    machine_id = m.new_id
FROM temp_machine_migration_map m
WHERE production_sessions.machine_id = m.old_id;

-- Update child references in shift_reports
UPDATE shift_reports
SET 
    machine_id = m.new_id,
    machine_number = m.new_number
FROM temp_machine_migration_map m
WHERE shift_reports.machine_id = m.old_id OR shift_reports.machine_number = m.old_number;

-- 5. Seed full plant Injection Moulding fleet MC01 to MC14
INSERT INTO machines (id, machine_number, machine_name, make_model, capacity_ton, clamping_stroke_mm, hourly_cost_rate, rated_kwh, qr_code_hash, iot_device_id, status)
VALUES
('m-mc-01', 'MC01', 'Engel Victory 150T', 'Engel Victory 330/150', 150, 450, 850.00, 32.5, 'QR-MC01-ENGE', 'IOT-ESP32-MC01', 'active'),
('m-mc-02', 'MC02', 'Toshiba IS 200T', 'Toshiba IS-200GS', 200, 520, 950.00, 40.0, 'QR-MC02-TOSH', 'IOT-ESP32-MC02', 'active'),
('m-mc-03', 'MC03', 'KraussMaffei 250T', 'KraussMaffei CX 250-1000', 250, 600, 1100.00, 48.0, 'QR-MC03-KRAU', 'IOT-ESP32-MC03', 'active'),
('m-mc-04', 'MC04', 'L&T Demag 350T', 'L&T Demag Ergotech 350', 350, 720, 1450.00, 65.0, 'QR-MC04-LTDE', 'IOT-ESP32-MC04', 'active'),
('m-mc-05', 'MC05', 'Haitian Mars 450T', 'Haitian MA4500II/2250', 450, 800, 1750.00, 82.0, 'QR-MC05-HAIT', 'IOT-ESP32-MC05', 'active'),
('m-mc-06', 'MC06', 'Milacron Magna 650T', 'Milacron Magna T-650', 650, 950, 2300.00, 115.0, 'QR-MC06-MILA', 'IOT-ESP32-MC06', 'active'),
('m-mc-07', 'MC07', 'Sumitomo Demag 180T', 'Sumitomo SE180EV-A', 180, 480, 900.00, 35.0, 'QR-MC07-SUMI', 'IOT-ESP32-MC07', 'active'),
('m-mc-08', 'MC08', 'Toshiba IS 250T', 'Toshiba IS-250GS', 250, 600, 1150.00, 50.0, 'QR-MC08-TOSH', 'IOT-ESP32-MC08', 'active'),
('m-mc-09', 'MC09', 'Engel Victory 280T', 'Engel Victory 500/280', 280, 650, 1250.00, 55.0, 'QR-MC09-ENGE', 'IOT-ESP32-MC09', 'active'),
('m-mc-10', 'MC10', 'Haitian Mars 320T', 'Haitian MA3200II/1350', 320, 700, 1350.00, 60.0, 'QR-MC10-HAIT', 'IOT-ESP32-MC10', 'active'),
('m-mc-11', 'MC11', 'L&T Demag 400T', 'L&T Demag Ergotech 400', 400, 750, 1600.00, 72.0, 'QR-MC11-LTDE', 'IOT-ESP32-MC11', 'active'),
('m-mc-12', 'MC12', 'KraussMaffei 500T', 'KraussMaffei CX 500-3000', 500, 850, 1950.00, 95.0, 'QR-MC12-KRAU', 'IOT-ESP32-MC12', 'active'),
('m-mc-13', 'MC13', 'Milacron Magna 550T', 'Milacron Magna T-550', 550, 900, 2100.00, 105.0, 'QR-MC13-MILA', 'IOT-ESP32-MC13', 'active'),
('m-mc-14', 'MC14', 'Haitian Jupiter 850T', 'Haitian JU8500II/4300', 850, 1100, 2800.00, 140.0, 'QR-MC14-HAIT', 'IOT-ESP32-MC14', 'active')
ON CONFLICT (id) DO UPDATE SET
    machine_number = EXCLUDED.machine_number,
    machine_name = EXCLUDED.machine_name,
    make_model = EXCLUDED.make_model,
    capacity_ton = EXCLUDED.capacity_ton,
    clamping_stroke_mm = EXCLUDED.clamping_stroke_mm,
    hourly_cost_rate = EXCLUDED.hourly_cost_rate,
    rated_kwh = EXCLUDED.rated_kwh,
    qr_code_hash = EXCLUDED.qr_code_hash,
    iot_device_id = EXCLUDED.iot_device_id,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 6. Add Strict Machine Code Pattern Check Constraint
ALTER TABLE machines DROP CONSTRAINT IF EXISTS chk_machine_number_format;
ALTER TABLE machines ADD CONSTRAINT chk_machine_number_format 
    CHECK (machine_number ~ '^MC[0-9]{2}$');

-- Re-establish foreign keys with ON UPDATE CASCADE
ALTER TABLE production_sessions 
    ADD CONSTRAINT fk_production_sessions_machine 
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE shift_reports 
    ADD CONSTRAINT fk_shift_reports_machine 
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 7. Add Plant Range Reservation Comments
COMMENT ON TABLE machines IS 'Master machine fleet. Reserved ranges: MC01-MC14 (Injection Moulding Active), MC15-MC20 (Future Injection), MC21-MC30 (Assembly), MC31-MC40 (Utilities). Format: MC + 2 Digits.';

-- Record migration in system schema log
INSERT INTO audit_logs (id, entity_type, entity_id, action, old_values, new_values, performed_by, notes)
VALUES (
    'audit-mig-mc-' || EXTRACT(EPOCH FROM NOW())::bigint,
    'system_schema',
    'machines',
    'SCHEMA_MIGRATION',
    '{"convention": "IMM-xx", "active_machines": 6}'::jsonb,
    '{"convention": "MCxx", "pattern": "^MC[0-9]{2}$", "active_machines": 14, "ranges": {"injection": "MC01-MC14", "future_injection": "MC15-MC20", "assembly": "MC21-MC30", "utilities": "MC31-MC40"}}'::jsonb,
    'system_administrator',
    'Machine Numbering Standardization Migration executed successfully.'
);

COMMIT;
