import { getSupabaseClient, getSupabaseConfig, getShiftReports, saveShiftReports } from './storageService.js';

const WEBHOOK_STORAGE_KEY = 'rp_mastersheet_webhook_url_v1';

/**
 * Extracts comprehensive KPIs and metadata from a shift report object
 */
export function summarizeReportForMasterSync(report) {
  if (!report) return null;

  const sessions = report.mouldSessions || report.sessions || [];
  let totalTarget = 0;
  let totalProd = 0;
  let totalAcc = 0;
  let totalRej = 0;
  let totalDt = 0;
  let primaryPartNumber = report.partNumber || '';
  let primaryPartName = report.partName || '';

  sessions.forEach(sess => {
    if (!primaryPartNumber && (sess.partNumber || sess.partCode)) {
      primaryPartNumber = sess.partNumber || sess.partCode;
      primaryPartName = sess.partName || '';
    }
    (sess.entries || []).forEach(e => {
      totalTarget += Number(e.theoreticalTarget) || 0;
      totalProd += Number(e.productionQty) || 0;
      totalAcc += Number(e.acceptedQty) || 0;
      totalRej += Number(e.rejectionQty) || 0;
      totalDt += Number(e.downtimeMinutes) || 0;
    });
  });

  // Fallback if entries were at report level
  if (sessions.length === 0 && Array.isArray(report.entries)) {
    report.entries.forEach(e => {
      totalTarget += Number(e.theoreticalTarget) || 0;
      totalProd += Number(e.productionQty) || 0;
      totalAcc += Number(e.acceptedQty) || 0;
      totalRej += Number(e.rejectionQty) || 0;
      totalDt += Number(e.downtimeMinutes) || 0;
    });
  }

  const rejectionRate = totalProd > 0 ? Number(((totalRej / totalProd) * 100).toFixed(2)) : 0.00;
  const efficiency = totalTarget > 0 ? Number(((totalProd / totalTarget) * 100).toFixed(2)) : 0.00;

  return {
    id: String(report.id || `rep-${Date.now()}`),
    report_date: report.reportDate || new Date().toISOString().split('T')[0],
    shift: report.shift || 'Shift 1',
    machine_number: report.machineNumber || 'MC03',
    machine_name: report.machineName || 'Milacron 450T',
    operator_name: report.operatorName || report.operator_name || 'Operator',
    supervisor_name: report.supervisorName || report.supervisor || 'Pending Review',
    part_number: primaryPartNumber || 'P-TOOL-01',
    part_name: primaryPartName || 'Production Component',
    target_qty: totalTarget,
    production_qty: totalProd,
    accepted_qty: totalAcc,
    rejection_qty: totalRej,
    rejection_rate: rejectionRate,
    downtime_minutes: totalDt,
    efficiency_percent: efficiency,
    status: report.status || 'draft',
    submitted_at: report.submittedAt || (report.status === 'submitted' ? new Date().toISOString() : null),
    approved_at: report.approvedAt || null,
    updated_at: new Date().toISOString(),
    full_data: report
  };
}

/**
 * Gets configured Google Sheets / external Webhook URL
 */
