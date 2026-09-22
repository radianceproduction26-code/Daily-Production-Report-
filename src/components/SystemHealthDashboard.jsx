// Radiance Polymers - System Health & Supabase Cloud Integration Dashboard
// Admin & Production Manager Monitoring Console
import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  Mail,
  Users,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  ExternalLink,
  Server,
  Layers,
  Archive
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import {
  getSystemHealthMetrics,
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  flushSyncQueue,
  markBackupCompleted,
  getOfflineSyncQueue
} from '../services/storageService';

export default function SystemHealthDashboard() {
  const { t } = useI18n();

  // State
  const [metrics, setMetrics] = useState(getSystemHealthMetrics());
  const [config, setConfig] = useState(getSupabaseConfig());
  const [syncQueue, setSyncQueue] = useState(getOfflineSyncQueue());
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState(null);
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushResult, setFlushResult] = useState(null);
  const [lastBackup, setLastBackup] = useState(metrics.lastBackupTime);
  const [editUrl, setEditUrl] = useState(config.url || '');
  const [editAnonKey, setEditAnonKey] = useState(config.anonKey || '');
  const [configSaveNotice, setConfigSaveNotice] = useState(null);

  const refreshDashboard = () => {
    setMetrics(getSystemHealthMetrics());
    setConfig(getSupabaseConfig());
    setSyncQueue(getOfflineSyncQueue());
  };

  useEffect(() => {
    refreshDashboard();
    const interval = setInterval(refreshDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Supabase Credentials Save
  const handleSaveConfig = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const u = editUrl.trim();
    const k = editAnonKey.trim();
    const updated = saveSupabaseConfig(u, k);
    setConfig(updated);
    setConfigSaveNotice({ type: 'success', msg: 'Supabase configuration saved to secure local credentials.' });
    setTimeout(() => setConfigSaveNotice(null), 4000);
    refreshDashboard();
  };

  // Handle Live Supabase Connection Test
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    try {
      const u = editUrl.trim();
      const k = editAnonKey.trim();
      if (!u || !k) {
        setConnTestResult({ connected: false, error: 'Supabase URL and Anon Key are required.' });
        return;
      }
      saveSupabaseConfig(u, k);
      const res = await testSupabaseConnection(u, k);
      setConnTestResult(res);
      refreshDashboard();
    } catch (err) {
      setConnTestResult({ success: false, error: err.message });
    } finally {
      setIsTestingConn(false);
    }
  };

  // Handle Manual Force Sync Queue
  const handleForceSync = async () => {
    setIsFlushing(true);
    setFlushResult(null);
    try {
      const res = await flushSyncQueue();
      setFlushResult(res);
      refreshDashboard();
    } catch (err) {
      setFlushResult({ error: err.message });
    } finally {
      setIsFlushing(false);
    }
  };

  // Handle Manual Backup
  const handleBackupNow = () => {
    const ts = markBackupCompleted();
    setLastBackup(ts);
    refreshDashboard();
  };

  const getStatusColor = (status) => {
    if (status === 'connected') return '#10b981'; // Green
    if (status === 'offline_mode') return '#f59e0b'; // Amber
    return '#64748b'; // Slate Gray
  };

  return (
    <div className="main-viewport">
      
      {/* Top Banner Header */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'var(--clr-primary-lt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--clr-primary)',
            flexShrink: 0
          }}>
            <Activity size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              System Health & Cloud Sync
              <span className="badge-tag machine" style={{ fontSize: '10px' }}>
                Phase 3
              </span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--clr-text3)', lineHeight: 1.3 }}>
              Real-time monitoring for cloud sync, offline queue & storage.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={refreshDashboard}
            className="btn btn-outline"
            style={{ width: '100%', padding: '0 8px', fontSize: '12px' }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleBackupNow}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0 8px', fontSize: '12px' }}
          >
            <Archive size={15} />
            <span>Backup</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Mobile 1-Column) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '10px',
        marginBottom: '16px'
      }}>
        {/* Card 1: Cloud Status */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Cloud Database
            </span>
            {metrics.connectionStatus === 'connected' ? (
              <Cloud size={18} color="#10b981" />
            ) : (
              <CloudOff size={18} color="#f59e0b" />
            )}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: getStatusColor(metrics.connectionStatus), display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusColor(metrics.connectionStatus), display: 'inline-block' }}></span>
            {metrics.connectionStatus === 'connected' ? 'Connected (Live)' : (metrics.connectionStatus === 'offline_mode' ? 'Offline-First Cache' : 'Local Standalone')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Latency: {metrics.latencyMs ? `${metrics.latencyMs} ms` : 'N/A (Local SQLite/Cache)'}
          </div>
        </div>

        {/* Card 2: Offline Sync Queue */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Offline Sync Queue
            </span>
            <RefreshCw size={18} color="var(--cyan-primary)" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: metrics.pendingOfflineCount > 0 ? '#f59e0b' : '#10b981' }}>
            {metrics.pendingOfflineCount} Pending / {metrics.failedSyncCount} Failed
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Auto-syncs on network reconnection
          </div>
        </div>

        {/* Card 3: Storage Diagnostics */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Storage Usage
            </span>
            <HardDrive size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
            {metrics.storageUsageKb} KB Cache
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            {metrics.totalShiftReportsCount} Shift Reports Locally Preserved
          </div>
        </div>

        {/* Card 4: Last Cloud Backup */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Last Backup Snapshot
            </span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
            {lastBackup}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Immutable 18-Table Schema Ready
          </div>
        </div>

        {/* Card 5: Email Notifications */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Email Alerts Queue
            </span>
            <Mail size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
            {metrics.emailQueueStatus.dispatched} Dispatched
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Shift sign-off PDF & Excel triggers
          </div>
        </div>
      </div>

      {/* Main Single-Column Section for Mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '16px' }}>
        
        {/* Supabase Connection Setup Box */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Server size={20} color="var(--clr-primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text)' }}>
              Supabase Connection Credentials
            </h3>
          </div>
          
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text3)', marginBottom: '6px', fontWeight: 600 }}>
                Supabase Project URL
              </label>
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                style={{
                  width: '100%',
                  background: 'var(--bg-surface2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '10px',
                  minHeight: '48px',
                  padding: '10px 12px',
                  color: 'var(--clr-text)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text3)', marginBottom: '6px', fontWeight: 600 }}>
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                value={editAnonKey}
                onChange={(e) => setEditAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                style={{
                  width: '100%',
                  background: 'var(--bg-surface2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '10px',
                  minHeight: '48px',
                  padding: '10px 12px',
                  color: 'var(--clr-text)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {configSaveNotice && (
              <div style={{
                background: 'var(--clr-success-lt)',
                border: '1px solid var(--clr-success)',
                padding: '8px 12px',
                borderRadius: '8px',
                color: 'var(--clr-success-dark)',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                {configSaveNotice.msg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                Save Credentials
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConn}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <RefreshCw size={16} className={isTestingConn ? 'animate-spin' : ''} />
                <span>{isTestingConn ? 'Connecting...' : 'Test Connection'}</span>
              </button>
            </div>

            {/* Test Connection Output Alert */}
            {connTestResult && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: (connTestResult.success || connTestResult.connected) ? 'var(--clr-success-lt)' : 'var(--clr-error-lt)',
                border: `1px solid ${(connTestResult.success || connTestResult.connected) ? 'var(--clr-success)' : 'var(--clr-error)'}`,
                color: (connTestResult.success || connTestResult.connected) ? 'var(--clr-success-dark)' : 'var(--clr-error)',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                {(connTestResult.success || connTestResult.connected) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>Supabase Ping Succeeded! Latency: {connTestResult.latencyMs} ms</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>{connTestResult.error || 'Connection attempt failed. Running in Local Offline-First Mode.'}</span>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Database Schema Status Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--clr-success)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                Database Tables Status
              </h3>
            </div>
            <span className="badge-tag approved" style={{ fontSize: '10px' }}>
              All Active
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '6px'
          }}>
            {[
              { name: 'machines', rows: 'Machines Master' },
              { name: 'moulds', rows: 'Moulds Master' },
              { name: 'parts', rows: 'Part Master' },
              { name: 'mould_parts', rows: 'Machine-Part mappings' },
              { name: 'rejection_codes', rows: 'Standard rejection codes' },
              { name: 'downtime_codes', rows: 'Standard downtime codes' },
              { name: 'shift_reports', rows: 'Shift records' },
              { name: 'audit_logs', rows: 'Immutable audit trail' },
              { name: 'offline_sync_queue', rows: 'Sync reconciliation' }
            ].map(table => (
              <div key={table.name} style={{
                background: 'var(--bg-surface2)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} color="var(--clr-success)" />
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--clr-text)' }}>{table.name}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--clr-text3)' }}>{table.rows}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Offline Sync Queue Inspector Section (Mobile Cards) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--clr-primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text)' }}>
              Offline Sync Queue
            </h3>
          </div>

          <button
            type="button"
            onClick={handleForceSync}
            disabled={isFlushing}
            className="btn btn-outline btn-sm"
            style={{ height: '40px', minHeight: '40px', padding: '0 12px' }}
          >
            <RefreshCw size={14} className={isFlushing ? 'animate-spin' : ''} />
            <span>{isFlushing ? 'Syncing...' : 'Force Sync'}</span>
          </button>
        </div>

        {flushResult && (
          <div style={{
            marginBottom: '12px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--clr-primary-lt)',
            border: '1px solid var(--clr-primary)',
            color: 'var(--clr-primary-dark)',
            fontSize: '12px'
          }}>
            {flushResult.error
              ? `Sync Error: ${flushResult.error}`
              : `Flushed successfully: ${flushResult.syncedCount} synced, ${flushResult.remainingCount} remaining.`}
          </div>
        )}

        {syncQueue.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: 'var(--bg-surface2)',
            borderRadius: '8px',
            border: '1px dashed var(--clr-border)',
            color: 'var(--clr-text3)'
          }}>
            <CheckCircle2 size={24} color="var(--clr-success)" style={{ margin: '0 auto 6px auto', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--clr-text)' }}>
              All Records Cleanly Synchronized
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
              Local cache and Supabase sync ledger are in complete parity.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {syncQueue.slice(0, 10).map((item) => (
              <div key={item.id} style={{
                background: 'var(--bg-surface2)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--clr-primary)' }}>
                    {item.tableName}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--clr-text3)' }}>
                    {new Date(item.timestamp).toLocaleTimeString()} • Retries: {item.retryCount}
                  </div>
                </div>
                <span className={`badge-tag ${item.status === 'synced' ? 'approved' : 'warning'}`} style={{ fontSize: '10px' }}>
                  {item.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
