import {
  getSupabaseClient,
  getSupabaseConfig,
  getShiftReports,
  saveShiftReports,
  getParts,
  saveParts,
  getMachines,
  saveMachines,
  getMachinePartMappings,
  saveMachinePartMappings,
  getRejectionCodes,
  saveRejectionCodes,
  getDowntimeCodes,
  saveDowntimeCodes,
  getDeletedReportIds,
  recordDeletedReportId,
  isReportDeleted
} from './storageService.js';

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
    lumps_generated_kg: Number(report.lumpsGeneratedKg) || 0,
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
 * Merges them with local reports cache (guarantees deleted reports are never resurrected)
 */
export async function fetchShiftReportsFromCloud() {
  const client = getSupabaseClient();
  const deletedIds = new Set(getDeletedReportIds());

  if (!client) {
    const local = getShiftReports().filter(r => !deletedIds.has(r.id));
    return { success: false, reports: local, source: 'local' };
  }

  try {
    const { data, error } = await client
      .from('shift_reports_sync')
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      console.warn('Failed to fetch shift reports from cloud:', error.message);
      const local = getShiftReports().filter(r => !deletedIds.has(r.id));
      return { success: false, error: error.message, reports: local, source: 'local' };
    }

    if (data && Array.isArray(data)) {
      const cloudReports = [];
      const lingeringDeletedCloudIds = [];

      data.forEach(row => {
        // Filter out master data sync row
        if (row.id === 'RP_PLANT_MASTER_DATA' || row.shift === 'MASTER_DATA') return;

        // If this report has been deleted locally, do NOT resurrect it! Purge it from cloud.
        if (deletedIds.has(row.id)) {
          lingeringDeletedCloudIds.push(row.id);
          return;
        }

        if (row.full_data && typeof row.full_data === 'object') {
          cloudReports.push({
            ...row.full_data,
            id: row.id,
            status: row.status,
            submittedAt: row.submitted_at,
            approvedAt: row.approved_at,
            updatedAt: row.updated_at
          });
        } else {
          cloudReports.push({
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
          });
        }
      });

      // Purge lingering deleted reports from Supabase cloud asynchronously
      if (lingeringDeletedCloudIds.length > 0) {
        lingeringDeletedCloudIds.forEach(delId => {
          client.from('shift_reports_sync').delete().eq('id', delId).then(() => {}).catch(() => {});
        });
      }

      // Merge with local storage (cloud takes precedence for same IDs if newer, excluding deleted)
      const localReports = getShiftReports().filter(r => !deletedIds.has(r.id));
      const mergedMap = new Map();

      // Put local first
      localReports.forEach(r => mergedMap.set(r.id, r));
      // Overwrite/insert with cloud (only non-deleted)
      cloudReports.forEach(r => mergedMap.set(r.id, r));

      const mergedList = Array.from(mergedMap.values())
        .filter(r => !deletedIds.has(r.id))
        .sort((a, b) => {
          return new Date(b.reportDate || 0) - new Date(a.reportDate || 0);
        });

      saveShiftReports(mergedList);
      return { success: true, reports: mergedList, source: 'cloud', count: cloudReports.length };
    }

    const local = getShiftReports().filter(r => !deletedIds.has(r.id));
    return { success: true, reports: local, source: 'local' };
  } catch (err) {
    console.warn('Error reading from cloud database:', err.message);
    const local = getShiftReports().filter(r => !deletedIds.has(r.id));
    return { success: false, error: err.message, reports: local, source: 'local' };
  }
}

/**
 * Subscribes to Real-Time Postgres changes on `shift_reports_sync`
 * When any mobile device inserts/updates/deletes a report, this callback fires instantly on laptop!
 */
