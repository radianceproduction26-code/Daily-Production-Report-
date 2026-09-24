// Radiance Polymers - Production Console (Multi-Machine Fleet Support: MC03, MC04, MC05, MC06)
import React, { useState, useMemo } from 'react';
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
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Radio,
  SlidersHorizontal
} from 'lucide-react';
import { SHIFT_HOURS_DEFINITIONS, getShiftHours } from '../data/seedData';
import { useI18n } from '../i18n/I18nContext';

export default function ProductionConsole({
  activeReport,
  reports = [],
  machines = [],
  selectedMachineNumber = 'MC03',
  onSelectMachine,
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
  const [showChart, setShowChart] = useState(true);

  // 1. Build standardized 4-machine Fleet (MC03, MC04, MC05, MC06 + any others)
  const fleetMachines = useMemo(() => {
    const standardFleet = [
      { id: 'm-mc-03', machineNumber: 'MC03', machineCode: 'MC03', machineName: 'Milacron 450T', make: 'Milacron', model: '450T', capacityTon: 450, tonnage: 450, status: 'active' },
      { id: 'm-mc-04', machineNumber: 'MC04', machineCode: 'MC04', machineName: 'Milacron 350T', make: 'Milacron', model: '350T', capacityTon: 350, tonnage: 350, status: 'active' },
      { id: 'm-mc-05', machineNumber: 'MC05', machineCode: 'MC05', machineName: 'Milacron 250T', make: 'Milacron', model: '250T', capacityTon: 250, tonnage: 250, status: 'active' },
      { id: 'm-mc-06', machineNumber: 'MC06', machineCode: 'MC06', machineName: 'Milacron 180T', make: 'Milacron', model: '180T', capacityTon: 180, tonnage: 180, status: 'active' }
    ];

    const map = new Map();
    standardFleet.forEach(sf => {
      const match = (machines || []).find(m => (m.machineNumber || m.machineCode) === sf.machineNumber);
      map.set(sf.machineNumber, match ? { ...sf, ...match } : sf);
    });

    (machines || []).forEach(m => {
      const num = m.machineNumber || m.machineCode;
      if (num && !map.has(num)) {
        map.set(num, m);
      }
    });

    return Array.from(map.values());
  }, [machines]);

  // 2. Map running reports for each machine
  const machineShiftMap = useMemo(() => {
    const map = {};
    fleetMachines.forEach(m => {
      const mcNum = m.machineNumber;
      // Look for active/draft report first
      const running = reports.find(
        r => (r.machineNumber === mcNum || (r.machine && r.machine.machineNumber === mcNum)) &&
             (r.status === 'draft' || r.status === 'active' || r.status === 'unlocked')
      );
      if (running) {
        map[mcNum] = running;
      } else {
        // Fallback to most recent report for this machine
        map[mcNum] = reports.find(
          r => r.machineNumber === mcNum || (r.machine && r.machine.machineNumber === mcNum)
        ) || null;
      }
    });
    return map;
  }, [fleetMachines, reports]);

  // Fleet running summary stats
  const fleetSummary = useMemo(() => {
    let runningCount = 0;
    let totalProd = 0;
    let totalRej = 0;
    let totalDowntime = 0;

    fleetMachines.forEach(m => {
      const rep = machineShiftMap[m.machineNumber];
      if (rep && rep.status !== 'approved') {
        runningCount++;
      }
      if (rep) {
        const sessions = rep.mouldSessions || [];
        sessions.forEach(s => {
          (s.entries || []).forEach(e => {
            totalProd += Number(e.productionQty) || 0;
            totalRej += Number(e.rejectionQty) || 0;
            totalDowntime += Number(e.downtimeMinutes) || 0;
          });
        });
      }
    });

    return {
      runningCount,
      totalMachines: fleetMachines.length,
      totalProd,
      totalRej,
      totalDowntime
    };
  }, [fleetMachines, machineShiftMap]);

  // Selected Machine Details
  const selectedMachine = fleetMachines.find(m => m.machineNumber === selectedMachineNumber) || fleetMachines[0] || {
    machineNumber: selectedMachineNumber || 'MC03',
    machineName: 'Milacron 450T',
    capacityTon: 450
  };

  /* ── Active shift multi-session helpers (if activeReport exists for selected machine) ── */
  const sessions = activeReport?.mouldSessions || [];
  const activeSession =
    sessions.find(s => s.status === 'active') ||
    sessions[sessions.length - 1] ||
    sessions[0];

  const isReportApproved = activeReport?.status === 'approved';
  const canEdit = activeReport && !isReportApproved;

  const allHours = getShiftHours(activeReport?.shift); // 12 hours based on Shift A or Shift B

  const getHourContext = (hourIndex) => {
    for (const sess of sessions) {
      const entry = (sess.entries || []).find(e => e.hourIndex === hourIndex);
      if (entry) {
        return { session: sess, entry };
      }
    }
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

  const getMouldChangeAtHour = (hourIndex) => {
    return sessions.find(
      s => s.sessionSequence > 1 && (Number(s.startHour) || Number(s.mouldChangeHour)) === hourIndex
    );
  };

  const allEntriesAcrossSessions = sessions.flatMap(s => s.entries || []);
  const loggedEntries = allEntriesAcrossSessions.filter(
    e => e.productionQty !== undefined && e.productionQty !== null && e.productionQty !== ''
  );
  const completedCount = loggedEntries.length;

  const pendingCount = allHours.length - completedCount;
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

  let totalTargetSum = 0, totalProdSum = 0, totalRejSum = 0, totalAccSum = 0, totalDowntimeSum = 0;
  if (activeReport) {
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
  }
  const totalRejRate = totalProdSum > 0 ? ((totalRejSum / totalProdSum) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ══════════════════════════════════════════════════════════════════
          1. MACHINE FLEET HEADER & ALL-MACHINE STATUS RIBBON
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        margin: '12px 12px 0 12px',
        padding: '12px 14px',
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--clr-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        {/* Fleet Status Summary Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--clr-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--clr-primary)" />
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
              Plant Machines Fleet (4 Lines)
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: fleetSummary.runningCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface2)',
              color: fleetSummary.runningCount > 0 ? '#10b981' : 'var(--clr-text3)',
              border: `1px solid ${fleetSummary.runningCount > 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--clr-border)'}`
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: fleetSummary.runningCount > 0 ? '#10b981' : 'var(--clr-text4)'
              }} />
              {fleetSummary.runningCount} / {fleetSummary.totalMachines} Running
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {fleetSummary.totalProd > 0 && (
              <span style={{ fontSize: '0.74rem', color: 'var(--clr-text3)', fontWeight: 600 }}>
                Fleet Output: <strong style={{ color: 'var(--clr-text)' }}>{fleetSummary.totalProd.toLocaleString()} pcs</strong>
              </span>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ height: '30px', padding: '0 12px', fontSize: '0.74rem', fontWeight: 700, gap: '4px' }}
              onClick={() => onOpenNewShiftModal && onOpenNewShiftModal(selectedMachineNumber)}
            >
              <Plus size={13} />
              <span>New Shift</span>
            </button>
          </div>
        </div>

        {/* ── ALL 4 MACHINES CARDS SELECTOR ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px'
        }}>
          {fleetMachines.map(m => {
            const mcNum = m.machineNumber;
            const rep = machineShiftMap[mcNum];
            const isRunning = rep && rep.status !== 'approved';
            const isSelected = selectedMachineNumber === mcNum;

            // Stats for this machine
            let mcProd = 0;
            let mcEntriesCount = 0;
            let mcPart = '—';
            let mcOperator = '—';

            if (rep) {
              const mcSessions = rep.mouldSessions || [];
              const mcLatestSession = mcSessions[mcSessions.length - 1] || mcSessions[0];
              mcPart = mcLatestSession?.partNumber || rep.partNumber || '—';
              mcOperator = mcLatestSession?.operator_name || rep.operator_name || rep.operatorName || '—';
              mcSessions.forEach(s => {
                (s.entries || []).forEach(e => {
                  if (e.productionQty !== undefined && e.productionQty !== null && e.productionQty !== '') {
                    mcProd += Number(e.productionQty) || 0;
                    mcEntriesCount++;
                  }
                });
              });
            }

            return (
              <div
                key={mcNum}
                onClick={() => onSelectMachine && onSelectMachine(mcNum)}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(2, 132, 199, 0.02) 100%)'
                    : 'var(--bg-surface2)',
                  border: isSelected
                    ? '2px solid var(--clr-primary)'
                    : `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.4)' : 'var(--clr-border)'}`,
                  borderRadius: '10px',
                  padding: '10px 10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: isSelected ? '0 2px 10px rgba(2, 132, 199, 0.16)' : 'none'
                }}
              >
                {/* Header row: Machine badge + Live/Idle status dot */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  <span style={{
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    fontFamily: 'var(--font-mono)',
                    color: isSelected ? 'var(--clr-primary)' : 'var(--clr-text)',
                    letterSpacing: '0.02em'
                  }}>
                    {mcNum}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '999px',
                    background: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                    color: isRunning ? '#10b981' : 'var(--clr-text4)',
                    border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.3)' : 'var(--clr-border)'}`
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isRunning ? '#10b981' : 'var(--clr-text4)',
                      boxShadow: isRunning ? '0 0 6px #10b981' : 'none'
                    }} />
                    {isRunning ? 'LIVE' : 'IDLE'}
                  </span>
                </div>

                {/* Subtitle: Machine Name / Tonnage */}
                <div style={{ fontSize: '0.68rem', color: 'var(--clr-text3)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.machineName || `${m.tonnage || 350}T`}
                </div>

                {/* Status details: Part & Output or Start Button */}
                {isRunning ? (
                  <div style={{ marginTop: '2px', borderTop: '1px dashed var(--clr-border)', paddingTop: '4px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--clr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mcPart}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{mcEntriesCount}/12h</span>
                      <span>{mcProd.toLocaleString()} pcs</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{
                        height: '24px',
                        padding: '0 6px',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        width: '100%',
                        borderRadius: '6px',
                        borderStyle: 'dashed'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectMachine) onSelectMachine(mcNum);
                        if (onOpenNewShiftModal) onOpenNewShiftModal(mcNum);
                      }}
                    >
                      + Start Shift
                    </button>
                  </div>
                )}

                {/* Selected marker pill */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '8px',
                    background: 'var(--clr-primary)',
                    color: '#fff',
                    fontSize: '0.55rem',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em'
                  }}>
                    ACTIVE
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. SELECTED MACHINE SHIFT CONSOLE OR IDLE STATE
      ══════════════════════════════════════════════════════════════════ */}
      {!activeReport ? (
        /* Empty / Idle State for the currently selected machine */
        <div style={{
          margin: '12px',
          padding: '36px 16px',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px dashed var(--clr-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '5px 16px',
            borderRadius: '999px',
            background: 'var(--bg-surface2)',
            border: '1px solid var(--clr-border)',
            fontWeight: 800,
            fontSize: '0.86rem',
            color: 'var(--clr-primary)',
            marginBottom: '12px',
            gap: '6px',
            alignItems: 'center'
          }}>
            <Wrench size={15} />
            <span>{selectedMachine.machineNumber} · {selectedMachine.machineName || `${selectedMachine.tonnage || 350}T`}</span>
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 6px 0' }}>
            Machine {selectedMachine.machineNumber} is Idle
          </h3>
          <p style={{ color: 'var(--clr-text3)', fontSize: '0.88rem', margin: '0 auto 22px auto', maxWidth: '420px', lineHeight: 1.5 }}>
            No shift is currently active for {selectedMachine.machineNumber}. Start a shift to begin recording hourly production, scrap counts, and downtime.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: '46px', padding: '0 28px', fontSize: '0.92rem', fontWeight: 800, gap: '8px' }}
            onClick={() => onOpenNewShiftModal && onOpenNewShiftModal(selectedMachine.machineNumber)}
          >
            <Plus size={18} />
            <span>START SHIFT FOR {selectedMachine.machineNumber}</span>
          </button>
        </div>
      ) : (
        /* Running Shift Console for Selected Machine */
        <>
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
            {/* Top colour bar */}
            <div style={{ height: '4px', background: `linear-gradient(90deg, ${statusDot}, ${statusDot}88)` }} />

            {/* Row 1: Machine ID + Part(s) + Status pill */}
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
                  {activeSession?.partName || 'Production Session Running'} · {selectedMachine.machineName || `${selectedMachine.tonnage || 350}T`}
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

            {/* Row 2: 4-field info grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: '8px',
              borderTop: '1px solid var(--clr-border)',
              padding: '10px 16px 12px 16px'
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
                  {completedCount} / {allHours.length} ({totalProdSum.toLocaleString()} pcs)
                </span>
              </div>
            </div>

            {/* Quick Action Buttons Strip */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                borderTop: '1px solid var(--clr-border)',
                background: 'var(--bg-surface2)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ height: '32px', padding: '0 10px', fontSize: '0.74rem', fontWeight: 700, gap: '4px' }}
                      onClick={() => onOpenMouldChangeModal && onOpenMouldChangeModal()}
                      title="Execute Mould / Tool Change"
                    >
                      <RefreshCw size={13} color="var(--amber-primary)" />
                      <span>Tool Switch</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ height: '32px', padding: '0 10px', fontSize: '0.74rem', fontWeight: 700, gap: '4px' }}
                      onClick={onOpenMaterialModal}
                      title="Log Material Consumption"
                    >
                      <Package size={13} color="var(--clr-primary)" />
                      <span>Materials</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ height: '32px', padding: '0 10px', fontSize: '0.74rem', fontWeight: 700, gap: '4px' }}
                      onClick={onOpenCounterModal}
                      title="Update Machine Counters"
                    >
                      <Hash size={13} color="var(--clr-primary)" />
                      <span>Counters</span>
                    </button>
                  </>
                )}
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

            {/* Tap hint */}
            <div style={{
              borderTop: '1px solid var(--clr-border)',
              background: 'var(--bg-surface)',
              padding: '6px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontSize: '0.72rem', color: 'var(--clr-text4)', fontWeight: 600
            }}>
              <ChevronRight size={13} style={{ transform: showChart ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--clr-primary)' }} />
              {showChart ? 'Hide hourly slots' : 'Tap to expand 12-hour production slots'}
            </div>
          </div>

          {/* ── HOURLY PRODUCTION SLOTS & LOG TABLE ── */}
          {showChart && (
            <div style={{
              margin: '0 12px 12px 12px',
              border: '1px solid var(--clr-border)',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              background: 'var(--bg-surface)',
              overflow: 'hidden'
            }}>
              {/* Header */}
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
                  Hourly Output · {activeReport.machineNumber} (12 Hours)
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
                                MOULD CHANGED: {mouldSwitch.partNumber}
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

                      <div className={`hour-card ${hasData ? 'has-data' : ''} ${isPending ? 'pending' : ''}`}>
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
                                className={`btn btn-sm ${hasData ? 'btn-outline' : 'btn-primary'}`}
                                style={{ minHeight: '34px', padding: '0 12px' }}
                                onClick={() => onOpenHourModal(hDef, entry, hourSession)}
                              >
                                {hasData ? <Edit3 size={13} /> : <Plus size={13} />}
                                <span>{hasData ? t('btn_edit') : t('btn_log')}</span>
                              </button>
                            ) : (
                              <span className="badge badge-gray">{t('status_locked')}</span>
                            )}
                          </div>
                        </div>

                        {hasData ? (
                          <div className="hour-card-grid">
                            <div className="hour-stat">
                              <span className="hour-stat-label">{t('col_target')}</span>
                              <span className="hour-stat-value">{Number(hourSession?.theoreticalHourlyTarget) || 0}</span>
                            </div>
                            <div className="hour-stat">
                              <span className="hour-stat-label">{t('col_produced')}</span>
                              <span className="hour-stat-value highlight">{Number(entry.productionQty) || 0}</span>
                            </div>
                            <div className="hour-stat">
                              <span className="hour-stat-label">{t('col_accepted')}</span>
                              <span className="hour-stat-value success">{Number(entry.acceptedQty) || 0}</span>
                            </div>
                            <div className="hour-stat">
                              <span className="hour-stat-label">{t('col_rejected')}</span>
                              <span className="hour-stat-value danger">{Number(entry.rejectionQty) || 0}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="hour-card-empty">
                            <span>{isPending ? t('pending_entry') : t('not_logged_yet')}</span>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Desktop/Tablet Table view */}
              <div className="table-responsive hide-on-mobile">
                <table className="production-table" style={{ width: '100%', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Hour</th>
                      <th style={{ width: '110px' }}>Interval</th>
                      <th style={{ width: '85px' }}>Target</th>
                      <th style={{ width: '85px' }}>Gross</th>
                      <th style={{ width: '85px' }}>Reject</th>
                      <th style={{ width: '85px' }}>Accepted</th>
                      <th style={{ width: '85px' }}>Downtime</th>
                      <th>Downtime Reasons</th>
                      <th>Scrap Defects</th>
                      <th>Remarks</th>
                      <th style={{ width: '115px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHours.map((hDef) => {
                      const { session: hourSession, entry } = getHourContext(hDef.index);
                      const hasData = Boolean(entry);
                      const mouldSwitch = getMouldChangeAtHour(hDef.index);

                      return (
                        <React.Fragment key={hDef.index}>
                          {mouldSwitch && (
                            <tr style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                              <td colSpan={11} style={{ padding: '8px 14px', borderLeft: '4px solid var(--amber-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RefreshCw size={14} color="var(--amber-primary)" />
                                    <strong style={{ color: 'var(--amber-primary)' }}>
                                      MOULD CHANGED: {mouldSwitch.partNumber} ({mouldSwitch.partName})
                                    </strong>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--clr-text3)' }}>
                                      Session #{mouldSwitch.sessionSequence} · Operator: {mouldSwitch.operator_name || mouldSwitch.operatorName || '—'}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                    Target: {mouldSwitch.theoreticalHourlyTarget} pcs/hr (Cycle: {mouldSwitch.standardCycleTimeSeconds}s)
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className={hasData ? 'row-completed' : ''}>
                            <td style={{ fontWeight: 800 }}>H{hDef.index}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--clr-text2)' }}>{hDef.label}</td>
                            <td className="num-cell target">{Number(hourSession?.theoreticalHourlyTarget) || 0}</td>
                            <td className="num-cell" style={{ fontWeight: 700 }}>
                              {hasData ? (Number(entry?.productionQty) || 0).toLocaleString() : '-'}
                            </td>
                            <td className="num-cell rejection">
                              {hasData ? (Number(entry?.rejectionQty) || 0).toLocaleString() : '-'}
                            </td>
                            <td className="num-cell accepted">
                              {hasData ? (Number(entry?.acceptedQty) || 0).toLocaleString() : '-'}
                            </td>
                            <td className="num-cell downtime">
                              {hasData ? `${Number(entry?.downtimeMinutes) || 0} min` : '-'}
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
                                <span className="badge badge-warning" title={getDowntimeDescription(entry.primaryDowntimeCode)}>
                                  {entry.primaryDowntimeCode}
                                </span>
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
                                  [{entry.primaryRejectionCode}]
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--clr-text3)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                        {sessions.length > 1 ? `Shift Totals (${sessions.length} Sessions)` : 'Shift Totals'}
                      </td>
                      <td className="num-cell target">{(totalTargetSum || 0).toLocaleString()}</td>
                      <td className="num-cell" style={{ color: 'var(--clr-text)' }}>{(totalProdSum || 0).toLocaleString()}</td>
                      <td className="num-cell rejection">{(totalRejSum || 0).toLocaleString()} ({totalRejRate}%)</td>
                      <td className="num-cell accepted">{(totalAccSum || 0).toLocaleString()}</td>
                      <td className="num-cell downtime">{totalDowntimeSum || 0} min</td>
                      <td colSpan={4} style={{ fontSize: '0.8rem', color: 'var(--clr-text2)' }}>
                        Quality Ratio: <strong>{totalProdSum > 0 ? ((totalAccSum / totalProdSum) * 100).toFixed(1) : 100}%</strong>
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
        </>
      )}
    </div>
  );
}