export function getMasterSheetWebhookUrl() {
  try {
    return localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Saves Google Sheets / external Webhook URL
 */
export function saveMasterSheetWebhookUrl(url) {
  try {
    if (!url) {
      localStorage.removeItem(WEBHOOK_STORAGE_KEY);
    } else {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, url.trim());
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sends report row to external Google Sheet / Webhook endpoint
 */
export async function triggerMasterSheetWebhook(syncRow) {
  const webhookUrl = getMasterSheetWebhookUrl();
  if (!webhookUrl) return { sent: false, reason: 'No webhook URL configured' };

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      reportId: syncRow.id,
      date: syncRow.report_date,
      shift: syncRow.shift,
      machineNumber: syncRow.machine_number,
      machineName: syncRow.machine_name,
      operatorName: syncRow.operator_name,
      supervisorName: syncRow.supervisor_name,
      partNumber: syncRow.part_number,
      partName: syncRow.part_name,
      targetQty: syncRow.target_qty,
      productionQty: syncRow.production_qty,
      acceptedQty: syncRow.accepted_qty,
      rejectionQty: syncRow.rejection_qty,
      rejectionRatePercent: syncRow.rejection_rate,
      downtimeMinutes: syncRow.downtime_minutes,
      efficiencyPercent: syncRow.efficiency_percent,
      status: syncRow.status,
      submittedAt: syncRow.submitted_at,
      approvedAt: syncRow.approved_at
    };

    // Use mode: 'no-cors' option or standard POST to accommodate Google Apps Script redirects
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    return { sent: true, status: response.status };
  } catch (err) {
    console.warn('Google Sheet Webhook trigger note:', err.message);
    // In many browser environments, Google Apps Script redirects trigger opaque responses which still succeed
    return { sent: true, note: 'Dispatched (browser cross-origin)' };
  }
}

/**
 * Pushes a single shift report to Supabase Cloud Database + optional Webhook
 */
export async function pushShiftReportToCloud(report) {
  if (!report) return { success: false, error: 'No report provided' };

  const syncRow = summarizeReportForMasterSync(report);
  const client = getSupabaseClient();
  let supabaseSuccess = false;
  let supabaseError = null;

  if (client) {
    try {
      const { error } = await client
        .from('shift_reports_sync')
        .upsert(syncRow, { onConflict: 'id' });

      if (!error) {
        supabaseSuccess = true;
      } else {
        supabaseError = error.message;
        console.warn('Supabase cloud push warning:', error.message);
      }
    } catch (e) {
      supabaseError = e.message;
      console.warn('Supabase network push failed:', e.message);
    }
  }

  // Also dispatch to Google Sheets webhook if configured
  triggerMasterSheetWebhook(syncRow).catch(() => {});

  return {
    success: supabaseSuccess,
    supabaseError,
    syncedAt: new Date().toISOString(),
    syncRow
  };
}

/**
 * Fetches all shift reports from Supabase Cloud Database
 * Merges them with local reports cache
 */
export async function fetchShiftReportsFromCloud() {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, reports: getShiftReports(), source: 'local' };
  }

  try {
    const { data, error } = await client
      .from('shift_reports_sync')
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      console.warn('Failed to fetch shift reports from cloud:', error.message);
      return { success: false, error: error.message, reports: getShiftReports(), source: 'local' };
    }

    if (data && Array.isArray(data)) {
      // Reconstruct full reports
      const cloudReports = data.map(row => {
        if (row.full_data && typeof row.full_data === 'object') {
          return {
            ...row.full_data,
            id: row.id,
            status: row.status,
            submittedAt: row.submitted_at,
            approvedAt: row.approved_at,
            updatedAt: row.updated_at
          };
        }
        return {
          id: row.id,
          reportDate: row.report_date,
          shift: row.shift,
          machineNumber: row.machine_number,
          machineName: row.machine_name,
          operatorName: row.operator_name,
          supervisorName: row.supervisor_name,
          status: row.status,
          submittedAt: row.submitted_at,
          approvedAt: row.approved_at,
          mouldSessions: []
        };
      });

      // Merge with local storage (cloud takes precedence for same IDs if newer)
      const localReports = getShiftReports();
      const mergedMap = new Map();

      // Put local first
      localReports.forEach(r => mergedMap.set(r.id, r));
      // Overwrite/insert with cloud
      cloudReports.forEach(r => mergedMap.set(r.id, r));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.reportDate || 0) - new Date(a.reportDate || 0);
      });

      saveShiftReports(mergedList);
      return { success: true, reports: mergedList, source: 'cloud', count: cloudReports.length };
    }

    return { success: true, reports: getShiftReports(), source: 'local' };
  } catch (err) {
    console.warn('Error reading from cloud database:', err.message);
    return { success: false, error: err.message, reports: getShiftReports(), source: 'local' };
  }
}

/**
 * Subscribes to Real-Time Postgres changes on `shift_reports_sync`
 * When any mobile device inserts/updates a report, this callback fires instantly on laptop!
 */
export function subscribeToShiftReports(onUpdate) {
  const client = getSupabaseClient();
  if (!client || typeof client.channel !== 'function') {
    return () => {};
  }

  try {
    const channelName = 'public:shift_reports_sync_' + Math.random().toString(36).substr(2, 6);
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_reports_sync' },
        (payload) => {
          if (typeof onUpdate === 'function') {
            onUpdate(payload);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch (e) {}
    };
  } catch (e) {
    console.warn('Realtime subscription setup failed:', e.message);
    return () => {};
  }
}
