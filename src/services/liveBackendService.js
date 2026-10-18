// ==============================================================================
// RADIANCE POLYMERS - LIVE ONLINE DATABASE SERVICE
// Connects frontend to the live backend REST & Realtime Database
// ==============================================================================

const API_BASE = '/api';

/**
 * Checks connection health to the live backend database
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Fetches all master data, rules, metadata, BOM, and parts from the live database
 */
export async function fetchMetadataFromLiveDatabase() {
  try {
    const res = await fetch(`${API_BASE}/metadata`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[LiveDB] Could not reach live metadata endpoint:', err.message);
    return null;
  }
}

/**
 * Fetches all shift reports from the live online database
 */
export async function fetchShiftReportsFromLiveDatabase(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.machine) params.append('machine', filters.machine);
    if (filters.status) params.append('status', filters.status);
    if (filters.date) params.append('date', filters.date);

    const url = `${API_BASE}/reports${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reports = await res.json();
    return { success: true, reports };
  } catch (err) {
    console.warn('[LiveDB] Error fetching reports from live database:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Saves or updates a shift report (including mould sessions, hourly entries, and lumps) in the live database
 */
export async function saveShiftReportToLiveDatabase(report) {
  if (!report || !report.id) return { success: false, error: 'No report payload' };

  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return { success: true, data: result };
  } catch (err) {
    console.warn('[LiveDB] Error saving shift report to live database:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Submits a shift report to the live database
 */
export async function submitShiftReportToLiveDatabase(reportId, submissionData = {}) {
  try {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[LiveDB] Error submitting report to live database:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Approves a shift report in the live database
 */
export async function approveShiftReportInLiveDatabase(reportId, approvalData = {}) {
  try {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvalData),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[LiveDB] Error approving report in live database:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a shift report from the live database
 */
export async function deleteShiftReportFromLiveDatabase(reportId) {
  try {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[LiveDB] Error deleting report from live database:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Logs an immutable audit record to the live database
 */
export async function recordAuditLogToLiveDatabase(entry) {
  try {
    const res = await fetch(`${API_BASE}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Fail silently for audit logs so UI operations are never blocked
    return { success: false, error: err.message };
  }
}

/**
 * Synchronizes parts in bulk to the live database
 */
export async function savePartsToLiveDatabase(parts = []) {
  try {
    const res = await fetch(`${API_BASE}/parts/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parts),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[LiveDB] Error saving parts to live database:', err.message);
    return { success: false, error: err.message };
  }
}
