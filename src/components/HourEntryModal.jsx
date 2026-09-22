import React, { useState } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Plus,
  Trash2,
  RefreshCw,
  Check
} from 'lucide-react';
import { validateHourlyEntry, calculateTheoreticalHourlyTarget } from '../services/validationEngine';
import { generateNextRejectionCode, generateNextDowntimeCode } from '../services/storageService';
import { useI18n } from '../i18n/I18nContext';

/* ─── Tiny scoped style helpers ────────────────────────────────── */
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  card: {
    background: 'var(--bg-surface)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '96dvh',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px 20px 0 0',
    overflow: 'hidden',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.25)'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px 12px 16px',
    borderBottom: '1px solid var(--clr-border)',
    flexShrink: 0
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerTitle: { fontSize: '0.95rem', fontWeight: 800, color: 'var(--clr-text)' },
  headerSub: { fontSize: '0.72rem', color: 'var(--clr-text3)', fontWeight: 600, marginTop: '1px' },
  closeBtn: {
    width: '34px', height: '34px', border: 'none',
    background: 'var(--bg-surface2)', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--clr-text2)', flexShrink: 0
  },
  body: {
    padding: '14px 16px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  footer: {
    display: 'flex', gap: '10px',
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
    borderTop: '1px solid var(--clr-border)',
    background: 'var(--bg-surface2)',
    flexShrink: 0
  },
  label: {
    display: 'block',
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--clr-text3)',
    marginBottom: '4px'
  },
  input: (extra = {}) => ({
    display: 'block',
    width: '100%',
    height: '44px',
    padding: '0 12px',
    border: '1.5px solid var(--clr-border-md)',
    borderRadius: '8px',
    background: 'var(--bg-surface)',
    color: 'var(--clr-text)',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'var(--font)',
    outline: 'none',
    boxSizing: 'border-box',
    ...extra
  }),
  select: (extra = {}) => ({
    display: 'block',
    width: '100%',
    height: '44px',
    padding: '0 12px',
    border: '1.5px solid var(--clr-border-md)',
    borderRadius: '8px',
    background: 'var(--bg-surface)',
    color: 'var(--clr-text)',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'var(--font)',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    ...extra
  }),
  hint: (color = 'var(--clr-text3)') => ({
    fontSize: '0.68rem', color, marginTop: '3px', lineHeight: 1.3
  }),
  sectionBox: (borderColor, bgColor) => ({
    border: `1.5px solid ${borderColor}`,
    borderRadius: '10px',
    background: bgColor,
    padding: '12px 12px 10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }),
  sectionLabel: (color) => ({
    fontSize: '0.72rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color
  }),
  btnPrimary: {
    flex: 1, height: '48px', border: 'none', borderRadius: '10px',
    background: 'var(--clr-primary)', color: '#fff',
    fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
  },
  btnOutline: {
    height: '48px', minWidth: '80px', border: '1.5px solid var(--clr-border-md)',
    borderRadius: '10px', background: 'transparent',
    color: 'var(--clr-text2)',
    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
  }
};

export default function HourEntryModal({
  isOpen, onClose, hourDef, existingEntry = null,
  activeSession, rejectionCodes = [], downtimeCodes = [],
  onSave, currentUser, onAddDynamicRejection, onAddDynamicDowntime,
  partsList = [], mouldsList = [], onExecuteMouldChange, activeReport
}) {
  const { language, getRejectionDescription, getDowntimeDescription } = useI18n();

  if (!isOpen || !activeSession) return null;

  // Track session and mould change inline state
  const [currentSession, setCurrentSession] = useState(activeSession);
  const [showMouldPicker, setShowMouldPicker] = useState(false);
  const [mouldChangeNotice, setMouldChangeNotice] = useState(null);

  React.useEffect(() => {
    setCurrentSession(activeSession);
  }, [activeSession?.id, activeSession?.mouldNumber]);

  // 3 pilot moulds assigned to MC03
  const pilotPartCodes = ['F53200000A', '5036677', '5012394'];
  const availableMoulds = React.useMemo(() => {
    const list = (partsList && partsList.length > 0) ? partsList : [];
    const filtered = list.filter(p => pilotPartCodes.includes(p.partCode || p.partNumber));
    if (filtered.length > 0) return filtered;
    return [
      { id: 'part-mc03-1', partNumber: 'F53200000A', partCode: 'F53200000A', partName: 'CAP OIL FILLER', customer: 'Maruti Suzuki', standardCycleTimeSeconds: 20, cavityCount: 2, rawMaterialGrade: 'PPCP' },
      { id: 'part-mc03-2', partNumber: '5036677', partCode: '5036677', partName: 'BEARING HOUSING', customer: 'Tata Motors', standardCycleTimeSeconds: 15, cavityCount: 4, rawMaterialGrade: 'PPCP' },
      { id: 'part-mc03-3', partNumber: '5012394', partCode: '5012394', partName: 'FLANGE COMPONENT', customer: 'Mahindra', standardCycleTimeSeconds: 18, cavityCount: 2, rawMaterialGrade: 'PPCP' }
    ];
  }, [partsList]);

  // Default picked mould to one of the other 2 moulds
  const otherMoulds = availableMoulds.filter(m => (m.partNumber || m.partCode) !== (currentSession?.partNumber || currentSession?.mouldNumber));
  const [pickedMouldId, setPickedMouldId] = useState(() => otherMoulds[0]?.id || availableMoulds[0]?.id);
  const pickedMould = availableMoulds.find(m => m.id === pickedMouldId) || otherMoulds[0] || availableMoulds[0];

  // Editable Cycle Time state for the mould change inside Log Module
  const [changeCycleTime, setChangeCycleTime] = useState(
    pickedMould?.standardCycleTimeSeconds ? String(pickedMould.standardCycleTimeSeconds) : '20'
  );

  const handleSelectMould = (m) => {
    setPickedMouldId(m.id);
    setChangeCycleTime(String(m.standardCycleTimeSeconds || 20));
  };

  const activeChangeCycleTime = parseFloat(changeCycleTime) > 0
    ? parseFloat(changeCycleTime)
    : (pickedMould?.standardCycleTimeSeconds || 20);

  const calculatedNewTarget = pickedMould && activeChangeCycleTime > 0
    ? calculateTheoreticalHourlyTarget(activeChangeCycleTime, pickedMould.cavityCount)
    : 0;

  const handleApplyMouldChange = () => {
    if (!onExecuteMouldChange || !pickedMould) return;

    const result = onExecuteMouldChange({
      effectiveHourIndex: hourDef.index,
      newPart: {
        ...pickedMould,
        standardCycleTimeSeconds: activeChangeCycleTime
      },
      newMould: {
        id: pickedMould.id,
        mouldNumber: pickedMould.partNumber || pickedMould.partCode,
        mouldName: pickedMould.partName,
        standardCycleTimeSeconds: activeChangeCycleTime,
        cavityCount: pickedMould.cavityCount
      },
      endCounter: Number(currentSession.endCounter) || Number(currentSession.startCounter) || 0,
      endReason: `Tool changed to ${pickedMould.partNumber} at Hour ${hourDef.index}`
    });

    if (result && result.newSession) {
      setCurrentSession(result.newSession);
    } else {
      setCurrentSession(prev => ({
        ...prev,
        sessionSequence: (prev?.sessionSequence || 1) + 1,
        partNumber: pickedMould.partNumber || pickedMould.partCode,
        mouldNumber: pickedMould.partNumber || pickedMould.partCode,
        partName: pickedMould.partName,
        standardCycleTimeSeconds: activeChangeCycleTime,
        cavityCount: pickedMould.cavityCount,
        theoreticalHourlyTarget: calculatedNewTarget
      }));
    }

    setMouldChangeNotice(`Mould changed to ${pickedMould.partNumber} (${pickedMould.partName}). Remaining hours (H${hourDef.index}–H12) adjusted to target ${calculatedNewTarget} pcs/hr!`);
    setShowMouldPicker(false);
  };

  const theoreticalTarget = currentSession?.theoreticalHourlyTarget || activeSession.theoreticalHourlyTarget;

  // Gross Production state
  const [productionQty, setProductionQty] = useState(
    existingEntry ? String(existingEntry.productionQty) : ''
  );

  // Dynamic Rejection Rows: array of { id, code, qty }
  const [rejectionRows, setRejectionRows] = useState(() => {
    if (existingEntry?.rejectionBreakdown && existingEntry.rejectionBreakdown.length > 0) {
      return existingEntry.rejectionBreakdown.map((r, i) => ({
        id: 'rej-' + i + '-' + Date.now(),
        code: r.code || 'A',
        qty: String(r.qty || r.quantity || 0)
      }));
    }
    if (existingEntry && Number(existingEntry.rejectionQty) > 0) {
      return [{
        id: 'rej-0-' + Date.now(),
        code: existingEntry.primaryRejectionCode || rejectionCodes[0]?.code || 'A',
        qty: String(existingEntry.rejectionQty)
      }];
    }
    return [];
  });

  // Dynamic Downtime Rows: array of { id, code, minutes }
  const [downtimeRows, setDowntimeRows] = useState(() => {
    if (existingEntry?.downtimeBreakdown && existingEntry.downtimeBreakdown.length > 0) {
      return existingEntry.downtimeBreakdown.map((d, i) => ({
        id: 'dt-' + i + '-' + Date.now(),
        code: d.code || '',
        minutes: String(d.minutes || 0)
      }));
    }
    if (existingEntry && Number(existingEntry.downtimeMinutes) > 0) {
      return [{
        id: 'dt-0-' + Date.now(),
        code: existingEntry.primaryDowntimeCode || downtimeCodes[0]?.code || '',
        minutes: String(existingEntry.downtimeMinutes)
      }];
    }
    return [];
  });

  const [remarks,    setRemarks]    = useState(existingEntry?.remarks || '');
  const [editReason, setEditReason] = useState('');

  // Dynamic code creation states
  const [isAddingRejection,   setIsAddingRejection]   = useState(false);
  const [newRejectionDesc,    setNewRejectionDesc]    = useState('');
  const [isAddingDowntime,    setIsAddingDowntime]    = useState(false);
  const [newDowntimeDesc,     setNewDowntimeDesc]     = useState('');
  const [newDowntimeCategory, setNewDowntimeCategory] = useState('Machine Related');

  const canCreateCodes = ['supervisor','production_manager','admin'].includes(currentUser?.role);

  // Computed totals from dynamic rows
  const totalRejectionQty = rejectionRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const totalDowntimeMinutes = downtimeRows.reduce((sum, d) => sum + (Number(d.minutes) || 0), 0);

  // Row validation checks
  const unselectedDowntimeRow = downtimeRows.find(d => Number(d.minutes) > 0 && !d.code);
  const unselectedRejectionRow = rejectionRows.find(r => Number(r.qty) > 0 && !r.code);

  // Validate hourly entry with strict 60-min balance check and 5-min buffer
  const validationResult = validateHourlyEntry({
    productionQty:       Number(productionQty)   || 0,
    rejectionQty:        totalRejectionQty,
    downtimeMinutes:     totalDowntimeMinutes,
    cycleTimeSeconds:    activeSession.standardCycleTimeSeconds,
    cavityCount:         activeSession.cavityCount,
    isSessionClosed:     activeSession.status === 'closed',
    enforceTimeBalance:  true,
    bufferMinutes:       5,
    lang: language
  });

  // Rejection row handlers
  const addRejectionRow = () => {
    const used = rejectionRows.map(r => r.code);
    const nextCode = rejectionCodes.find(c => c.isActive && !used.includes(c.code))?.code || rejectionCodes[0]?.code || 'A';
    setRejectionRows(rows => [
      ...rows,
      { id: 'rej-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), code: nextCode, qty: '' }
    ]);
  };

  const updateRejectionRow = (id, field, value) => {
    setRejectionRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRejectionRow = (id) => {
    setRejectionRows(rows => rows.filter(r => r.id !== id));
  };

  // Downtime row handlers
  const addDowntimeRow = () => {
    const used = downtimeRows.map(d => d.code);
    const nextCode = downtimeCodes.find(d => d.isActive && !used.includes(d.code))?.code || downtimeCodes[0]?.code || '';
    setDowntimeRows(rows => [
      ...rows,
      { id: 'dt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), code: nextCode, minutes: '' }
    ]);
  };

  const updateDowntimeRow = (id, field, value) => {
    setDowntimeRows(rows => rows.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDowntimeRow = (id) => {
    setDowntimeRows(rows => rows.filter(d => d.id !== id));
  };

  const handleCreateRejection = () => {
    if (!newRejectionDesc.trim()) return;
    if (onAddDynamicRejection) {
      const c = onAddDynamicRejection(newRejectionDesc.trim());
      if (c) {
        setRejectionRows(rows => [
          ...rows,
          { id: 'rej-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), code: c.code, qty: '' }
        ]);
        setNewRejectionDesc('');
        setIsAddingRejection(false);
      }
    }
  };

  const handleCreateDowntime = () => {
    if (!newDowntimeDesc.trim()) return;
    if (onAddDynamicDowntime) {
      const c = onAddDynamicDowntime(newDowntimeDesc.trim(), newDowntimeCategory);
      if (c) {
        setDowntimeRows(rows => [
          ...rows,
          { id: 'dt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), code: c.code, minutes: '' }
        ]);
        setNewDowntimeDesc('');
        setIsAddingDowntime(false);
      }
    }
  };

  const isFormSubmittable = validationResult.isValid && !unselectedDowntimeRow && !unselectedRejectionRow;

  const handleSave = () => {
    if (!isFormSubmittable) return;
    if (existingEntry && ['supervisor','production_manager'].includes(currentUser?.role) && !editReason.trim()) {
      alert('Please enter a modification reason for the audit trail.');
      return;
    }

    const activeRejections = rejectionRows
      .filter(r => Number(r.qty) > 0 && r.code)
      .map(r => ({
        code: r.code,
        qty: Number(r.qty),
        reason: rejectionCodes.find(c => c.code === r.code)?.description || getRejectionDescription(r.code) || ''
      }));

    const activeDowntimes = downtimeRows
      .filter(d => Number(d.minutes) > 0 && d.code)
      .map(d => ({
        code: d.code,
        minutes: Number(d.minutes),
        reason: downtimeCodes.find(c => c.code === d.code)?.description || getDowntimeDescription(d.code) || ''
      }));

    const primaryRej = activeRejections.length > 0 ? activeRejections[0].code : null;
    const primaryDt = activeDowntimes.length > 0 ? activeDowntimes[0].code : null;

    onSave({
      id:                   existingEntry ? existingEntry.id : 'entry-' + Date.now(),
      hourIndex:            hourDef.index,
      hourInterval:         hourDef.label,
      theoreticalTarget:    Number(theoreticalTarget),
      productionQty:        Number(productionQty)   || 0,
      rejectionQty:         totalRejectionQty,
      acceptedQty:          validationResult.acceptedQty,
      downtimeMinutes:      totalDowntimeMinutes,
      primaryDowntimeCode:  primaryDt,
      primaryRejectionCode: primaryRej,
      remarks:              remarks.trim(),
      rejectionBreakdown:   activeRejections,
      downtimeBreakdown:    activeDowntimes
    }, existingEntry, editReason, currentSession?.id);
    onClose();
  };

  return (
    <div style={S.overlay}>
      <div style={S.card}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <Clock size={18} color="var(--clr-primary)" />
            <div>
              <div style={S.headerTitle}>Hour {hourDef.index} · {hourDef.label}</div>
              <div style={S.headerSub}>
                {currentSession?.mouldNumber || currentSession?.partNumber} · Session {currentSession?.sessionSequence || activeSession.sessionSequence}
              </div>
            </div>
          </div>
          <button style={S.closeBtn} type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── Single "Change Mould" Button Strip ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'var(--bg-surface2)',
          borderBottom: '1px solid var(--clr-border)',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--clr-text)' }}>Mould:</span>
            <span style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--clr-border)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '0.82rem',
              color: 'var(--clr-primary)',
              whiteSpace: 'nowrap'
            }}>
              {currentSession?.mouldNumber || currentSession?.partNumber}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ({currentSession?.standardCycleTimeSeconds}s · {currentSession?.cavityCount} Cav)
            </span>
          </div>

          <button
            type="button"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--amber-primary)',
              background: showMouldPicker ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
              color: 'var(--amber-primary)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0
            }}
            onClick={() => setShowMouldPicker(v => !v)}
          >
            <RefreshCw size={13} />
            <span>{showMouldPicker ? 'Hide Moulds' : 'Change Mould'}</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>

          {/* Mould Change Notification */}
          {mouldChangeNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#15803d',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <span>✓ {mouldChangeNotice}</span>
              <button type="button" onClick={() => setMouldChangeNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Inline Mould Selection Panel (Machine MC03 - 3 Moulds Assigned) */}
          {showMouldPicker && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(6, 182, 212, 0.08))',
              border: '1.5px solid var(--amber-primary)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={15} />
                  Change Mould at Hour {hourDef.index} (MC03 Mapped Moulds)
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--clr-text3)', fontWeight: 600 }}>
                  3 Moulds Assigned
                </span>
              </div>

              {/* 3 Mould Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {availableMoulds.map(m => {
                  const isCurrentRunning = (m.partNumber || m.partCode) === (currentSession?.partNumber || currentSession?.mouldNumber);
                  const isSelected = m.id === pickedMould?.id;
                  return (
                    <div
                      key={m.id || m.partNumber}
                      onClick={() => handleSelectMould(m)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: `1.5px solid ${isSelected ? 'var(--amber-primary)' : isCurrentRunning ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                        background: isSelected ? 'rgba(245, 158, 11, 0.15)' : isCurrentRunning ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.78rem', color: isSelected ? 'var(--amber-primary)' : 'var(--clr-text)' }}>
                        {m.partNumber || m.partCode}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--clr-text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        {m.partName}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: isCurrentRunning ? 'var(--clr-primary)' : isSelected ? 'var(--amber-primary)' : 'var(--clr-text4)', marginTop: '2px' }}>
                        {isCurrentRunning ? '● RUNNING' : isSelected ? '✓ SELECTED' : `${m.cavityCount} Cav`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Editable Cycle Time and Live Target Calculation */}
              {pickedMould && (
                <div style={{
                  background: 'var(--bg-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--clr-border)',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1.1fr',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  {/* Editable Cycle Time */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--clr-primary)', marginBottom: '2px' }}>
                      Cycle Time (sec) ✏️
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="999"
                      value={changeCycleTime}
                      onChange={e => setChangeCycleTime(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 8px',
                        border: '1.5px solid var(--clr-primary)',
                        borderRadius: '6px',
                        background: 'var(--bg-surface2)',
                        color: 'var(--clr-warning)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      title="Editable cycle time in seconds"
                    />
                  </div>

                  {/* Cavities */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Cavities</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                      {pickedMould.cavityCount} Cav
                    </div>
                  </div>

                  {/* Recalculated Target */}
                  <div style={{ textAlign: 'center', background: 'var(--clr-primary-lt)', borderRadius: '6px', padding: '4px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-primary)', fontWeight: 800 }}>Adjusted Target</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 900, color: 'var(--clr-primary)' }}>
                      {calculatedNewTarget} /hr
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  height: '40px',
                  background: 'var(--amber-primary)',
                  borderColor: 'var(--amber-primary)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={handleApplyMouldChange}
              >
                <RefreshCw size={15} />
                <span>Confirm &amp; Adjust Remaining Hours (H{hourDef.index}–H12)</span>
              </button>
            </div>
          )}

          {/* Validation errors */}
          {validationResult.errors.map((err, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '10px 12px', borderRadius: '8px',
              background: '#fef2f2', border: '1px solid #fca5a5'
            }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, lineHeight: 1.4 }}>{err}</span>
            </div>
          ))}

          {unselectedDowntimeRow && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '8px',
              background: '#fff7ed', border: '1px solid #fed7aa'
            }}>
              <AlertTriangle size={15} color="#ea580c" />
              <span style={{ fontSize: '0.78rem', color: '#ea580c', fontWeight: 600 }}>
                Please select a reason for each downtime entry.
              </span>
            </div>
          )}

          {unselectedRejectionRow && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '8px',
              background: '#fff7ed', border: '1px solid #fca5a5'
            }}>
              <AlertTriangle size={15} color="#dc2626" />
              <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                Please select a reason for each rejection entry.
              </span>
            </div>
          )}

          {/* ── Summary row: Target & Accepted ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={S.label}>Target / hr</div>
              <div style={S.input({ background: 'var(--bg-surface2)', color: 'var(--clr-text3)', display: 'flex', alignItems: 'center', fontWeight: 700 })}>
                {theoreticalTarget} pcs
              </div>
            </div>
            <div>
              <div style={S.label}>Accepted (auto)</div>
              <div style={S.input({ background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', fontWeight: 800 })}>
                {validationResult.acceptedQty} pcs
              </div>
            </div>
          </div>

          {/* ── 60-Minute Hourly Balance Meter ── */}
          <div style={{
            border: `1.5px solid ${validationResult.isTimeBalanced ? '#86efac' : '#fed7aa'}`,
            background: validationResult.isTimeBalanced ? '#f0fdf4' : '#fffbeb',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: validationResult.isTimeBalanced ? '#166534' : '#9a3412' }}>
                ⏱ 60-Min Hourly Time Balance
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: validationResult.isTimeBalanced ? '#15803d' : '#c2410c'
              }}>
                {validationResult.totalAccountedMinutes} / 60 min {validationResult.isTimeBalanced ? '✓ Balanced' : `(${validationResult.unaccountedMinutes}m missing)`}
              </span>
            </div>

            {/* Split progress bar */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{
                width: `${Math.min(100, (validationResult.productionMinutes / 60) * 100)}%`,
                background: '#2563eb',
                transition: 'width 0.2s'
              }} title={`Production: ${validationResult.productionMinutes} min`} />
              <div style={{
                width: `${Math.min(100 - (validationResult.productionMinutes / 60) * 100, (totalDowntimeMinutes / 60) * 100)}%`,
                background: '#ea580c',
                transition: 'width 0.2s'
              }} title={`Downtime: ${totalDowntimeMinutes} min`} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--clr-text3)', fontWeight: 600 }}>
              <span>🔵 Prod Time: <strong>{validationResult.productionMinutes}m</strong></span>
              <span>🟠 Downtime: <strong>{totalDowntimeMinutes}m</strong></span>
              <span>Buffer: <strong>60 ± 5 min</strong></span>
            </div>
          </div>

          {/* ── Gross Production ── */}
          <div>
            <div style={S.label}>Gross Production *</div>
            <input
              type="number"
              inputMode="numeric"
              style={S.input({ fontSize: '1.15rem', fontWeight: 800 })}
              value={productionQty}
              onChange={e => setProductionQty(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter pieces produced"
              autoFocus
            />
            <div style={S.hint()}>
              Max possible: {validationResult.maxAllowed} pcs · Equiv runtime: {validationResult.productionMinutes} min
            </div>
          </div>

          {/* ── Rejection block (Multiple Reasons) ── */}
          <div style={S.sectionBox('#fca5a5', '#fff5f5')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={S.sectionLabel('#dc2626')}>
                🔴 Rejection ({totalRejectionQty} pcs)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {canCreateCodes && (
                  <button type="button" onClick={() => setIsAddingRejection(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: 'transparent', border: '1px solid #fca5a5',
                    color: '#dc2626', borderRadius: '5px',
                    padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                  }}>
                    <PlusCircle size={11} />
                    {isAddingRejection ? 'Cancel' : 'New Code'}
                  </button>
                )}
                <button type="button" onClick={addRejectionRow} style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  background: '#fee2e2', border: '1px solid #fca5a5',
                  color: '#dc2626', borderRadius: '5px',
                  padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                }}>
                  <Plus size={11} />
                  Add Reason
                </button>
              </div>
            </div>

            {/* Modal for adding dynamic rejection code */}
            {isAddingRejection && (
              <div style={{ background: '#fee2e2', border: '1px dashed #ef4444', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700, marginBottom: '6px' }}>
                  New code: <strong>{generateNextRejectionCode(rejectionCodes)}</strong>
                </div>
                <input
                  type="text"
                  style={S.input({ height: '38px', borderColor: '#ef4444', marginBottom: '8px', fontSize: '0.85rem' })}
                  value={newRejectionDesc}
                  onChange={e => setNewRejectionDesc(e.target.value)}
                  placeholder="e.g. Warping, Short Gate"
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsAddingRejection(false)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreateRejection}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Save &amp; Add
                  </button>
                </div>
              </div>
            )}

            {/* List of Rejection Rows */}
            {rejectionRows.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px dashed #fca5a5' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--clr-text3)', fontWeight: 600 }}>No rejections this hour (0 pcs)</span>
                <button type="button" onClick={addRejectionRow} style={{
                  background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <Plus size={13} /> Add Rejection
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rejectionRows.map((row) => (
                  <div key={row.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      style={S.select({ flex: 1, height: '40px', fontSize: '0.8rem', padding: '0 8px', borderColor: '#fca5a5' })}
                      value={row.code}
                      onChange={e => updateRejectionRow(row.id, 'code', e.target.value)}
                    >
                      {rejectionCodes.filter(c => c.isActive).map(c => (
                        <option key={c.code} value={c.code}>
                          [{c.code}] {c.description || getRejectionDescription(c.code)}
                        </option>
                      ))}
                    </select>
                    <div style={{ position: 'relative', width: '90px', flexShrink: 0 }}>
                      <input
                        type="number"
                        inputMode="numeric"
                        style={S.input({ height: '40px', paddingRight: '28px', fontSize: '0.9rem', textAlign: 'right', borderColor: '#fca5a5', color: '#dc2626' })}
                        value={row.qty}
                        onChange={e => updateRejectionRow(row.id, 'qty', e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#dc2626', pointerEvents: 'none', fontWeight: 600 }}>
                        pcs
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRejectionRow(row.id)}
                      title="Remove this reason"
                      style={{ width: '36px', height: '40px', background: '#fee2e2', border: 'none', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>
                    Total Rejected: {totalRejectionQty} pcs
                  </span>
                  <button type="button" onClick={addRejectionRow} style={{
                    background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                  }}>
                    <Plus size={12} /> Add another reason
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Downtime block (Multiple Reasons) ── */}
          <div style={S.sectionBox('#fed7aa', '#fffbf5')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={S.sectionLabel('#ea580c')}>
                ⏱ Downtime ({totalDowntimeMinutes} min)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {canCreateCodes && (
                  <button type="button" onClick={() => setIsAddingDowntime(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: 'transparent', border: '1px solid #fed7aa',
                    color: '#ea580c', borderRadius: '5px',
                    padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                  }}>
                    <PlusCircle size={11} />
                    {isAddingDowntime ? 'Cancel' : 'New Code'}
                  </button>
                )}
                <button type="button" onClick={addDowntimeRow} style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  background: '#ffedd5', border: '1px solid #fed7aa',
                  color: '#ea580c', borderRadius: '5px',
                  padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                }}>
                  <Plus size={11} />
                  Add Reason
                </button>
              </div>
            </div>

            {/* Modal for adding dynamic downtime code */}
            {isAddingDowntime && (
              <div style={{ background: '#ffedd5', border: '1px dashed #fb923c', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 700, marginBottom: '6px' }}>
                  New code: <strong>{generateNextDowntimeCode(downtimeCodes)}</strong>
                </div>
                <select style={S.select({ height: '38px', borderColor: '#fb923c', marginBottom: '8px', fontSize: '0.82rem' })}
                  value={newDowntimeCategory} onChange={e => setNewDowntimeCategory(e.target.value)}>
                  <option value="Machine Related">Machine Related</option>
                  <option value="Tool / Part Related">Tool / Part Related</option>
                  <option value="Material Related">Material Related</option>
                  <option value="Utility Related">Utility Related</option>
                  <option value="Process Related">Process Related</option>
                  <option value="Manpower Related">Manpower Related</option>
                  <option value="Others">Other</option>
                </select>
                <input
                  type="text"
                  style={S.input({ height: '38px', borderColor: '#fb923c', marginBottom: '8px', fontSize: '0.82rem' })}
                  value={newDowntimeDesc}
                  onChange={e => setNewDowntimeDesc(e.target.value)}
                  placeholder="e.g. Hydraulic Oil Leakage"
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsAddingDowntime(false)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fed7aa', background: 'transparent', color: '#ea580c', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreateDowntime}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#ea580c', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Save &amp; Add
                  </button>
                </div>
              </div>
            )}

            {/* List of Downtime Rows */}
            {downtimeRows.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px dashed #fed7aa' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--clr-text3)', fontWeight: 600 }}>0 min downtime (Machine ran full hour)</span>
                <button type="button" onClick={addDowntimeRow} style={{
                  background: 'transparent', border: 'none', color: '#ea580c', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <Plus size={13} /> Add Downtime
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {downtimeRows.map((row) => (
                  <div key={row.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      style={S.select({ flex: 1, height: '40px', fontSize: '0.8rem', padding: '0 8px', borderColor: '#fed7aa' })}
                      value={row.code}
                      onChange={e => updateDowntimeRow(row.id, 'code', e.target.value)}
                    >
                      <option value="">— Select downtime reason —</option>
                      {downtimeCodes.filter(d => d.isActive).map(d => (
                        <option key={d.code} value={d.code}>
                          [{d.code}] {d.description || getDowntimeDescription(d.code)}
                        </option>
                      ))}
                    </select>
                    <div style={{ position: 'relative', width: '90px', flexShrink: 0 }}>
                      <input
                        type="number"
                        inputMode="numeric"
                        style={S.input({ height: '40px', paddingRight: '28px', fontSize: '0.9rem', textAlign: 'right', borderColor: '#fed7aa', color: '#ea580c' })}
                        value={row.minutes}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '');
                          updateDowntimeRow(row.id, 'minutes', Number(v) > 60 ? '60' : v);
                        }}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#ea580c', pointerEvents: 'none', fontWeight: 600 }}>
                        min
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDowntimeRow(row.id)}
                      title="Remove this downtime reason"
                      style={{ width: '36px', height: '40px', background: '#ffedd5', border: 'none', borderRadius: '6px', color: '#ea580c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 700 }}>
                    Total Downtime: {totalDowntimeMinutes} min ({Math.max(0, 60 - totalDowntimeMinutes)} min runtime left)
                  </span>
                  <button type="button" onClick={addDowntimeRow} style={{
                    background: 'transparent', border: 'none', color: '#ea580c', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                  }}>
                    <Plus size={12} /> Add another reason
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Remarks ── */}
          <div>
            <div style={S.label}>Remarks (optional)</div>
            <input
              type="text"
              style={S.input({ height: '42px', fontSize: '0.9rem', fontWeight: 500 })}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any observation for this hour…"
            />
          </div>

          {/* ── Supervisor edit reason ── */}
          {existingEntry && ['supervisor','production_manager'].includes(currentUser?.role) && (
            <div>
              <div style={{ ...S.label, color: '#b45309' }}>Reason for Edit (Audit Trail) *</div>
              <input
                type="text"
                style={S.input({ borderColor: '#f59e0b', height: '42px', fontSize: '0.9rem' })}
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="State reason for modifying this entry…"
              />
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={S.footer}>
          <button type="button" style={S.btnOutline} onClick={onClose}>Cancel</button>
          <button
            type="button"
            style={{ ...S.btnPrimary, opacity: isFormSubmittable ? 1 : 0.4 }}
            onClick={handleSave}
            disabled={!isFormSubmittable}
          >
            <CheckCircle2 size={17} />
            <span>{existingEntry ? 'Update Entry' : 'Save Entry'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
