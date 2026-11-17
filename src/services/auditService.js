// Radiance Polymers - Audit Trail Service
// Tracks and stores all modifications, reasons, and user actions immutably

const AUDIT_STORAGE_KEY = 'radiance_audit_logs_v1';

export function getAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read audit logs:', err);
    return [];
  }
}

export function recordAuditLog({
  action,
  tableName,
  recordId,
  user,
  oldValue = null,
  newValue = null,
  reason = ''
}) {
  try {
    const logs = getAuditLogs();
    const entry = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      timestamp: new Date().toISOString(),
      user: {
        id: user?.id || 'sys',
        name: user?.fullName || user?.name || 'System User',
        fullName: user?.fullName || user?.name || 'System User',
        role: user?.role || 'operator',
        email: user?.email || 'system@radiancepolymers.com'
      },
      action,
      tableName,
      recordId,
      oldValue,
      newValue,
      reason: reason || 'Routine entry / operation'
    };

    logs.unshift(entry); // Most recent first
    // Retain up to 2000 log records locally
    const trimmed = logs.slice(0, 2000);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
    return entry;
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}

export function clearAuditLogsForDev() {
  localStorage.removeItem(AUDIT_STORAGE_KEY);
}
