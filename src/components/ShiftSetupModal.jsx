// Radiance Polymers - Production Setup Wizard (Multi-Machine Shift Start Module)
import React, { useState, useMemo, useEffect } from 'react';
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
import {
  verifyProductionDataReadiness,
  getOperators,
  getMachinePartMappings
} from '../services/storageService';
import { INITIAL_OPERATORS, INITIAL_PARTS, INITIAL_MACHINE_PART_MAPPINGS } from '../data/seedData';

export default function ShiftSetupModal({
  isOpen,
  onClose,
  machinesList = [],
  mouldsList = [],
  partsList = [],
  mappingsList = [],
  currentUser,
  onCreateShift,
  initialMachineNumber = 'MC03'
}) {
  const { t, language } = useI18n();
  if (!isOpen) return null;

  // Selected Machine: MC03, MC04, MC05, MC06, etc.
  const [selectedMachineNumber, setSelectedMachineNumber] = useState(initialMachineNumber || 'MC03');

  useEffect(() => {
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

  const [operatorName, setOperatorName] = useState(() => {
    try {
      const stored = getOperators();
      if (Array.isArray(stored) && stored.length > 0) return stored[0].operatorName;
    } catch (e) {}
    return INITIAL_OPERATORS[0]?.operatorName || 'Shreyank';
  });
  const [startCounter, setStartCounter] = useState('154200');

  // Master Parts List (Guaranteed baseline 3 parts + any uploaded parts)
  const effectivePartsList = useMemo(() => {
    if (partsList && partsList.length > 0) {
      // Merge with initial parts to ensure initial 3 are never missing
      const pMap = new Map();
      INITIAL_PARTS.forEach(p => {
        const code = (p.partNumber || p.partCode || '').trim().toUpperCase();
        if (code) pMap.set(code, p);
      });
      partsList.forEach(p => {
        const code = (p.partNumber || p.partCode || '').trim().toUpperCase();
        if (code) pMap.set(code, p);
      });
      return Array.from(pMap.values());
    }
    return INITIAL_PARTS;
  }, [partsList]);

  // Active Machine-Part Mappings (from props or storage or seed)
  const effectiveMappings = useMemo(() => {
    if (mappingsList && mappingsList.length > 0) return mappingsList;
    try {
      const stored = getMachinePartMappings();
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch (e) {}
    return INITIAL_MACHINE_PART_MAPPINGS;
  }, [mappingsList]);

  // Filter parts strictly for the selected machine based on sheet mappings
  const machineLinkedParts = useMemo(() => {
    const selMc = (selectedMachineNumber || 'MC03').trim().toUpperCase();
    const linkedCodes = new Set();

    effectiveMappings.forEach(m => {
      const mcNum = (m.machineCode || m.machineNumber || '').trim().toUpperCase();
      if (mcNum === selMc && m.approvedToRun !== false && m.isApproved !== false && m.status !== 'inactive') {
        const pCode = (m.partCode || m.partNumber || '').trim().toUpperCase();
        if (pCode) linkedCodes.add(pCode);
      }
    });

    if (linkedCodes.size > 0) {
      const filtered = effectivePartsList.filter(p => {
        const code = (p.partNumber || p.partCode || '').trim().toUpperCase();
        return linkedCodes.has(code);
      });
      if (filtered.length > 0) return filtered;
    }

    // Graceful fallback if no explicit mappings yet configured for this machine
    return effectivePartsList;
  }, [selectedMachineNumber, effectiveMappings, effectivePartsList]);

  const [partId, setPartId] = useState('');

  // Automatically switch selected part when machine changes to stay within linked moulds
  useEffect(() => {
    if (machineLinkedParts.length > 0) {
      const exists = machineLinkedParts.some(p => p.id === partId || p.partNumber === partId || p.partCode === partId);
      if (!exists) {
        setPartId(machineLinkedParts[0].id || machineLinkedParts[0].partNumber);
      }
    }
  }, [selectedMachineNumber, machineLinkedParts]);

  const effectivePartId = partId || machineLinkedParts[0]?.id || '';
  const selectedPart = machineLinkedParts.find(p => p.id === effectivePartId || p.partNumber === effectivePartId || p.partCode === effectivePartId) || machineLinkedParts[0];

  // Standard Cycle Time (Locked) from Part Master
  const standardCycleTime = Number(selectedPart?.standardCycleTimeSeconds) || 20;

  // Actual Cycle Time (Editable by Operator)
  const [actualCycleTime, setActualCycleTime] = useState(
    selectedPart?.actualCycleTimeSeconds ? String(selectedPart.actualCycleTimeSeconds) : String(standardCycleTime)
  );

  useEffect(() => {
    if (selectedPart) {
      const std = selectedPart.standardCycleTimeSeconds || 20;
      setActualCycleTime(String(selectedPart.actualCycleTimeSeconds || std));
    }
  }, [selectedPart?.id, selectedPart?.partNumber]);

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
      machineNumber: selectedMachine.machineNumber,
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
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="modal-card"
        style={{
          background: 'var(--bg-surface)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--clr-border)',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--clr-primary-lt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Wrench size={18} color="var(--clr-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, color: 'var(--clr-text)' }}>
                Start New Shift ({selectedMachine.machineNumber})
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', fontWeight: 600 }}>
                {selectedMachine.machineName || `${selectedMachine.tonnage || 350}T`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--clr-text2)',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-body"
            style={{
              padding: '14px 16px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Grid 1: Machine, Shift, Date, Supervisor (2x2 grid with minmax(0, 1fr) so no boxes overlap) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: '10px',
                boxSizing: 'border-box'
              }}
            >
              {/* Machine Selector */}
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ color: 'var(--clr-primary)', fontWeight: 800, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 0 4px 0' }}>
                  <Wrench size={12} />
                  <span>Machine *</span>
                </label>
                <select
                  className="touch-select"
                  style={{
                    minWidth: 0,
                    width: '100%',
                    height: '42px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    padding: '0 8px',
                    border: '1.5px solid var(--clr-primary)',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)'
                  }}
                  value={selectedMachineNumber}
                  onChange={(e) => setSelectedMachineNumber(e.target.value)}
                  required
                >
                  {machinesList.length > 0 ? (
                    machinesList.map(m => (
                      <option key={m.id || m.machineNumber} value={m.machineNumber}>
                        {m.machineNumber} ({m.machineName || `${m.tonnage || 350}T`})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="MC03">MC03 (Milacron 450T)</option>
                      <option value="MC04">MC04 (Milacron 350T)</option>
                      <option value="MC05">MC05 (Milacron 250T)</option>
                      <option value="MC06">MC06 (Milacron 180T)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Shift */}
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 0 4px 0' }}>
                  <span>{t('active_shift')} *</span>
                </label>
                <select
                  className="touch-select"
                  style={{
                    minWidth: 0,
                    width: '100%',
                    height: '42px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    padding: '0 8px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)'
                  }}
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  <option value="Shift A">Shift A (08:00 - 20:00)</option>
                  <option value="Shift B">Shift B (20:00 - 08:00)</option>
                </select>
              </div>

              {/* Date */}
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 0 4px 0' }}>
                  <Calendar size={12} />
                  <span>Date *</span>
                </label>
                <input
                  type="date"
                  className="touch-input"
                  style={{
                    minWidth: 0,
                    width: '100%',
                    height: '42px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    padding: '0 8px',
                    borderRadius: '8px'
                  }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Supervisor */}
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 0 4px 0' }}>
                  <UserCheck size={12} />
                  <span>Supervisor *</span>
                </label>
                <select
                  className="touch-select"
                  style={{
                    minWidth: 0,
                    width: '100%',
                    height: '42px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    padding: '0 8px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)'
                  }}
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  required
                >
                  <option value="Mr. Lokesh">Mr. Lokesh</option>
                  <option value="Mr. Akshay">Mr. Akshay</option>
                </select>
              </div>
            </div>

            {/* Mould / Part Selection (Filtered strictly by selected machine) */}
            <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontWeight: 800, color: 'var(--clr-primary)', fontSize: '0.78rem', margin: 0 }}>
                  <span>Mould / Part Number *</span>
                </label>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: 'var(--clr-primary)',
                    background: 'var(--clr-primary-lt)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #bae6fd'
                  }}
                >
                  {machineLinkedParts.length} linked to {selectedMachineNumber}
                </span>
              </div>
              <select
                className="touch-select"
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  height: '44px',
                  minWidth: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                  borderColor: 'var(--clr-primary)',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)'
                }}
                value={effectivePartId}
                onChange={(e) => setPartId(e.target.value)}
              >
                {machineLinkedParts.map(p => (
                  <option key={p.id || p.partNumber} value={p.id || p.partNumber}>
                    {p.partNumber || p.partCode} — {p.partName} ({p.customer || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Technical Specifications Card with Dual Cycle Time & Target */}
            {selectedPart && (
              <div
                style={{
                  background: 'var(--bg-surface2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxSizing: 'border-box'
                }}
              >
                {/* Header row of specs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--clr-border)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--clr-primary)' }}>
                    SPECS · {selectedPart.partNumber || selectedPart.partCode}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                      {selectedPart.rawMaterialGrade || 'PPCP'}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                      {selectedPart.customer || 'Internal'}
                    </span>
                  </div>
                </div>

                {/* Physical metrics: Part Wt, Runner Wt, Cavities (3 across) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--clr-border)', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Part Wt</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800 }}>
                      {selectedPart.partWeightGrams || 0}g
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--clr-border)', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Runner Wt</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800 }}>
                      {selectedPart.runnerWeightGrams || 0}g
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '6px 4px', borderRadius: '6px', border: '1px solid var(--clr-border)', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', fontWeight: 700 }}>Cavities</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                      {selectedPart.cavityCount || 1} Cav
                    </div>
                  </div>
                </div>

                {/* Production Cycle Times & Theoretical Hourly Target (Clean 3-box layout) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', textAlign: 'center' }}>
                  {/* 1. Standard Cycle Time (Locked) */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ fontSize: '0.58rem', color: 'var(--clr-text3)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Lock size={9} /> Std Cycle
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.90rem', fontWeight: 900, color: 'var(--clr-text2)' }}>
                      {standardCycleTime}s
                    </div>
                    <span style={{ fontSize: '0.52rem', color: 'var(--clr-text3)', fontWeight: 700 }}>
                      LOCKED
                    </span>
                  </div>

                  {/* 2. Actual Cycle Time (Editable) */}
                  <div
                    style={{
                      background: '#fff',
                      padding: '4px 4px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--clr-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
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
                        padding: '1px 0',
                        boxSizing: 'border-box'
                      }}
                      title="Actual running cycle time in seconds"
                      required
                    />
                    <span style={{ fontSize: '0.52rem', color: 'var(--clr-primary)', fontWeight: 700 }}>
                      seconds
                    </span>
                  </div>

                  {/* 3. Target Per Hour */}
                  <div
                    style={{
                      background: 'var(--clr-primary-lt)',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: '1px solid #7dd3fc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ fontSize: '0.58rem', color: 'var(--clr-primary)', fontWeight: 800 }}>
                      Target/Hr
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 900, color: 'var(--clr-primary)' }}>
                      {targetPerHour}
                    </div>
                    <span style={{ fontSize: '0.52rem', color: 'var(--clr-primary)', fontWeight: 700 }}>
                      pcs/hr
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Operator & Start Counter (2-column layout with minmax(0, 1fr)) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
                gap: '10px',
                boxSizing: 'border-box'
              }}
            >
              {/* Operator */}
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 0 4px 0' }}>
                  <UserCheck size={12} />
                  <span>Operator Name *</span>
                </label>
                <select
                  className="touch-select"
                  style={{
                    minWidth: 0,
                    width: '100%',
                    height: '42px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    padding: '0 8px',
                    borderRadius: '8px',
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

              {/* Start Counter */}
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.76rem', margin: '0 0 4px 0' }}>
                  <span>{t('start_counter')} *</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="touch-input"
                  style={{
                    minWidth: 0,
                    width: '100%',
                    height: '42px',
                    fontSize: '0.90rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    boxSizing: 'border-box',
                    padding: '0 8px',
                    borderRadius: '8px'
                  }}
                  value={startCounter}
                  onChange={(e) => setStartCounter(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 154200"
                  required
                />
              </div>
            </div>

            {/* Production Data Readiness Verification Status */}
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: `1px solid ${verification.isReady ? 'var(--clr-success)' : 'var(--clr-error)'}`,
                background: verification.isReady ? 'var(--clr-success-lt)' : 'var(--clr-error-lt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                {verification.isReady ? (
                  <CheckCircle2 size={16} color="var(--clr-success)" style={{ flexShrink: 0 }} />
                ) : (
                  <AlertTriangle size={16} color="var(--clr-error)" style={{ flexShrink: 0 }} />
                )}
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    color: verification.isReady ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {verification.statusText}
                </span>
              </div>
              <span className={`badge ${verification.isReady ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.62rem', flexShrink: 0 }}>
                {verification.isReady ? 'READY' : 'BLOCKED'}
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer"
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--clr-border)',
              display: 'flex',
              gap: '10px',
              background: 'var(--bg-surface2)',
              boxSizing: 'border-box'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1, height: '44px', fontWeight: 700 }}
              onClick={onClose}
            >
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, height: '44px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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