export function subscribeToShiftReports(onShiftUpdate, onMasterUpdate, onShiftDelete) {
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
          const rowId = payload.new?.id || payload.old?.id;
          if (rowId === 'RP_PLANT_MASTER_DATA') {
            console.log('📡 Realtime Cloud Master Data update received!');
            if (typeof onMasterUpdate === 'function') {
              onMasterUpdate(payload.new?.full_data);
            }
            return;
          }

          // Handle Realtime DELETE event
          if (payload.eventType === 'DELETE' || (!payload.new && payload.old?.id)) {
            const delId = payload.old?.id;
            if (delId) {
              console.log('📡 Realtime Cloud Shift Report DELETE received:', delId);
              recordDeletedReportId(delId);
              const currentReports = getShiftReports().filter(r => r.id !== delId);
              saveShiftReports(currentReports);
              if (typeof onShiftDelete === 'function') {
                onShiftDelete(delId);
              }
            }
            return;
          }

          // If incoming record has been marked deleted on this device, reject it
          if (payload.new?.id && isReportDeleted(payload.new.id)) {
            console.log('📡 Ignoring incoming report already deleted locally:', payload.new.id);
            return;
          }

          if (typeof onShiftUpdate === 'function') {
            onShiftUpdate(payload);
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

/**
 * Deletes a shift report record from Supabase Cloud table `shift_reports_sync`
 */
export async function deleteShiftReportFromCloud(reportId) {
  if (!reportId) return { success: false };
  // Immediately register tombstone
  recordDeletedReportId(reportId);

  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'No Supabase client' };
  try {
    const { error } = await client.from('shift_reports_sync').delete().eq('id', reportId);
    if (error) {
      console.warn('Cloud report delete error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.warn('Cloud report delete exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Pushes entire plant master data (Parts, Machines, Mappings, Rejection Codes, Downtime Codes)
 * to Supabase Cloud so all devices (mobile, tablet, PCs) stay 100% synchronized in real time.
 */
export async function pushMasterDataToCloud(overrides = {}) {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'No active Supabase connection configured. Please check Settings.' };
  }

  try {
    const parts = overrides.parts && overrides.parts.length > 0 ? overrides.parts : getParts();
    const machines = overrides.machines && overrides.machines.length > 0 ? overrides.machines : getMachines();
    const mappings = overrides.mappings && overrides.mappings.length > 0 ? overrides.mappings : getMachinePartMappings();
    const rejectionCodes = overrides.rejectionCodes && overrides.rejectionCodes.length > 0 ? overrides.rejectionCodes : getRejectionCodes();
    const downtimeCodes = overrides.downtimeCodes && overrides.downtimeCodes.length > 0 ? overrides.downtimeCodes : getDowntimeCodes();

    const masterSnapshot = {
      id: 'RP_PLANT_MASTER_DATA',
      report_date: '2026-01-01',
      shift: 'MASTER_DATA',
      machine_number: 'SYSTEM',
      machine_name: 'Plant Master Cloud Hub',
      operator_name: 'SYSTEM',
      supervisor_name: 'Mr. Lokesh',
      part_number: 'ALL_PARTS',
      part_name: `Cloud Plant Master (${parts.length} Parts, ${machines.length} Machines)`,
      target_qty: parts.length,
      production_qty: machines.length,
      accepted_qty: mappings.length,
      rejection_qty: rejectionCodes.length,
      rejection_rate: 0.00,
      downtime_minutes: downtimeCodes.length,
      efficiency_percent: 100.0,
      status: 'approved',
      submitted_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      full_data: {
        type: 'RP_PLANT_MASTER_DATA',
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        parts,
        machines,
        mappings,
        rejectionCodes,
        downtimeCodes
      }
    };

    const { error } = await client
      .from('shift_reports_sync')
      .upsert(masterSnapshot, { onConflict: 'id' });

    if (error) {
      console.warn('Master data cloud push error:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`☁️ Cloud Sync: Successfully published ${parts.length} parts and ${machines.length} machines to Supabase!`);
    return {
      success: true,
      partsCount: parts.length,
      machinesCount: machines.length,
      mappingsCount: mappings.length,
      syncedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('Master data cloud push exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches latest plant master data from Supabase Cloud and updates local storage
 */
export async function fetchMasterDataFromCloud() {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, reason: 'No active Supabase client configured' };
  }

  try {
    const { data, error } = await client
      .from('shift_reports_sync')
      .select('*')
      .eq('id', 'RP_PLANT_MASTER_DATA')
      .single();

    if (error || !data || !data.full_data) {
      return { success: false, error: error?.message || 'No master data record in cloud' };
    }

    const payload = data.full_data;
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    const machines = Array.isArray(payload.machines) ? payload.machines : [];
    const mappings = Array.isArray(payload.mappings) ? payload.mappings : [];
    const rejectionCodes = Array.isArray(payload.rejectionCodes) ? payload.rejectionCodes : [];
    const downtimeCodes = Array.isArray(payload.downtimeCodes) ? payload.downtimeCodes : [];

    // If cloud has valid parts, save them to local storage
    if (parts.length > 0) {
      saveParts(parts);
    }
    if (machines.length > 0) {
      saveMachines(machines);
    }
    if (mappings.length > 0) {
      saveMachinePartMappings(mappings);
    }
    if (rejectionCodes.length > 0) {
      saveRejectionCodes(rejectionCodes);
    }
    if (downtimeCodes.length > 0) {
      saveDowntimeCodes(downtimeCodes);
    }

    console.log(`☁️ Cloud Sync: Downloaded ${parts.length} parts and ${machines.length} machines from Supabase!`);

    return {
      success: true,
      parts,
      machines,
      mappings,
      rejectionCodes,
      downtimeCodes,
      updatedAt: payload.updatedAt
    };
  } catch (err) {
    console.warn('Error fetching master data from cloud:', err);
    return { success: false, error: err.message };
  }
}
