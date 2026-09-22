// Radiance Polymers - Production Console (Simplified: Machine Strip + Hourly Chart + Mould Change Support)
import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  ChevronRight,
  Clock,
  X,
  RefreshCw,
  Package,
  Hash,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SHIFT_HOURS_DEFINITIONS } from '../data/seedData';
import { useI18n } from '../i18n/I18nContext';

export default function ProductionConsole({
  activeReport,
  onOpenHourModal,
  onOpenMouldChangeModal,
  onOpenMaterialModal,
  onOpenCounterModal,
  onOpenSummaryDrawer,
  currentUser,
  onOpenNewShiftModal,
  pilotReadiness
}) {
  const { t, getRejectionDescription, getDowntimeDescription } = useI18n();
  const [showChart, setShowChart] = useState(false);

  /* ── No active shift ── */
  if (!activeReport) {
    const isLocked = pilotReadiness && !pilotReadiness.isReady;

    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: '999px', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)', fontWeight: 800, fontSize: '0.82rem', color: 'var(--clr-text2)', marginBottom: '12px' }}>
          MC03 · Milacron 450T
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 6px 0' }}>
          No Active Shift
        </h2>
        <p style={{ color: 'var(--clr-text3)', fontSize: '0.88rem', margin: '0 0 22px 0', lineHeight: 1.5 }}>
          {isLocked
            ? 'Mandatory master data is required before starting production.'
            : 'Machine MC03 is ready. Start a shift to begin hourly production reporting.'}
        </p>

        {isLocked && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--clr-error-lt)', border: '1px solid var(--clr-error)', color: 'var(--clr-error-dark)', margin: '0 auto 18px auto', fontSize: '0.82rem', textAlign: 'left', maxWidth: '400px' }}>
            <strong>🔴 Master data missing:</strong> {pilotReadiness.missing.join(', ')}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: '44px', padding: '0 28px' }}
          disabled={isLocked}
          onClick={isLocked ? undefined : onOpenNewShiftModal}
        >
          <Plus size={18} />
          <span>{isLocked ? 'START SHIFT (LOCKED)' : 'START NEW SHIFT'}</span>
        </button>
      </div>
    );
  }

  /* ── Active shift multi-session helpers ── */
  const sessions = activeReport.mouldSessions || [];
  const activeSession =
    sessions.find(s => s.status === 'active') ||
    sessions[sessions.length - 1] ||
    sessions[0];

  const isReportApproved = activeReport.status === 'approved';
  const canEdit          = !isReportApproved;

  const allHours = SHIFT_HOURS_DEFINITIONS; // all 12 hours

  /**
   * Seamlessly resolves the session and entry for any hour in the 12-hour report.
   * Enables mould changes mid-shift (e.g. after 5 hours: H1-H5 in Session 1, H6-H12 in Session 2).
   */
  const getHourContext = (hourIndex) => {
    // 1. Check if an entry exists in any session for this hour
    for (const sess of sessions) {
      const entry = (sess.entries || []).find(e => e.hourIndex === hourIndex);
      if (entry) {
        return { session: sess, entry };
      }
    }
    // 2. If no entry exists yet, assign to session based on startHour
    const sorted = [...sessions].sort((a, b) => (a.sessionSequence || 1) - (b.sessionSequence || 1));
    for (let i = sorted.length - 1; i >= 0; i--) {
      const sess = sorted[i];
      const startH = Number(sess.startHour) || (sess.sessionSequence === 1 ? 1 : 1);
      if (hourIndex >= startH) {
        return { session: sess, entry: null };
      }
    }
    return { session: activeSession, entry: null };
  };

  /**
   * Checks if an hour marks the start of a mould / tool change transition
   */
  const getMouldChangeAtHour = (hourIndex) => {
    return sessions.find(
      s => s.sessionSequence > 1 && (Number(s.startHour) || Number(s.mouldChangeHour)) === hourIndex
    );
  };

  // Collect all logged entries across all sessions in this shift report
  const allEntriesAcrossSessions = sessions.flatMap(s => s.entries || []);
  const loggedEntries = allEntriesAcrossSessions.filter(
    e => e.productionQty !== undefined && e.productionQty !== null && e.productionQty !== ''
  );
  const completedCount = loggedEntries.length;

  // Status colour logic
  const pendingCount  = allHours.length - completedCount;
  let statusDot, statusLabel;
  if (!canEdit || pendingCount === 0) {
    statusDot = '#10b981'; statusLabel = 'Up to date';
  } else if (pendingCount === 1) {
    statusDot = '#f59e0b'; statusLabel = '1 hr pending';
  } else if (pendingCount === 2) {
    statusDot = '#f59e0b'; statusLabel = `${pendingCount} hrs pending`;
  } else {
    statusDot = '#ef4444'; statusLabel = `${pendingCount} hrs pending`;
  }

  // Last filled hour slot label
  const lastFilled = [...loggedEntries].sort((a, b) => (b.hourIndex || 0) - (a.hourIndex || 0))[0];
  const lastSlot = lastFilled
    ? allHours.find(h => h.index === lastFilled.hourIndex)?.label || '—'
    : 'None yet';

  const nextPendingHourDef = allHours.find(
    h => !allEntriesAcrossSessions.some(
      e => (e.hourIndex === h.index || e.hourInterval === h.label) &&
           e.productionQty !== undefined && e.productionQty !== null && e.productionQty !== ''
    )
  );

  // Totals for hourly chart footer across ALL sessions in the report
  let totalTargetSum = 0, totalProdSum = 0, totalRejSum = 0, totalAccSum = 0, totalDowntimeSum = 0;
  allHours.forEach(hDef => {
    const { session, entry } = getHourContext(hDef.index);
    totalTargetSum += Number(session?.theoreticalHourlyTarget) || 0;
    if (entry) {
      totalProdSum     += Number(entry.productionQty)   || 0;
      totalRejSum      += Number(entry.rejectionQty)    || 0;
      totalAccSum      += Number(entry.acceptedQty)     || 0;
      totalDowntimeSum += Number(entry.downtimeMinutes) || 0;
    }
  });
  const totalRejRate = totalProdSum > 0 ? ((totalRejSum / totalProdSum) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── MACHINE STRIP CARD ── */}
      <div
        onClick={() => setShowChart(v => !v)}
        style={{
          background: 'var(--bg-surface)',
          border: `2px solid ${statusDot}55`,
          borderRadius: showChart ? '12px 12px 0 0' : '12px',
          cursor: 'pointer',
          userSelect: 'none',
          margin: '12px 12px 0 12px',
          boxShadow: `0 2px 10px rgba(0,0,0,0.10)`,
          overflow: 'hidden'
        }}
      >
        {/* ── Top colour bar ── */}
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${statusDot}, ${statusDot}88)` }} />

        {/* ── Row 1: Machine ID + Part(s) + Status pill ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px 8px 16px',
          flexWrap: 'wrap'
        }}>
          {/* Status pulse dot */}
          <span style={{
            width: '12px', height: '12px', borderRadius: '50%',
            background: statusDot, flexShrink: 0,
            boxShadow: `0 0 0 4px ${statusDot}33`,
            animation: pendingCount > 2 ? 'pulse 1.2s infinite' : 'none'
          }} />

          {/* Machine badge */}
          <span style={{
            background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)',
            borderRadius: '6px', padding: '3px 10px',
            fontFamily: 'var(--font-mono)', fontWeight: 900,
            fontSize: '1rem', color: 'var(--clr-primary)', letterSpacing: '0.04em',
            flexShrink: 0
          }}>
            {activeReport.machineNumber}
          </span>

          {/* Part number & mould change indicator */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--clr-text)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {sessions.length > 1 ? (
                <>
                  <span>{sessions[0].partNumber}</span>
                  <ArrowRight size={14} color="var(--amber-primary)" />
                  <span style={{ color: 'var(--amber-primary)' }}>{sessions[sessions.length - 1].partNumber}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--amber-primary)',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    {sessions.length} Mould Sessions
                  </span>
                </>
              ) : (
                <span>{activeSession?.partNumber || '—'}</span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeSession?.partName || 'Production Session Running'}
            </div>
          </div>

          {/* Status pill */}
          <span style={{
            background: `${statusDot}22`, border: `1px solid ${statusDot}`,
            color: statusDot, borderRadius: '999px',
            padding: '3px 10px', fontSize: '0.72rem', fontWeight: 800,
            whiteSpace: 'nowrap', flexShrink: 0
          }}>
            {pendingCount === 0 ? '● LIVE' : `⚠ ${statusLabel}`}
          </span>
        </div>

        {/* ── Row 2: 4-field info grid ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '0',
          borderTop: '1px solid var(--clr-border)',
          padding: '8px 16px 12px 16px'
        }}>
          {/* Operator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text4)', fontWeight: 700 }}>Operator</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--clr-text)', lineHeight: 1.2 }}>
              {activeSession?.operator_name || activeReport?.operator_name || activeReport?.operatorName || '—'}
            </span>
          </div>

          {/* Shift */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text4)', fontWeight: 700 }}>Shift</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--clr-text)', lineHeight: 1.2 }}>
              {activeReport.shift || '—'}
            </span>
          </div>

          {/* Last Entry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text4)', fontWeight: 700 }}>Last Entry</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--clr-text)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} color="var(--clr-text3)" />
              {lastSlot}
            </span>
          </div>

          {/* Hours Done */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text4)', fontWeight: 700 }}>Hours Done</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: statusDot, lineHeight: 1.2 }}>
              {completedCount} / {allHours.length}
            </span>
          </div>
        </div>

        {/* ── Main Strip Actions (Shift Summary) ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            borderTop: '1px solid var(--clr-border)',
            background: 'var(--bg-surface2)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--clr-text3)', fontWeight: 600 }}>
              Shift {activeReport.shift || '1'} · {activeReport.machineNumber || 'MC03'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ height: '32px', padding: '0 14px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={onOpenSummaryDrawer}
          >
            <FileText size={14} />
            <span>Shift Summary</span>
          </button>
        </div>

        {/* ── Tap hint ── */}
        <div style={{
          borderTop: '1px solid var(--clr-border)',
          background: 'var(--bg-surface)',
          padding: '6px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          fontSize: '0.72rem', color: 'var(--clr-text4)', fontWeight: 600
        }}>
          <ChevronRight size={13} style={{ transform: showChart ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--clr-primary)' }} />
          {showChart ? 'Hide hourly chart' : 'Tap to view hourly production'}
        </div>
      </div>

      {/* ── HOURLY PRODUCTION CHART (expandable) ── */}
      {showChart && (
        <div style={{
          margin: '0 12px 12px 12px',
          border: '1px solid var(--clr-border)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          background: 'var(--bg-surface)',
          overflow: 'hidden'
        }}>
          {/* Chart header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: '1px solid var(--clr-border)',
            background: 'var(--bg-surface2)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--clr-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="var(--clr-primary)" />
              Hourly Production · {activeReport.machineNumber} (12 Hours)
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {canEdit && nextPendingHourDef && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ height: '30px', padding: '0 12px', fontSize: '0.76rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const { session: hSession } = getHourContext(nextPendingHourDef.index);
                    onOpenHourModal(nextPendingHourDef, null, hSession);
                  }}
                >
                  <Plus size={13} />
                  <span>Log H{nextPendingHourDef.index}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowChart(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text3)', padding: '2px', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="hour-card-list" style={{ padding: '8px' }}>
            {allHours.map((hDef) => {
              const { session: hourSession, entry } = getHourContext(hDef.index);
              const hasData = Boolean(entry);
              const isPending = canEdit && hDef.index === nextPendingHourDef?.index;
              const mouldSwitch = getMouldChangeAtHour(hDef.index);

              return (
                <React.Fragment key={hDef.index}>
                  {/* Mould Change transition separator */}
                  {mouldSwitch && (
                    <div style={{
                      background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(6, 182, 212, 0.10))',
                      border: '1px dashed var(--amber-primary)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      margin: '10px 0 6px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} color="var(--amber-primary)" />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--amber-primary)' }}>
                            MOULD / TOOL CHANGED: {mouldSwitch.partNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)' }}>
                            {mouldSwitch.partName} · Session #{mouldSwitch.sessionSequence}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--clr-text)' }}>
                          {mouldSwitch.theoreticalHourlyTarget} pcs/hr
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--clr-text4)' }}>
                          Cycle: {mouldSwitch.standardCycleTimeSeconds}s
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`hour-card ${hasData ? 'has-data' : ''} ${isPending ? 'pending' : ''}`}
                  >
                    <div className="hour-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`hour-badge ${isPending ? 'pending' : ''}`}>H{hDef.index}</span>
                        <span className="hour-time">{hDef.label}</span>
                        {hourSession && sessions.length > 1 && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--clr-text3)', fontFamily: 'var(--font-mono)' }}>
                            [{hourSession.partNumber}]
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ minHeight: '34px', padding: '0 8px', borderColor: 'var(--amber-primary)', color: 'var(--amber-primary)' }}
                            title={`Change Mould at Hour ${hDef.index}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMouldChangeModal(hDef.index);
                            }}
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        {canEdit ? (
                          <button
                            type="button"
                            className={`btn ${hasData ? 'btn-outline' : 'btn-primary'} btn-sm`}
                            style={{ minHeight: '34px', padding: '0 10px', fontSize: '0.76rem' }}
                            onClick={() => onOpenHourModal(hDef, entry, hourSession)}
                          >
                            {hasData ? <Edit3 size={13} /> : <Plus size={13} />}
                            <span>{hasData ? 'Edit' : 'Log'}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--clr-text4)' }}>Locked</span>
                        )}
                      </div>
                    </div>
                    <div className="hour-data-row">
                      <div className="hour-data-cell">
                        <span className="hour-data-label">Target</span>
                        <span className="hour-data-val">{hourSession?.theoreticalHourlyTarget || '-'}</span>
                      </div>
                      <div className="hour-data-cell">
                        <span className="hour-data-label">Produced</span>
                        <span className="hour-data-val">{hasData ? (Number(entry?.productionQty) || 0) : '-'}</span>
                      </div>
                      <div className="hour-data-cell">
                        <span className="hour-data-label">Rej</span>
                        <span className="hour-data-val red">{hasData ? (Number(entry?.rejectionQty) || 0) : '-'}</span>
                      </div>
                      <div className="hour-data-cell">
                        <span className="hour-data-label">Down</span>
                        <span className="hour-data-val orange">{hasData ? `${Number(entry?.downtimeMinutes) || 0}m` : '-'}</span>
                      </div>
                    </div>
                    {hasData && (entry?.primaryRejectionCode || (entry?.rejectionBreakdown && entry.rejectionBreakdown.length > 0) || entry?.primaryDowntimeCode || (entry?.downtimeBreakdown && entry.downtimeBreakdown.length > 0) || entry?.remarks) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingTop: '4px', fontSize: '0.71rem' }}>
                        {entry?.rejectionBreakdown && entry.rejectionBreakdown.length > 0 ? (
                          entry.rejectionBreakdown.map(r => (
                            <span key={r.code} className="badge badge-danger">Rej: {r.code} ({r.qty})</span>
                          ))
                        ) : entry?.primaryRejectionCode ? (
                          <span className="badge badge-danger">Rej: {entry.primaryRejectionCode}</span>
                        ) : null}

                        {entry?.downtimeBreakdown && entry.downtimeBreakdown.length > 0 ? (
                          entry.downtimeBreakdown.map(d => (
                            <span key={d.code} className="badge badge-warning">DT: {d.code} ({d.minutes}m)</span>
                          ))
                        ) : entry?.primaryDowntimeCode ? (
                          <span className="badge badge-warning">DT: {entry.primaryDowntimeCode}</span>
                        ) : null}

                        {entry?.remarks && (
                          <span style={{ color: 'var(--clr-text3)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            "{entry.remarks}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Desktop table (hidden on mobile via CSS) */}
          <div className="grid-table-container">
            <table className="production-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>{t('col_hour')}</th>
                  <th style={{ width: '130px' }}>{t('col_interval')}</th>
                  <th style={{ width: '110px' }}>{t('col_target')}</th>
                  <th style={{ width: '120px' }}>{t('col_production')}</th>
                  <th style={{ width: '120px' }}>{t('col_rejection')}</th>
                  <th style={{ width: '120px' }}>{t('col_accepted')}</th>
                  <th style={{ width: '110px' }}>{t('col_downtime')}</th>
                  <th style={{ width: '150px' }}>{t('col_dt_code')}</th>
                  <th style={{ width: '140px' }}>{t('col_rej_code')}</th>
                  <th>{t('col_remarks')}</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>{t('col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {allHours.map((hDef) => {
                  const { session: hourSession, entry } = getHourContext(hDef.index);
                  const hasData = Boolean(entry);
                  const mouldSwitch = getMouldChangeAtHour(hDef.index);

                  return (
                    <React.Fragment key={hDef.index}>
                      {/* Mould Change banner row */}
                      {mouldSwitch && (
                        <tr style={{ background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(6, 182, 212, 0.12))', borderTop: '2px dashed var(--amber-primary)', borderBottom: '2px dashed var(--amber-primary)' }}>
                          <td colSpan={11} style={{ padding: '9px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem' }}>
                                <RefreshCw size={16} />
                                MOULD / TOOL CHANGED: {mouldSwitch.partNumber} — {mouldSwitch.partName} (Session #{mouldSwitch.sessionSequence})
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--clr-text2)' }}>
                                Effective: Hour {hDef.index} ({hDef.label}) · Target: <strong>{mouldSwitch.theoreticalHourlyTarget} pcs/hr</strong> · Cavities: <strong>{mouldSwitch.cavityCount}</strong> · Cycle: <strong>{mouldSwitch.standardCycleTimeSeconds}s</strong>
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr className={hasData ? 'active-row' : ''}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>H{hDef.index}</td>
                        <td style={{ fontWeight: 600, color: 'var(--clr-text2)' }}>
                          <div>{hDef.label}</div>
                          {hourSession && sessions.length > 1 && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--clr-text4)', fontFamily: 'var(--font-mono)' }}>
                              {hourSession.partNumber}
                            </div>
                          )}
                        </td>
                        <td className="num-cell target">{hourSession?.theoreticalHourlyTarget || '-'}</td>
                        <td className="num-cell" style={{ color: hasData ? 'var(--clr-text)' : 'var(--clr-text4)' }}>
                          {hasData ? (Number(entry?.productionQty) || 0).toLocaleString() : '-'}
                        </td>
                        <td className="num-cell rejection">
                          {hasData ? <span>{Number(entry?.rejectionQty) || 0}</span> : '-'}
                        </td>
                        <td className="num-cell accepted">
                          {hasData ? (Number(entry?.acceptedQty) || 0).toLocaleString() : '-'}
                        </td>
                        <td className="num-cell downtime">
                          {hasData ? <span>{Number(entry?.downtimeMinutes) || 0} min</span> : '-'}
                        </td>
                        <td>
                          {hasData && entry?.downtimeBreakdown && entry.downtimeBreakdown.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {entry.downtimeBreakdown.map(d => (
                                <span key={d.code} className="badge badge-warning" title={getDowntimeDescription(d.code)}>
                                  {d.code} ({d.minutes}m)
                                </span>
                              ))}
                            </div>
                          ) : hasData && entry?.primaryDowntimeCode ? (
                            <span className="badge badge-warning" title={getDowntimeDescription(entry.primaryDowntimeCode)}>{entry.primaryDowntimeCode}</span>
                          ) : '-'}
                        </td>
                        <td>
                          {hasData && entry?.rejectionBreakdown && entry.rejectionBreakdown.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {entry.rejectionBreakdown.map(r => (
                                <span key={r.code} className="badge badge-danger" title={getRejectionDescription(r.code)}>
                                  [{r.code}] {r.qty} pcs
                                </span>
                              ))}
                            </div>
                          ) : hasData && entry?.primaryRejectionCode ? (
                            <span className="badge badge-danger" title={getRejectionDescription(entry.primaryRejectionCode)}>
                              [{entry.primaryRejectionCode}] {getRejectionDescription(entry.primaryRejectionCode)}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--clr-text3)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hasData ? entry?.remarks || '—' : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                            {canEdit ? (
                              <button type="button" className="btn-log-hour" onClick={() => onOpenHourModal(hDef, entry, hourSession)}>
                                {hasData ? <Edit3 size={14} /> : <Plus size={14} />}
                                <span>{hasData ? t('btn_edit') : t('btn_log')}</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text4)' }}>Locked</span>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                style={{
                                  border: '1px solid var(--amber-primary)',
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  color: 'var(--amber-primary)',
                                  borderRadius: '6px',
                                  padding: '4px 7px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title={`Change Mould starting at Hour ${hDef.index}`}
                                onClick={() => onOpenMouldChangeModal(hDef.index)}
                              >
                                <RefreshCw size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {sessions.length > 1 ? `Shift Totals (${sessions.length} Sessions)` : t('totals_label', { seq: activeSession?.sessionSequence })}
                  </td>
                  <td className="num-cell target">{(totalTargetSum || 0).toLocaleString()}</td>
                  <td className="num-cell" style={{ color: 'var(--clr-text)' }}>{(totalProdSum || 0).toLocaleString()}</td>
                  <td className="num-cell rejection">{(totalRejSum || 0).toLocaleString()} ({totalRejRate}%)</td>
                  <td className="num-cell accepted">{(totalAccSum || 0).toLocaleString()}</td>
                  <td className="num-cell downtime">{totalDowntimeSum || 0} min</td>
                  <td colSpan={4} style={{ fontSize: '0.8rem', color: 'var(--clr-text2)' }}>
                    {t('good_parts_ratio')}: <strong>{totalProdSum > 0 ? ((totalAccSum / totalProdSum) * 100).toFixed(1) : 100}%</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Review & Close row */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" style={{ height: '34px' }} onClick={onOpenSummaryDrawer}>
              Review &amp; Close Shift
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
