// Radiance Polymers - Production Setup Wizard (Phase 10 MC03 Live Trial Execution Mode)
import React, { useState, useMemo } from 'react';
import {
  Wrench,
  X,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  Lock,
  UserCheck
} from 'lucide-react';
import { calculateTheoreticalHourlyTarget } from '../services/validationEngine';
import { useI18n } from '../i18n/I18nContext';
import { verifyProductionDataReadiness, getOperators } from '../services/storageService';
import { INITIAL_OPERATORS } from '../data/seedData';

export default function ShiftSetupModal({
  isOpen,
  onClose,
  machinesList = [],
  mouldsList = [],
  partsList = [],
  currentUser,
  onCreateShift
}) {
  const { t, language } = useI18n();
  if (!isOpen) return null;

  // STEP 2: Pilot Machine Locked to MC03
  const pilotPartCodes = ['F53200000A', '5036677', '5012394'];
  const pilotMachine = machinesList.find(m => m.machineNumber === 'MC03') || {
    id: 'mc-03',
    machineNumber: 'MC03',
    machineName: 'Milacron 450T',
    capacityTon: 450,
    status: 'active'
  };
  const selectedMachine = pilotMachine;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('Shift 1');
  const [supervisorName, setSupervisorName] = useState(
    currentUser?.fullName?.includes('Akshay') ? 'Mr. Akshay' : 'Mr. Lokesh'
  );

  const operatorsList = useMemo(() => {
    try {
      const stored = getOperators();
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch (e) {}
    return INITIAL_OPERATORS;
  }, []);

  const [partId, setPartId] = useState('');
  const [operatorName, setOperatorName] = useState(() => {
    try {
      const stored = getOperators();
      if (Array.isArray(stored) && stored.length > 0) return stored[0].operatorName;
    } catch (e) {}
    return INITIAL_OPERATORS[0]?.operatorName || 'Shreyank';
  });
  const [startCounter, setStartCounter] = useState('154200');

  // Scoped pilot parts: strictly only parts mapped to MC03 for Live Trial
  const scopedParts = partsList.filter(p => pilotPartCodes.includes(p.partCode || p.partNumber));
  const effectivePartsList = scopedParts.length > 0 ? scopedParts : partsList;

  const effectivePartId = partId || effectivePartsList[0]?.id || '';
  const selectedPart = effectivePartsList.find(p => p.id === effectivePartId) || effectivePartsList[0];

  // Editable Cycle Time state initialized from selected part
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

  // Theoretical Hourly Target: (3600 / Cycle Time) * Cavities
  const targetPerHour = selectedPart && activeCycleTime > 0
    ? calculateTheoreticalHourlyTarget(activeCycleTime, selectedPart.cavityCount)
    : 0;

  // STEP 3: Real-time Pre-Shift Production Data Verification
  const verification = useMemo(() => {
    return verifyProductionDataReadiness({
      machine: selectedMachine,
      part: selectedPart,
      supervisorName
    });
  }, [selectedMachine, selectedPart, supervisorName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!verification.isReady) {
      alert(`Cannot start shift: ${verification.statusText}. Missing: ${verification.missingFields.join(', ')}`);
      return;
    }

    if (!operatorName || !operatorName.trim()) {
      alert('Please enter Machine Operator Name for traceability.');
      return;
    }

    onCreateShift({
      reportDate: date,
      shift,
      machine: selectedMachine,
      operator: { ...currentUser, fullName: operatorName.trim(), name: operatorName.trim() },
      operator_name: operatorName.trim(),
      operatorName: operatorName.trim(),
      supervisorName: supervisorName.trim(),
      supervisorId: supervisorName.includes('Akshay') ? 'u-sup-02' : 'u-sup-01',
      part: {
        ...selectedPart,
        standardCycleTimeSeconds: activeCycleTime
      },
      mould: {
        id: selectedPart.id,
        mouldNumber: selectedPart.partNumber || selectedPart.partCode,
        mouldName: selectedPart.partName,
        standardCycleTimeSeconds: activeCycleTime,
        cavityCount: selectedPart.cavityCount
      },
      startCounter: Number(startCounter) || 0
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={20} color="var(--clr-primary)" />
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Start New Shift (MC03)</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Row 1: Date, Shift, Machine, Supervisor (2x2 grid on mobile) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="touch-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('active_shift')}</label>
                <select
                  className="touch-select"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  <option value="Shift 1">Shift 1 (08:00 - 20:00)</option>
                  <option value="Shift 2">Shift 2 (20:00 - 08:00)</option>
                  <option value="Shift 3">Shift 3 (General / Special)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--clr-primary)' }}>
                  <Lock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  Machine (Locked)
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--clr-primary-lt)',
                  border: '1px solid #7dd3fc',
                  borderRadius: 'var(--r-md)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  color: 'var(--clr-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '46px',
                  boxSizing: 'border-box'
                }}>
                  <span>MC03 (Milacron 450T)</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>
                    LOCKED
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <UserCheck size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  Supervisor *
                </label>
                <select
                  className="touch-select"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  required
                >
                  <option value="Mr. Lokesh">Mr. Lokesh</option>
                  <option value="Mr. Akshay">Mr. Akshay</option>
                </select>
              </div>
            </div>

            {/* Row 2: Part Selection */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>
                <span>Part Number / Tool Identifier *</span>
              </label>
              <select
                className="touch-select"
                style={{ fontSize: '0.95rem', fontWeight: 700, height: '48px' }}
                value={effectivePartId}
                onChange={(e) => setPartId(e.target.value)}
              >
                {scopedParts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber || p.partCode} — {p.partName} ({p.customer})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Fetched Technical Specifications Card */}
            {selectedPart && (
              <div style={{ background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--clr-border)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--clr-primary)' }}>
                    Specs ({selectedPart.partNumber})
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge badge-gray">{selectedPart.rawMaterialGrade || 'PPCP'}</span>
                    <span className="badge badge-primary">{selectedPart.customer}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-text3)' }}>Part Wt</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700 }}>
                      {selectedPart.partWeightGrams}g
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-text3)' }}>Runner Wt</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700 }}>
                      {selectedPart.runnerWeightGrams}g
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '4px 6px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--clr-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-primary)', fontWeight: 800 }}>Cycle Time (s) ✏️</div>
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
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        color: 'var(--clr-warning)',
                        outline: 'none',
                        padding: '1px 0'
                      }}
                      title="Editable cycle time in seconds"
                      required
                    />
                  </div>

                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-text3)' }}>Cavities</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700, color: 'var(--clr-primary)' }}>
                      {selectedPart.cavityCount} Cav
                    </div>
                  </div>

                  <div style={{ background: 'var(--clr-primary-lt)', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid #7dd3fc' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-primary)', fontWeight: 700 }}>Target/Hr</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                      {targetPerHour} pcs
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Operator & Start Counter */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>
                  <UserCheck size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  <span>Operator Name *</span>
                </label>
                <select
                  className="touch-select"
                  style={{
                    borderColor: 'var(--clr-primary)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    height: '46px',
                    background: 'var(--bg-surface)'
                  }}
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  required
                >
                  {operatorsList.map(op => (
                    <option key={op.id || op.employeeCode || op.operatorName} value={op.operatorName}>
                      {op.operatorName} {op.employeeCode ? `(${op.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('start_counter')} *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="touch-input"
                  value={startCounter}
                  onChange={(e) => setStartCounter(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 154200"
                  required
                />
              </div>
            </div>

            {/* STEP 3: Production Data Verification Card */}
            <div style={{
              padding: '12px',
              borderRadius: 'var(--r-md)',
              border: `1px solid ${verification.isReady ? 'var(--clr-success)' : 'var(--clr-error)'}`,
              background: verification.isReady ? 'var(--clr-success-lt)' : 'var(--clr-error-lt)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {verification.isReady ? (
                    <CheckCircle2 size={18} color="var(--clr-success)" />
                  ) : (
                    <AlertTriangle size={18} color="var(--clr-error)" />
                  )}
                  <span style={{
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: verification.isReady ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)'
                  }}>
                    {verification.statusText}
                  </span>
                </div>
                <span className={`badge ${verification.isReady ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                  {verification.isReady ? 'PASSED' : 'BLOCKED'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '4px' }}>
                {verification.verifiedFields.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '0.68rem',
                      padding: '3px 4px',
                      borderRadius: 'var(--r-sm)',
                      background: f.passed ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                      border: `1px solid ${f.passed ? 'var(--clr-success)' : 'var(--clr-error)'}`,
                      color: f.passed ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)',
                      fontWeight: 700,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {f.passed ? '✓' : '✗'} {f.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={!verification.isReady}
            >
              <ArrowRight size={18} />
              <span>{verification.isReady ? 'Start Shift' : 'Data Required'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
