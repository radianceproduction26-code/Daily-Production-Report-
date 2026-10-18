// ==============================================================================
// RADIANCE POLYMERS - PRODUCTION REPORTS SERVICE
// Direct Supabase data-access for Shift Reports, 12-Hour Breakdown & Offline Resilience
// ==============================================================================
import { supabase, isSupabaseConfigured, formatDatabaseError } from '../lib/supabaseClient';

const OFFLINE_DRAFTS_KEY = 'rp_offline_report_drafts_v1';
let _isSubmitting = false;

/**
 * Normalizes database report row into application format
 */
function normalizeReport(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    reportDate: row.report_date,
    date: row.report_date,
    shift: row.shift,
    machineNumber: row.machine_number,
    machineName: row.machine_name,
    machine: {
      machineNumber: row.machine_number,
      machineName: row.machine_name
    },
    partNumber: row.part_number,
    partName: row.part_name,
    operatorName: row.operator_name,
    operatorCode: row.operator_code,
    operator: {
      name: row.operator_name,
      fullName: row.operator_name,
      employeeCode: row.operator_code
    },
    supervisorName: row.supervisor_name,
    producedQty: Number(row.produced_qty) || 0,
    acceptedQty: Number(row.accepted_qty) || 0,
    rejectionQty: Number(row.rejection_qty) || 0,
    downtimeMinutes: Number(row.downtime_minutes) || 0,
    lumpsGeneratedKg: Number(row.lumps_generated_kg) || 0,
    hourlyEntries: Array.isArray(row.hourly_entries) ? row.hourly_entries : [],
    materialsConsumed: Array.isArray(row.materials_consumed) ? row.materials_consumed : [],
    remarks: row.remarks || '',
    supervisorNotes: row.supervisor_notes || '',
    status: row.status || 'draft',
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 1. Fetch production reports with optional filtering (Date, Machine, Shift, Status)
 */
export async function getProductionReports(filters = {}) {
  if (!isSupabaseConfigured || !supabase) {
    // Fall back to offline drafts if cloud not yet connected
    const local = getOfflineDrafts();
    return { success: true, data: local, isOffline: true };
  }

  try {
    let query = supabase
      .from('production_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.date) {
      query = query.eq('report_date', filters.date);
    }
    if (filters.machineNumber && filters.machineNumber !== 'ALL') {
      query = query.eq('machine_number', filters.machineNumber);
    }
    if (filters.shift && filters.shift !== 'ALL') {
      query = query.eq('shift', filters.shift);
    }
    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error, 'Failed to load reports.') };
    }

    const normalized = (data || []).map(normalizeReport);
    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err, 'Network error loading reports.') };
  }
}

/**
 * 2. Fetch a single report by ID
 */
export async function getProductionReportById(id) {
  if (!isSupabaseConfigured || !supabase || !id) {
    return { success: false, data: null, error: 'Report ID required.' };
  }

  try {
    const { data, error } = await supabase
      .from('production_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { success: false, error: formatDatabaseError(error), data: null };
    if (!data) return { success: false, error: 'Report not found.', data: null };

    return { success: true, data: normalizeReport(data) };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err), data: null };
  }
}

/**
 * 3. Save / Submit a new Production Report (with Double-Tap Lock & Offline Draft Fallback)
 */
