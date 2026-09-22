// Radiance Polymers - Audit Trail Viewer Component
import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  User,
  Clock,
  RotateCcw
} from 'lucide-react';
import { getAuditLogs } from '../services/auditService';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const refreshLogs = () => {
    setLogs(getAuditLogs());
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const filteredLogs = logs.filter(item => {
    const matchQuery = searchQuery
      ? JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchAction = actionFilter === 'ALL' || item.action === actionFilter;
    return matchQuery && matchAction;
  });

  return (
    <div className="main-viewport">
      
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={22} color="var(--clr-purple)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
              Shop Floor Audit Trail
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={refreshLogs}
            style={{ height: '40px', minHeight: '40px', padding: '0 12px' }}
          >
            <RotateCcw size={15} />
            <span>Refresh</span>
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--clr-text3)', margin: 0, lineHeight: 1.4 }}>
          Chronological, cryptographically verifiable log of all hourly entries, supervisor sign-offs, manager unlocks, and master changes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '16px', color: 'var(--clr-text3)' }} />
          <input
            type="text"
            style={{
              width: '100%',
              minHeight: '48px',
              paddingLeft: '38px',
              paddingRight: '12px',
              borderRadius: '10px',
              border: '1px solid var(--clr-border)',
              background: 'var(--bg-surface2)',
              fontFamily: 'var(--font)',
              fontSize: '13px',
              outline: 'none'
            }}
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          style={{
            width: '100%',
            minHeight: '48px',
            borderRadius: '10px',
            border: '1px solid var(--clr-border)',
            background: 'var(--bg-surface2)',
            fontFamily: 'var(--font)',
            fontSize: '13px',
            padding: '0 12px',
            fontWeight: 600
          }}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="ALL">All Actions ({logs.length})</option>
          <option value="HOURLY_ENTRY_SAVED">HOURLY_ENTRY_SAVED</option>
          <option value="MOULD_CHANGE_EXECUTED">MOULD_CHANGE_EXECUTED</option>
          <option value="REPORT_SUBMITTED">REPORT_SUBMITTED</option>
          <option value="REPORT_APPROVED">REPORT_APPROVED</option>
          <option value="REPORT_UNLOCKED">REPORT_UNLOCKED</option>
          <option value="MATERIALS_SAVED">MATERIALS_SAVED</option>
          <option value="CREATE_REJECTION_CODE">CREATE_REJECTION_CODE</option>
          <option value="CREATE_DOWNTIME_CODE">CREATE_DOWNTIME_CODE</option>
        </select>
      </div>

      {/* Audit Log Cards List (Mobile Optimized) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredLogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--clr-text3)' }}>
            <History size={36} style={{ color: 'var(--clr-text4)', marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '14px' }}>No audit records match filters</div>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderLeft: '4px solid var(--clr-primary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span className="badge-tag machine" style={{ fontSize: '11px' }}>
                  {log.action}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--clr-text3)' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--clr-text)' }}>
                  {log.user?.fullName || log.user?.name || 'System User'}
                </div>
                <span className="badge-tag shift" style={{ fontSize: '10px' }}>
                  {(log.user?.role || 'USER').toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--clr-text2)', lineHeight: 1.4 }}>
                {log.reason || `Action on ${log.tableName || 'system'}`}
              </div>

              {(log.oldValue || log.newValue) && (
                <div
                  style={{
                    background: 'var(--bg-surface2)',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  {log.oldValue && (
                    <div style={{ color: 'var(--clr-error)' }}>
                      - Old: {typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue).substring(0, 70) : String(log.oldValue)}
                    </div>
                  )}
                  {log.newValue && (
                    <div style={{ color: 'var(--clr-success-dark)' }}>
                      + New: {typeof log.newValue === 'object' ? JSON.stringify(log.newValue).substring(0, 70) : String(log.newValue)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
