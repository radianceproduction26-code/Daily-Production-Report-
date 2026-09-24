// Radiance Polymers - Mould Change Wizard Modal
import React, { useState } from 'react';
import {
  RefreshCw,
  X,
  ArrowRight,
  CheckCircle,
  AlertOctagon,
  Layers,
  Sparkles
} from 'lucide-react';
import TouchNumpad from './TouchNumpad';
import { calculateTheoreticalHourlyTarget } from '../services/validationEngine';
import { useI18n } from '../i18n/I18nContext';
import { getOperators } from '../services/storageService';
import { INITIAL_OPERATORS, SHIFT_HOURS_DEFINITIONS } from '../data/seedData';

export default function MouldChangeModal({
  isOpen,
  onClose,
  activeSession,
  mouldsList = [],
  partsList = [],
  onExecuteMouldChange,
  initialHourIndex = null
}) {
  const { t, language } = useI18n();
  if (!isOpen || !activeSession) return null;

  const maxLoggedHour = (activeSession.entries || []).reduce((max, e) => Math.max(max, Number(e.hourIndex) || 0), 0);
  const defaultEffectiveHour = initialHourIndex || (maxLoggedHour > 0 ? Math.min(12, maxLoggedHour + 1) : 6);
  const [effectiveHour, setEffectiveHour] = useState(defaultEffectiveHour);

  const [endCounter, setEndCounter] = useState(
    activeSession.endCounter ? String(activeSession.endCounter) : String(activeSession.startCounter + 500)
  );
  const [endReason, setEndReason] = useState('Production order target achieved');

  // Filter available parts excluding the currently running part
  const eligibleParts = (partsList || []).filter(p => 
    p.status !== 'inactive' &&
    (p.partCode !== activeSession.partNumber && p.partNumber !== activeSession.partNumber)
  );
  const displayParts = eligibleParts.length > 0 
    ? eligibleParts 
    : (partsList && partsList.length > 0 ? partsList : [
        { id: 'part-01', partNumber: 'F53200000A', partCode: 'F53200000A', partName: 'Front Bezel Enclosure', customer: 'Schneider Electric', standardCycleTimeSeconds: 20.0, cavityCount: 2, rawMaterialGrade: 'PPCP' },
        { id: 'part-02', partNumber: '5036677', partCode: '5036677', partName: 'Terminal Cover Plate', customer: 'Bosch Automotive', standardCycleTimeSeconds: 15.0, cavityCount: 4, rawMaterialGrade: 'Nylon 6' },
        { id: 'part-03', partNumber: '5012394', partCode: '5012394', partName: 'Switch Housing Bracket', customer: 'Tata Motors', standardCycleTimeSeconds: 25.0, cavityCount: 2, rawMaterialGrade: 'ABS' }
      ]);

  const operatorsList = React.useMemo(() => {
    try {
      const stored = getOperators();
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch (e) {}
    return INITIAL_OPERATORS;
  }, []);

  const [selectedPartId, setSelectedPartId] = useState(displayParts[0]?.id || '');
  const selectedPart = displayParts.find(p => p.id === selectedPartId) || displayParts[0] || null;
  const [operatorName, setOperatorName] = useState(
    activeSession.operator_name || activeSession.operatorName || operatorsList[0]?.operatorName || 'Shreyank'
  );

  // Editable Cycle Time state for new tool
  const [cycleTime, setCycleTime] = useState(
    selectedPart?.standardCycleTimeSeconds ? String(selectedPart.standardCycleTimeSeconds) : '20'
  );

  React.useEffect(() => {
    if (selectedPart?.standardCycleTimeSeconds) {
      setCycleTime(String(selectedPart.standardCycleTimeSeconds));
    }
  }, [selectedPart?.id]);

  const activeCycleTime = parseFloat(cycleTime) > 0
    ? parseFloat(cycleTime)
    : (selectedPart?.standardCycleTimeSeconds || 20);

  // Theoretical target for next part/tool with editable cycle time
  const nextTarget = selectedPart && activeCycleTime > 0
    ? calculateTheoreticalHourlyTarget(activeCycleTime, selectedPart.cavityCount)
    : 0;

  // Validation 5: End Counter must be greater than Start Counter
  const isEndCounterValid = Number(endCounter) > Number(activeSession.startCounter);

  const handleConfirmChange = () => {
    if (!isEndCounterValid) {
      alert(`Machine End Counter (${Number(endCounter).toLocaleString()}) must be strictly greater than Start Counter (${Number(activeSession.startCounter).toLocaleString()}).`);
      return;
    }
    if (!selectedPart) {
      alert('Please select a valid new Part Number / Tool for Session ' + (activeSession.sessionSequence + 1));
      return;
    }

    onExecuteMouldChange({
      endCounter: Number(endCounter),
      endReason: endReason.trim(),
      newPart: {
        ...selectedPart,
        standardCycleTimeSeconds: activeCycleTime
      },
      effectiveHourIndex: Number(effectiveHour),
      operator_name: operatorName.trim(),
      operatorName: operatorName.trim(),
      newMould: {
        id: selectedPart.id,
        mouldNumber: selectedPart.partNumber || selectedPart.partCode,
        mouldName: selectedPart.partName,
        standardCycleTimeSeconds: activeCycleTime,
        cavityCount: selectedPart.cavityCount
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '860px', width: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile-optimized Header */}
        <div className="modal-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <RefreshCw size={18} color="var(--amber-primary)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, color: 'var(--clr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Mould / Tool Change
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--amber-primary)', fontWeight: 700 }}>
                Session {activeSession.sessionSequence} ➔ Session {activeSession.sessionSequence + 1}
              </span>
            </div>
          </div>
          <button type="button" className="close-icon-btn" onClick={onClose} style={{ flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '14px 16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Informational Guidance Banner */}
          <div className="validation-banner warning" style={{ margin: 0, padding: '10px 12px', fontSize: '0.78rem' }}>
            <AlertOctagon size={18} style={{ flexShrink: 0 }} />
            <div>
              Closes Session {activeSession.sessionSequence}, stamps end counter, and initializes Session {activeSession.sessionSequence + 1}.
            </div>
          </div>

          {/* Mould Change Effective Hour Selector */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(6, 182, 212, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ color: 'var(--amber-primary)', fontWeight: 800, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} />
                Mould Change Effective Hour
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Starts from selected hour
              </span>
            </div>
            <select
              className="touch-select"
              style={{
                height: '40px',
                fontWeight: 700,
                fontSize: '0.88rem',
                borderColor: 'var(--amber-primary)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                width: '100%'
              }}
              value={effectiveHour}
              onChange={(e) => setEffectiveHour(Number(e.target.value))}
            >
              {SHIFT_HOURS_DEFINITIONS.map(h => (
                <option key={h.index} value={h.index}>
                  Hour {h.index} ({h.label}) {h.index === 6 ? '— After 5 Hours' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Responsive 1-col on Mobile, 2-col on Desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '14px'
          }}>
            {/* Left Box: Closing Current Session */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 800, fontSize: '0.84rem', textTransform: 'uppercase' }}>
                <Layers size={16} />
                <span>1. Close Session {activeSession.sessionSequence}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-surface2)', padding: '6px 10px', borderRadius: '6px' }}>
                <span>Running Mould:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{activeSession.mouldNumber || activeSession.partNumber}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-surface2)', padding: '6px 10px', borderRadius: '6px' }}>
                <span>Start Counter:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>
                  {Number(activeSession.startCounter).toLocaleString()}
                </strong>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  <span>Machine End Counter *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="touch-input"
                  style={{
                    height: '44px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    borderColor: isEndCounterValid ? 'var(--emerald-success)' : 'var(--crimson-defect)',
                    color: '#111827'
                  }}
                  value={endCounter}
                  onChange={(e) => setEndCounter(e.target.value.replace(/\D/g, ''))}
                  placeholder="Final machine counter reading"
                />
                {!isEndCounterValid && (
                  <span style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    End Counter must be &gt; {Number(activeSession.startCounter).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  <span>Reason for Mould Change</span>
                </label>
                <select
                  className="touch-select"
                  style={{ height: '40px', fontSize: '0.84rem' }}
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                >
                  <option value="Production order target achieved">Production order target achieved</option>
                  <option value="Scheduled mould change per plan">Scheduled mould change per plan</option>
                  <option value="Mould breakdown / maintenance required">Mould breakdown / maintenance required</option>
                  <option value="Customer urgent dispatch requirement">Customer urgent dispatch requirement</option>
                  <option value="Trial / Sampling run">Trial / Sampling run</option>
                </select>
              </div>
            </div>

            {/* Right Box: New Part / Tool Selection */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 800, fontSize: '0.84rem', textTransform: 'uppercase' }}>
                  <Sparkles size={16} />
                  <span>2. Select New Mould (Session {activeSession.sessionSequence + 1})</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--clr-text3)', fontWeight: 700 }}>MC03 Moulds</span>
              </div>

              {/* 3 Mapped Mould Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {displayParts.map(p => {
                  const isSelected = p.id === selectedPartId;
                  const pCode = p.partNumber || p.partCode;
                  return (
                    <div
                      key={p.id || pCode}
                      onClick={() => {
                        setSelectedPartId(p.id);
                        if (p.standardCycleTimeSeconds) setCycleTime(String(p.standardCycleTimeSeconds));
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: `1.5px solid ${isSelected ? 'var(--amber-primary)' : 'var(--clr-border)'}`,
                        background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.75rem', color: isSelected ? 'var(--amber-primary)' : 'var(--clr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pCode}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        {p.partName}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: isSelected ? 'var(--amber-primary)' : 'var(--clr-text4)', marginTop: '2px' }}>
                        {isSelected ? '✓ SELECTED' : `${p.cavityCount} Cav`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dropdown fallback selector */}
              <select
                className="touch-select"
                style={{ height: '40px', fontSize: '0.86rem', fontWeight: 700 }}
                value={selectedPartId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setSelectedPartId(pid);
                  const p = displayParts.find(x => x.id === pid);
                  if (p?.standardCycleTimeSeconds) setCycleTime(String(p.standardCycleTimeSeconds));
                }}
              >
                {displayParts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber || p.partCode} — {p.partName} ({p.customer || 'MC03'})
                  </option>
                ))}
              </select>

              {/* Operator Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  <span>Operator Name (Session {activeSession.sessionSequence + 1})</span>
                </label>
                <select
                  className="touch-select"
                  style={{ height: '40px', fontSize: '0.86rem', fontWeight: 600 }}
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                >
                  {operatorsList.map(op => (
                    <option key={op.id || op.employeeCode || op.operatorName} value={op.operatorName}>
                      {op.operatorName} {op.employeeCode ? `(${op.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tool Parameters & Editable Cycle Time */}
              {selectedPart && (
                <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--cyan-border)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--cyan-primary)', fontWeight: 800 }}>
                      Parameters ({selectedPart.partNumber || selectedPart.partCode})
                    </span>
                    <span className="badge-tag shift" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {selectedPart.rawMaterialGrade || 'PPCP'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '6px', border: '1.5px solid var(--cyan-primary)', padding: '2px 3px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--cyan-primary)', fontWeight: 800 }}>Cycle (s) ✏️</div>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="999"
                        value={cycleTime}
                        onChange={(e) => setCycleTime(e.target.value)}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          border: 'none',
                          background: 'transparent',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          color: 'var(--amber-warning)',
                          outline: 'none'
                        }}
                        title="Editable cycle time in seconds"
                        required
                      />
                    </div>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '2px 3px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Cavities</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--cyan-primary)' }}>{selectedPart.cavityCount} Cav</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '2px 3px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Part Wt</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem' }}>{selectedPart.partWeightGrams}g</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '2px 3px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--cyan-primary)', fontWeight: 800 }}>Target/hr</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.86rem', color: 'var(--cyan-primary)' }}>{nextTarget} pcs</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-optimized Footer */}
        <div className="modal-footer" style={{
          padding: '10px 16px',
          display: 'flex',
          gap: '10px',
          background: 'var(--bg-surface2)',
          borderTop: '1px solid var(--clr-border)'
        }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: '44px', padding: '0 16px', fontWeight: 700, fontSize: '0.84rem' }}
            onClick={onClose}
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              flex: 1,
              height: '44px',
              padding: '0 16px',
              background: isEndCounterValid ? 'var(--amber-primary)' : 'var(--clr-border)',
              borderColor: isEndCounterValid ? 'var(--amber-primary)' : 'var(--clr-border)',
              color: '#111827',
              fontWeight: 800,
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleConfirmChange}
            disabled={!isEndCounterValid}
          >
            <ArrowRight size={17} />
            <span>Confirm Mould Change (S{activeSession.sessionSequence + 1})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