export async function submitProductionReport(reportData) {
  // Prevent double-tap race conditions on shop-floor tablets
  if (_isSubmitting) {
    return { success: false, error: 'Submission in progress. Please wait a moment.' };
  }

  _isSubmitting = true;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    // Calculate aggregated totals from hourly entries if not provided
    const hourly = Array.isArray(reportData.hourlyEntries) ? reportData.hourlyEntries : [];
    let calcProduced = 0;
    let calcAccepted = 0;
    let calcRejections = 0;
    let calcDowntime = 0;
    let calcLumps = Number(reportData.lumpsGeneratedKg) || 0;

    hourly.forEach(h => {
      calcProduced += Number(h.productionQty || h.produced || 0);
      calcAccepted += Number(h.acceptedQty || h.accepted || 0);
      calcRejections += Number(h.rejectionQty || h.rejects || 0);
      calcDowntime += Number(h.downtimeMinutes || h.downtime || 0);
      calcLumps += Number(h.lumpsKg || 0);
    });

    const payload = {
      report_date: reportData.reportDate || reportData.date || new Date().toISOString().split('T')[0],
      shift: reportData.shift || 'Shift A',
      machine_number: reportData.machineNumber || reportData.machine?.machineNumber || 'MC03',
      machine_name: reportData.machineName || reportData.machine?.machineName || '',
      part_number: reportData.partNumber || reportData.part?.partNumber || reportData.partCode || '',
      part_name: reportData.partName || reportData.part?.partName || '',
      operator_id: reportData.operatorId || userId,
      operator_code: reportData.operatorCode || reportData.operator?.employeeCode || '',
      operator_name: reportData.operatorName || reportData.operator?.fullName || reportData.operator?.name || 'Operator',
      supervisor_name: reportData.supervisorName || '',
      produced_qty: Number(reportData.producedQty) || calcProduced,
      accepted_qty: Number(reportData.acceptedQty) || calcAccepted,
      rejection_qty: Number(reportData.rejectionQty) || calcRejections,
      downtime_minutes: Number(reportData.downtimeMinutes) || calcDowntime,
      lumps_generated_kg: Number(reportData.lumpsGeneratedKg) || calcLumps,
      hourly_entries: hourly,
      materials_consumed: Array.isArray(reportData.materialsConsumed) ? reportData.materialsConsumed : [],
      remarks: reportData.remarks || '',
      supervisor_notes: reportData.supervisorNotes || '',
      status: reportData.status || 'submitted',
      submitted_at: reportData.status === 'submitted' ? new Date().toISOString() : null,
      created_by: userId
    };

    if (reportData.id) {
      payload.id = reportData.id;
    }

    const { data, error } = await supabase
      .from('production_reports')
      .upsert(payload, { onConflict: 'report_date, shift, machine_number' })
      .select()
      .single();

    if (error) {
      // If network fails, stash in offline drafts so data is safe
      saveOfflineDraft(payload);
      return {
        success: false,
        error: formatDatabaseError(error, 'Submission failed.'),
        savedLocally: true
      };
    }

    return { success: true, data: normalizeReport(data) };
  } catch (err) {
    saveOfflineDraft(reportData);
    return {
      success: false,
      error: formatDatabaseError(err, 'Connection failed. Report stored safely on device.'),
      savedLocally: true
    };
  } finally {
    _isSubmitting = false;
  }
}

/**
 * 4. Supervisor Approval Workflow
 */
export async function approveProductionReport(id, { supervisorName, supervisorNotes = '' }) {
  if (!supabase || !id) return { success: false, error: 'Report ID required.' };

  try {
    const { data, error } = await supabase
      .from('production_reports')
      .update({
        status: 'approved',
        supervisor_name: supervisorName,
        supervisor_notes: supervisorNotes,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true, data: normalizeReport(data) };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

/**
 * 5. Delete a production report (Admin only)
 */
export async function deleteProductionReport(id) {
  if (!supabase || !id) return { success: false, error: 'Report ID required.' };

  try {
    const { error } = await supabase
      .from('production_reports')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

// ─── OFFLINE DRAFT HELPERS ───────────────────────────────────────────────────

export function getOfflineDrafts() {
  try {
    const raw = localStorage.getItem(OFFLINE_DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveOfflineDraft(report) {
  try {
    const existing = getOfflineDrafts();
    const filtered = existing.filter(
      r => !(r.report_date === report.report_date && r.shift === report.shift && r.machine_number === report.machine_number)
    );
    filtered.unshift(report);
    localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to stash offline draft:', e);
  }
}
