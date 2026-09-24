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
  onCreateShift,
  initialMachineNumber = 'MC03'
}) {
  const { t, language } = useI18n();
  if (!isOpen) return null;

  // Selected Machine: MC03, MC04, MC05, MC06, etc.
  const [selectedMachineNumber, setSelectedMachineNumber] = useState(initialMachineNumber || 'MC03');

  React.useEffect(() => {
    if (initialMachineNumber) {
      setSelectedMachineNumber(initialMachineNumber);
    }
  }, [initialMachineNumber, isOpen]);

  const selectedMachine = useMemo(() => {
    const found = machinesList.find(m => (m.machineNumber || m.machineCode) === selectedMachineNumber);
    if (found) return found;
    return {
      id: `m-${(selectedMachineNumber || 'mc03').toLowerCase()}`,
      machineNumber: selectedMachineNumber || 'MC03',
      machineName: selectedMachineNumber === 'MC04' ? 'Milacron 350T' :
                   selectedMachineNumber === 'MC05' ? 'Milacron 250T' :
                   selectedMachineNumber === 'MC06' ? 'Milacron 180T' : 'Milacron 450T',
      capacityTon: selectedMachineNumber === 'MC04' ? 350 : selectedMachineNumber === 'MC05' ? 250 : selectedMachineNumber === 'MC06' ? 180 : 450,
      tonnage: selectedMachineNumber === 'MC04' ? 350 : selectedMachineNumber === 'MC05' ? 250 : selectedMachineNumber === 'MC06' ? 180 : 450,
      status: 'active'
    };
  }, [machinesList, selectedMachineNumber]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('Shift A');
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

  // Available parts across all machines
  const effectivePartsList = useMemo(() => {
    if (partsList && partsList.length > 0) return partsList;
    return [
      { id: 'part-01', partNumber: 'F53200000A', partCode: 'F53200000A', partName: 'Front Bezel Enclosure', customer: 'Schneider Electric', standardCycleTimeSeconds: 20.0, cavityCount: 2, rawMaterialGrade: 'PPCP' },
      { id: 'part-02', partNumber: '5036677', partCode: '5036677', partName: 'Terminal Cover Plate', customer: 'Bosch Automotive', standardCycleTimeSeconds: 15.0, cavityCount: 4, rawMaterialGrade: 'Nylon 6' },
      { id: 'part-03', partNumber: '5012394', partCode: '5012394', partName: 'Switch Housing Bracket', customer: 'Tata Motors', standardCycleTimeSeconds: 25.0, cavityCount: 2, rawMaterialGrade: 'ABS' }
    ];
  }, [partsList]);

  const effectivePartId = partId || effectivePartsList[0]?.id || '';
  const selectedPart = effectivePartsList.find(p => p.id === effectivePartId) || effectivePartsList[0];

  // Standard Cycle Time (Locked) from Part Master
  const standardCycleTime = Number(selectedPart?.standardCycleTimeSeconds) || 20;

  // Actual Cycle Time (Editable by Operator)
  const [actualCycleTime, setActualCycleTime] = useState(
    selectedPart?.actualCycleTimeSeconds ? String(selectedPart.actualCycleTimeSeconds) : String(standardCycleTime)
  );

  React.useEffect(() => {
    if (selectedPart) {
      const std = selectedPart.standardCycleTimeSeconds || 20;
      setActualCycleTime(String(selectedPart.actualCycleTimeSeconds || std));
    }
  }, [selectedPart?.id]);

  const activeCycleTime = parseFloat(actualCycleTime) > 0
    ? parseFloat(actualCycleTime)
    : standardCycleTime;

  // Theoretical Hourly Target calculated from Actual running cycle time: (3600 / Cycle Time) * Cavities
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
        standardCycleTimeSeconds: standardCycleTime,
        actualCycleTimeSeconds: activeCycleTime
      },
      mould: {
        id: selectedPart.id,
        mouldNumber: selectedPart.partNumber || selectedPart.partCode,
        mouldName: selectedPart.partName,
        standardCycleTimeSeconds: standardCycleTime,
        actualCycleTimeSeconds: activeCycleTime,
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
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Start New Shift ({selectedMachine.machineNumber})</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Row 1: Date, Shift, Machine, Supervisor (2x2 grid on mobile) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="touch-input"
                  style={{ minWidth: 0, width: '100%' }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('active_shift')}</label>
                <select
                  className="touch-select"
                  style={{ minWidth: 0, width: '100%', fontWeight: 700 }}
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  <option value="Shift A">Shift A (08:00 - 20:00)</option>
                  <option value="Shift B">Shift B (20:00 - 08:00)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--clr-primary)', fontWeight: 700 }}>
                  <Wrench size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  Machine *
                </label>
                <select
                  className="touch-select"
                  style={{ minWidth: 0, width: '100%', fontWeight: 700 }}
                  value={selectedMachineNumber}
                  onChange={(e) => setSelectedMachineNumber(e.target.value)}
                  required
                >
                  {machinesList.length > 0 ? (
                    machinesList.map(m => (
                      <option key={m.id || m.machineNumber} value={m.machineNumber}>
                        {m.machineNumber} — {m.machineName || `${m.tonnage || m.capacityTon || ''}T`}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="MC03">MC03 — Milacron 450T (Machine No 3)</option>
                      <option value="MC04">MC04 — Milacron 350T (Machine No 4)</option>
                      <option value="MC05">MC05 — Milacron 250T (Machine No 5)</option>
                      <option value="MC06">MC06 — Milacron 180T (Machine No 6)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  <UserCheck size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  Supervisor *
                </label>
                <select
                  className="touch-select"
                  style={{ minWidth: 0, width: '100%' }}
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
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>
                <span>Part Number / Tool Identifier *</span>
              </label>
              <select
                className="touch-select"
                style={{ fontSize: '0.88rem', fontWeight: 700, height: '46px', minWidth: 0, width: '100%' }}
                value={effectivePartId}
                onChange={(e) => setPartId(e.target.value)}
              >
                {effectivePartsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber || p.partCode} — {p.partName} ({p.customer || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Fetched Technical Specifications Card with Dual Cycle Time */}
            {selectedPart && (
              <div style={{ background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-md)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--clr-border)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--clr-primary)' }}>
                    Specs ({selectedPart.partNumber})
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{selectedPart.rawMaterialGrade || 'PPCP'}</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{selectedPart.customer}</span>
                  </div>
                </div>

                {/* 3x2 Grid for Mobile-Optimized Specs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                  {/* Row 1: Physical Specs */}
                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Part Wt</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800 }}>
                      {selectedPart.partWeightGrams}g
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Runner Wt</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800 }}>
                      {selectedPart.runnerWeightGrams}g
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Cavities</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                      {selectedPart.cavityCount} Cav
                    </div>
                  </div>

                  {/* Row 2: Dual Cycle Times & Target */}
                  {/* 1. Standard Cycle Time (LOCKED) */}
                  <div style={{
                    background: '#f1f5f9',
                    padding: '4px 4px',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: '0.58rem', color: 'var(--clr-text3)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Lock size={9} /> Std Cycle
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 900, color: 'var(--clr-text2)' }}>
                      {standardCycleTime}s
                    </div>
                    <span className="badge badge-gray" style={{ fontSize: '0.52rem', padding: '0px 3px', lineHeight: 1.2 }}>
                      LOCKED
                    </span>
                  </div>

                  {/* 2. Actual Cycle Time (EDITABLE) */}
                  <div style={{
                    background: '#fff',
                    padding: '4px 4px',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--clr-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: '0.58rem', color: 'var(--clr-primary)', fontWeight: 800 }}>
                      Act Cycle ✏️
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="999"
                      value={actualCycleTime}
                      onChange={(e) => setActualCycleTime(e.target.value)}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        color: 'var(--clr-primary)',
                        outline: 'none',
                        padding: '1px 0'
                      }}
                      title="Actual running cycle time in seconds"
                      required
                    />
                    <span style={{ fontSize: '0.52rem', color: 'var(--clr-primary)', fontWeight: 700, lineHeight: 1.2 }}>
                      EDITABLE
                    </span>
                  </div>

                  {/* 3. Target Per Hour */}
                  <div style={{
                    background: 'var(--clr-primary-lt)',
                    padding: '4px 4px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid #7dd3fc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ fontSize: '0.58rem', color: 'var(--clr-primary)', fontWeight: 800 }}>
                      Target/Hr
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 900, color: 'var(--clr-primary)' }}>
                      {targetPerHour}
                    </div>
                    <span style={{ fontSize: '0.52rem', color: 'var(--clr-primary)', fontWeight: 700, lineHeight: 1.2 }}>
                      pcs/hr
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Operator & Start Counter (2-col on mobile) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>
                  <UserCheck size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  <span>Operator Name *</span>
                </label>
                <select
                  className="touch-select"
                  style={{
                    borderColor: 'var(--clr-primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    height: '46px',
                    background: 'var(--bg-surface)',
                    minWidth: 0,
                    width: '100%'
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

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('start_counter')} *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="touch-input"
                  style={{ minWidth: 0, width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: 700 }}
                  value={startCounter}
                  onChange={(e) => setStartCounter(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 154200"
                  required
                />
              </div>
            </div>

            {/* STEP 3: Production Data Verification Card */}
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--r-md)',
              border: `1px solid ${verification.isReady ? 'var(--clr-success)' : 'var(--clr-error)'}`,
              background: verification.isReady ? 'var(--clr-success-lt)' : 'var(--clr-error-lt)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {verification.isReady ? (
                    <CheckCircle2 size={16} color="var(--clr-success)" />
                  ) : (
                    <AlertTriangle size={16} color="var(--clr-error)" />
                  )}
                  <span style={{
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    color: verification.isReady ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)'
                  }}>
                    {verification.statusText}
                  </span>
                </div>
                <span className={`badge ${verification.isReady ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.62rem' }}>
                  {verification.isReady ? 'PASSED' : 'BLOCKED'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {verification.verifiedFields.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '0.64rem',
                      padding: '3px 6px',
                      borderRadius: 'var(--r-sm)',
                      background: f.passed ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                      border: `1px solid ${f.passed ? 'var(--clr-success)' : 'var(--clr-error)'}`,
                      color: f.passed ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)',
                      fontWeight: 700,
                      textAlign: 'center',
                      flex: '1 1 calc(33.333% - 4px)',
                      minWidth: '85px',
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
