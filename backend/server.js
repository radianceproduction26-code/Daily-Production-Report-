// ==============================================================================
// RADIANCE POLYMERS - DIGITAL PRODUCTION REPORTING SYSTEM API SERVER
// High-Performance REST & Real-time Live Database Engine
// ==============================================================================
const express = require('express');
const cors = require('cors');
const { queryOne, queryAll, execute, db } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.method !== 'GET' || res.statusCode >= 400) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ─── 1. Health & Status Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  try {
    const reportCount = queryOne('SELECT COUNT(*) as count FROM shift_reports')?.count || 0;
    const partCount = queryOne('SELECT COUNT(*) as count FROM parts')?.count || 0;
    const machineCount = queryOne('SELECT COUNT(*) as count FROM machines')?.count || 0;
    res.json({
      status: 'online',
      system: 'Radiance Polymers Digital Production System',
      version: '1.0.0',
      uptime: process.uptime(),
      metrics: {
        totalShiftReports: reportCount,
        totalParts: partCount,
        totalMachines: machineCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ─── 2. Authentication & User Management ─────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { pin, email, role } = req.body;
  try {
    let user = null;
    if (pin) {
      user = queryOne('SELECT * FROM users WHERE pin_code = ? AND status = ?', [String(pin).trim(), 'active']);
    } else if (email) {
      user = queryOne('SELECT * FROM users WHERE email = ? AND status = ?', [String(email).trim().toLowerCase(), 'active']);
    }

    if (!user) {
      // Default fallback for factory pilot PIN 2026
      if (pin === '2026') {
        user = queryOne("SELECT * FROM users WHERE role = 'supervisor' LIMIT 1");
      }
    }

    if (user) {
      return res.json({ success: true, user });
    }
    return res.status(401).json({ success: false, error: 'Invalid PIN or credentials.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = queryAll('SELECT id, full_name, email, role, badge_id, status FROM users WHERE status = ?', ['active']);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. System Rules & Validation Tolerances ──────────────────────────────────
app.get('/api/rules', (req, res) => {
  try {
    const rules = queryAll('SELECT key, value, description, updated_at FROM system_rules');
    const dict = {};
    rules.forEach(r => {
      try { dict[r.key] = JSON.parse(r.value); } catch (e) { dict[r.key] = r.value; }
    });
    res.json(dict);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rules', (req, res) => {
  try {
    const updates = req.body || {};
    for (const [key, val] of Object.entries(updates)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : JSON.stringify(val);
      execute(
        `INSERT INTO system_rules (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [key, valStr]
      );
    }
    res.json({ success: true, message: 'Rules updated in live database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. Complete Metadata Catalog Bundle ──────────────────────────────────────
app.get('/api/metadata', (req, res) => {
  try {
    const machines = queryAll('SELECT * FROM machines WHERE status = ?', ['active']).map(m => ({
      ...m,
      machineNumber: m.machine_number || m.machineNumber,
      machineName: m.machine_name || m.machineName,
      capacityTon: m.capacity_ton || m.capacityTon,
      hourlyCostRate: m.hourly_cost_rate || m.hourlyCostRate
    }));
    const moulds = queryAll('SELECT * FROM moulds WHERE status = ?', ['active']);
    const parts = queryAll('SELECT * FROM parts WHERE status = ?', ['active']);
    const mappings = queryAll('SELECT * FROM machine_part_mappings WHERE status = ?', ['active']);
    const bom = queryAll('SELECT * FROM bom_materials WHERE status = ?', ['active']);
    const rejectionCodes = queryAll('SELECT * FROM rejection_codes WHERE is_active = 1');
    const downtimeCodes = queryAll('SELECT * FROM downtime_codes WHERE is_active = 1');
    const users = queryAll('SELECT id, full_name, email, role, badge_id FROM users WHERE status = ?', ['active']);

    res.json({
      machines,
      moulds,
      parts,
      mappings,
      bomMaterials: bom,
      rejectionCodes,
      downtimeCodes,
      users,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 5. Parts Master & BOM Materials ─────────────────────────────────────────
app.get('/api/parts', (req, res) => {
  try {
    const parts = queryAll('SELECT * FROM parts ORDER BY part_number ASC');
    res.json(parts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parts/bulk', (req, res) => {
  const parts = Array.isArray(req.body) ? req.body : [];
  try {
    for (const p of parts) {
      if (!p.partNumber && !p.partCode) continue;
      const partNum = p.partNumber || p.partCode;
      const partName = p.partName || 'Component';
      const cycle = Number(p.standardCycleTimeSeconds || p.plannedCycleTime || p.cycleTime || 20);
      const cavities = Number(p.cavityCount || p.cavities || 2);
      const partWt = Number(p.partWeightGrams || p.partWeight || 42.5);
      const runnerWt = Number(p.runnerWeightGrams || p.runnerWeight || 7.0);
      const customer = p.customer || 'Maruti Suzuki';
      const grade = p.rawMaterialGrade || p.materialGrade || 'PPCP';
      const id = p.id || `part-${partNum}`;

      execute(
        `INSERT INTO parts (id, part_number, part_name, customer, standard_cycle_time_seconds, cavity_count, part_weight_grams, runner_weight_grams, raw_material_grade, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
         ON CONFLICT(part_number) DO UPDATE SET
            part_name = excluded.part_name,
            customer = excluded.customer,
            standard_cycle_time_seconds = excluded.standard_cycle_time_seconds,
            cavity_count = excluded.cavity_count,
            part_weight_grams = excluded.part_weight_grams,
            runner_weight_grams = excluded.runner_weight_grams,
            raw_material_grade = excluded.raw_material_grade,
            updated_at = datetime('now')`,
        [id, partNum, partName, customer, cycle, cavities, partWt, runnerWt, grade]
      );
    }
    res.json({ success: true, count: parts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bom', (req, res) => {
  try {
    const bom = queryAll('SELECT * FROM bom_materials ORDER BY material_code ASC');
    res.json(bom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 6. Shift Reports & Production Entries ───────────────────────────────────
app.get('/api/reports', (req, res) => {
  const { machine, status, date } = req.query;
  try {
    let sql = 'SELECT id, report_date, shift, machine_number, machine_name, operator_name, supervisor_name, status, lumps_generated_kg, supervisor_notes, submitted_at, approved_at, created_at, updated_at, full_data FROM shift_reports WHERE 1=1';
    const params = [];
    if (machine) {
      sql += ' AND machine_number = ?';
      params.push(machine);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (date) {
      sql += ' AND report_date = ?';
      params.push(date);
    }
    sql += ' ORDER BY report_date DESC, created_at DESC';

    const rows = queryAll(sql, params);
    const reports = rows.map(r => {
      try {
        const full = JSON.parse(r.full_data);
        return {
          ...full,
          id: r.id,
          reportDate: r.report_date,
          shift: r.shift,
          machineNumber: r.machine_number,
          machineName: r.machine_name,
          operatorName: r.operator_name,
          supervisorName: r.supervisor_name,
          status: r.status,
          lumpsGeneratedKg: r.lumps_generated_kg,
          supervisorNotes: r.supervisor_notes,
          submittedAt: r.submitted_at,
          approvedAt: r.approved_at
        };
      } catch (e) {
        return r;
      }
    });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:id', (req, res) => {
  try {
    const r = queryOne('SELECT * FROM shift_reports WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Shift report not found' });
    let full = {};
    try { full = JSON.parse(r.full_data); } catch (e) {}
    res.json({
      ...full,
      id: r.id,
      reportDate: r.report_date,
      shift: r.shift,
      machineNumber: r.machine_number,
      machineName: r.machine_name,
      operatorName: r.operator_name,
      supervisorName: r.supervisor_name,
      status: r.status,
      lumpsGeneratedKg: r.lumps_generated_kg,
      supervisorNotes: r.supervisor_notes,
      submittedAt: r.submitted_at,
      approvedAt: r.approved_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or Upsert Shift Report
app.post('/api/reports', (req, res) => {
  const report = req.body;
  if (!report || !report.id) {
    return res.status(400).json({ error: 'Invalid report payload' });
  }

  try {
    const repId = String(report.id);
    const date = report.reportDate || new Date().toISOString().split('T')[0];
    const shift = report.shift || 'Shift A';
    const mc = report.machineNumber || 'MC03';
    const mcName = report.machineName || 'Milacron 450T';
    const op = report.operatorName || report.operator_name || 'Operator';
    const sup = report.supervisorName || report.supervisor || null;
    const status = report.status || 'draft';
    const lumps = Number(report.lumpsGeneratedKg) || 0.0;
    const notes = report.supervisorNotes || '';
    const subAt = report.submittedAt || null;
    const appAt = report.approvedAt || null;
    const fullJson = JSON.stringify(report);

    execute(
      `INSERT INTO shift_reports (id, report_date, shift, machine_number, machine_name, operator_name, supervisor_name, status, lumps_generated_kg, supervisor_notes, submitted_at, approved_at, full_data, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
          report_date = excluded.report_date,
          shift = excluded.shift,
          machine_number = excluded.machine_number,
          machine_name = excluded.machine_name,
          operator_name = excluded.operator_name,
          supervisor_name = excluded.supervisor_name,
          status = excluded.status,
          lumps_generated_kg = excluded.lumps_generated_kg,
          supervisor_notes = excluded.supervisor_notes,
          submitted_at = excluded.submitted_at,
          approved_at = excluded.approved_at,
          full_data = excluded.full_data,
          updated_at = datetime('now')`,
      [repId, date, shift, mc, mcName, op, sup, status, lumps, notes, subAt, appAt, fullJson]
    );

    // Sync individual hourly entries with lumps_kg
    const sessions = report.mouldSessions || report.sessions || [];
    sessions.forEach(sess => {
      (sess.entries || []).forEach(e => {
        if (!e.hourIndex) return;
        const entryId = e.id || `entry-${repId}-${sess.id}-${e.hourIndex}`;
        const entryLumps = Number(e.lumpsKg) || Number(e.lumpsGeneratedKg) || 0.0;
        execute(
          `INSERT INTO hourly_entries (id, report_id, session_id, hour_index, hour_interval, theoretical_target, production_qty, rejection_qty, accepted_qty, downtime_minutes, lumps_kg, primary_rejection_code, primary_downtime_code, remarks, rejection_breakdown, downtime_breakdown, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
              theoretical_target = excluded.theoretical_target,
              production_qty = excluded.production_qty,
              rejection_qty = excluded.rejection_qty,
              accepted_qty = excluded.accepted_qty,
              downtime_minutes = excluded.downtime_minutes,
              lumps_kg = excluded.lumps_kg,
              primary_rejection_code = excluded.primary_rejection_code,
              primary_downtime_code = excluded.primary_downtime_code,
              remarks = excluded.remarks,
              rejection_breakdown = excluded.rejection_breakdown,
              downtime_breakdown = excluded.downtime_breakdown,
              updated_at = datetime('now')`,
          [
            entryId,
            repId,
            sess.id,
            e.hourIndex,
            e.hourInterval || `Hour ${e.hourIndex}`,
            Number(e.theoreticalTarget) || 0,
            Number(e.productionQty) || 0,
            Number(e.rejectionQty) || 0,
            Number(e.acceptedQty) || 0,
            Number(e.downtimeMinutes) || 0,
            entryLumps,
            e.primaryRejectionCode || null,
            e.primaryDowntimeCode || null,
            e.remarks || '',
            JSON.stringify(e.rejectionBreakdown || []),
            JSON.stringify(e.downtimeBreakdown || [])
          ]
        );
      });
    });

    res.json({ success: true, id: repId, lumpsGeneratedKg: lumps });
  } catch (err) {
    console.error('[API] Error saving report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit Report
app.post('/api/reports/:id/submit', (req, res) => {
  const { id } = req.params;
  const { lumpsGeneratedKg, supervisorName, supervisorNotes } = req.body;
  try {
    const existing = queryOne('SELECT full_data FROM shift_reports WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    let full = JSON.parse(existing.full_data);
    const finalLumps = lumpsGeneratedKg !== undefined ? Number(lumpsGeneratedKg) : (full.lumpsGeneratedKg || 0);

    full.status = 'submitted';
    full.submittedAt = new Date().toISOString();
    full.lumpsGeneratedKg = finalLumps;
    if (supervisorName) full.supervisorName = supervisorName;
    if (supervisorNotes !== undefined) full.supervisorNotes = supervisorNotes;

    execute(
      `UPDATE shift_reports SET status = 'submitted', lumps_generated_kg = ?, supervisor_name = ?, supervisor_notes = ?, submitted_at = datetime('now'), full_data = ?, updated_at = datetime('now') WHERE id = ?`,
      [finalLumps, full.supervisorName || 'Mr. Lokesh', full.supervisorNotes || '', JSON.stringify(full), id]
    );

    res.json({ success: true, status: 'submitted', lumpsGeneratedKg: finalLumps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve Report
app.post('/api/reports/:id/approve', (req, res) => {
  const { id } = req.params;
  const { notes, supervisorName, lumpsGeneratedKg } = req.body;
  try {
    const existing = queryOne('SELECT full_data FROM shift_reports WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    let full = JSON.parse(existing.full_data);
    const finalLumps = lumpsGeneratedKg !== undefined ? Number(lumpsGeneratedKg) : (full.lumpsGeneratedKg || 0);

    full.status = 'approved';
    full.approvedAt = new Date().toISOString();
    full.supervisorName = supervisorName || full.supervisorName || 'Mr. Lokesh';
    full.supervisorNotes = notes || full.supervisorNotes || '';
    full.lumpsGeneratedKg = finalLumps;

    execute(
      `UPDATE shift_reports SET status = 'approved', lumps_generated_kg = ?, supervisor_name = ?, supervisor_notes = ?, approved_at = datetime('now'), full_data = ?, updated_at = datetime('now') WHERE id = ?`,
      [finalLumps, full.supervisorName, full.supervisorNotes, JSON.stringify(full), id]
    );

    res.json({ success: true, status: 'approved', lumpsGeneratedKg: finalLumps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Report
app.delete('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  try {
    execute('DELETE FROM hourly_entries WHERE report_id = ?', [id]);
    execute('DELETE FROM shift_reports WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 7. Audit Trail API ──────────────────────────────────────────────────────
app.get('/api/audit-logs', (req, res) => {
  try {
    const logs = queryAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
    const parsed = logs.map(l => ({
      ...l,
      user: { id: l.user_id, fullName: l.user_name, role: l.user_role },
      oldValue: l.old_value ? JSON.parse(l.old_value) : null,
      newValue: l.new_value ? JSON.parse(l.new_value) : null
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs', (req, res) => {
  const entry = req.body;
  if (!entry || !entry.action) return res.status(400).json({ error: 'Invalid audit payload' });

  try {
    const id = entry.id || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = entry.timestamp || new Date().toISOString();
    const userId = entry.user?.id || 'sys';
    const userName = entry.user?.fullName || entry.user?.name || 'System';
    const userRole = entry.user?.role || 'operator';
    const action = entry.action;
    const table = entry.tableName || 'system';
    const recId = entry.recordId || null;
    const oldVal = entry.oldValue ? JSON.stringify(entry.oldValue) : null;
    const newVal = entry.newValue ? JSON.stringify(entry.newValue) : null;
    const reason = entry.reason || 'Routine operation';

    execute(
      `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, table_name, record_id, old_value, new_value, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, timestamp, userId, userName, userRole, action, table, recId, oldVal, newVal, reason]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`🚀 Radiance Polymers Live Production API Server is running!`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`💾 Live Database: SQLite WAL mode (node:sqlite)`);
  console.log(`================================================================`);
});
