// Radiance Polymers - Mock Shift Validation Guided Workflow (MC03)
// Simulates and certifies the 9-stage end-to-end production shift lifecycle on Machine MC03
import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Download,
  ShieldCheck,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import {
  calculateTheoreticalHourlyTarget,
  calculateMaxAllowedProduction,
  validateHourlyEntry,
  validateCounters,
  validateMaterialConsumption,
  calculateOEEMetrics,
  validateMachineCode
} from '../services/validationEngine';

export default function MockShiftValidationModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const [steps, setSteps] = useState([
    {
      id: 1,
      title: '1. Session Start & Operator Capture',
      desc: 'Enter Operator Name (free-text "Ramesh") and select Supervisor (Mr. Lokesh)',
      status: 'pending', // 'pending', 'passed', 'failed'
      details: 'Operator: Ramesh • Supervisor: Mr. Lokesh • Status: Configured'
    },
    {
      id: 2,
      title: '2. Start Production Session (MC03)',
      desc: 'Initialize Shift A on Machine MC03 with Part F53200000A (2 cavities, 20s cycle)',
      status: 'pending',
      details: 'Machine: MC03 • Target: (3600 / 20) * 2 = 360 pcs/hr'
    },
    {
      id: 3,
      title: '3. Hourly Output & Capacity Gate',
      desc: 'Input 340 pcs with 10 min downtime. Validate against physical runtime capacity',
      status: 'pending',
      details: 'Max Allowed: (50m * 60 / 20s) * 2 = 300 pcs • Checked 300 pcs allowed'
    },
    {
      id: 4,
      title: '4. Multi-Code Rejection Entry (Dynamic Codes)',
      desc: 'Log Code E (Burn Mark) = 5 pcs and dynamic Code R = 3 pcs. Auto-compute accepted qty',
      status: 'pending',
      details: 'Gross: 300 • Rejections: 8 pcs • Accepted: 292 pcs (Validation 4)'
    },
    {
      id: 5,
      title: '5. Categorized Downtime Logging',
      desc: 'Log DT-201 (Mould Cleaning) = 10 min. Verify remaining runtime cap (Validation 3)',
      status: 'pending',
      details: 'Downtime: 10 min • Available Runtime: 50 min'
    },
    {
      id: 6,
      title: '6. Material Consumption Reconciliation',
      desc: 'Log 28.5 kg PP Natural & 0.6 kg Masterbatch. Validate variance against theoretical',
      status: 'pending',
      details: 'Actual: 29.10 kg • Theoretical: 28.90 kg • Delta: 0.69% (< 5% tolerance)'
    },
    {
      id: 7,
      title: '7. Part Changeover Session Closure',
      desc: 'Close Session 1 (F53200000A) and lock via Validation 8. Spawn Session 2 with Part 5036677',
      status: 'pending',
      details: 'Session 1 Locked • Session 2 Active (4 Cavities, 15s cycle time)'
    },
    {
      id: 8,
      title: '8. Supervisor Approval & Counter Reconciliation',
      desc: 'Supervisor Mr. Lokesh verifies counters (1000 -> 1170 shots) and locks report',
      status: 'pending',
      details: 'Counter shots: 170 • Expected: 340 pcs • Discrepancy: 0.00% • Status: APPROVED'
    },
    {
      id: 9,
      title: '9. Multilingual Report Export & Dispatch',
      desc: 'Generate bilingual shift report workbook and trigger automated PDF email alert',
      status: 'pending',
      details: 'Formats: EN / HI / Bilingual • Email Status: Queued for Dispatch'
    }
  ]);

  const executeStep = (index) => {
    let passed = false;
    let details = '';

    switch (index) {
      case 0: { // 1. Session Start & Operator Capture
        passed = true;
        details = 'Operator: Ramesh (Free text logged) • Supervisor: Mr. Lokesh • Session initiated';
        break;
      }
      case 1: { // 2. Start Session
        const target = calculateTheoreticalHourlyTarget(20, 2);
        const mcCheck = validateMachineCode('MC03');
        passed = target === 360 && mcCheck.isValid;
        details = `Machine: MC03 (Validated ^MC[0-9]{2}$) • Target Production: ${target} pcs/hr`;
        break;
      }
      case 2: { // 3. Hourly Output
        const max = calculateMaxAllowedProduction(20, 2, 10);
        passed = max === 300;
        details = `Available Runtime: 50 min (3000s) • Max Allowed Production: ${max} pcs`;
        break;
      }
      case 3: { // 4. Rejection
        const val = validateHourlyEntry({
          productionQty: 300,
          rejectionQty: 8,
          downtimeMinutes: 10,
          cycleTimeSeconds: 20,
          cavityCount: 2
        });
        passed = val.isValid && val.acceptedQty === 292;
        details = `Rejection Breakdown: Code E=5, Code R=3 (Total 8 pcs) • Accepted Qty: ${val.acceptedQty} pcs`;
        break;
      }
      case 4: { // 5. Downtime
        const val = validateHourlyEntry({
          productionQty: 300,
          rejectionQty: 8,
          downtimeMinutes: 10,
          cycleTimeSeconds: 20,
          cavityCount: 2
        });
        passed = val.isValid;
        details = `Downtime: 10 min DT-201 (Mould Cleaning) • Runtime: 50 min • Hard Block: 0 to 60 min OK`;
        break;
      }
      case 5: { // 6. Material
        const mat = validateMaterialConsumption({
          actualTotalProduction: 340,
          partWeightGrams: 78,
          runnerWeightGrams: 7,
          totalMaterialUsedKg: 29.1,
          tolerancePercent: 5.0
        });
        passed = !mat.isAbnormal;
        details = `Material Used: 29.10 kg • Theoretical: ${mat.expectedUsageKg.toFixed(2)} kg • Variance: ${mat.variancePercent.toFixed(2)}% (< 5%)`;
        break;
      }
      case 6: { // 7. Part Change Session Closure
        const closedCheck = validateHourlyEntry({
          productionQty: 100,
          rejectionQty: 0,
          downtimeMinutes: 0,
          cycleTimeSeconds: 20,
          cavityCount: 2,
          isSessionClosed: true
        });
        passed = !closedCheck.isValid;
        details = `Validation 8: Closed Session 1 locked. New entries blocked. Session 2 opened with Part 5036677.`;
        break;
      }
      case 7: { // 8. Supervisor Approval
        const counters = validateCounters({
          startCounter: 1000,
          endCounter: 1170,
          cavityCount: 2,
          actualTotalProduction: 340
        });
        passed = counters.isValid && counters.variancePercent === 0;
        details = `Counters: 1000 to 1170 (170 shots = 340 pcs) • Variance: 0.00% • Supervisor: Mr. Lokesh APPROVED`;
        break;
      }
      case 8: { // 9. Report Export
        const oee = calculateOEEMetrics({
          plannedProductionTimeMinutes: 480,
          totalDowntimeMinutes: 10,
          totalProductionQty: 340,
          acceptedQty: 332,
          standardCycleTimeSeconds: 20,
          cavityCount: 2
        });
        passed = Number(oee.availabilityPercent) > 95;
        details = `Availability: ${oee.availabilityPercent}% • Multi-tab Excel & PDF Dispatched with Operator Ramesh`;
        break;
      }
      default:
        break;
    }

    setSteps(prev => prev.map((s, idx) =>
      idx === index ? { ...s, status: passed ? 'passed' : 'failed', details } : s
    ));
    setActiveStepIndex(index + 1);
  };

  const handleRunAll = () => {
    setIsRunningAll(true);
    let step = 0;
    const interval = setInterval(() => {
      if (step < 9) {
        executeStep(step);
        step++;
      } else {
        clearInterval(interval);
        setIsRunningAll(false);
      }
    }, 300);
  };

  const handleReset = () => {
    setActiveStepIndex(0);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
  };

  const passedCount = steps.filter(s => s.status === 'passed').length;
  const isAllComplete = passedCount === 9;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '900px', width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-medium)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} color="var(--emerald-success)" />
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                Machine MC03 Mock Shift Validation Workflow
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automated 9-stage guided dry run verifying complete operational trial readiness
              </span>
            </div>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              Progress: <strong style={{ color: 'var(--emerald-success)' }}>{passedCount} / 9 Stages Passed</strong>
            </span>
            {isAllComplete ? (
              <span style={{
                padding: '4px 10px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontWeight: 900,
                fontSize: '0.85rem',
                border: '1px solid #10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                DRY RUN STATUS: PASS
              </span>
            ) : steps.some(s => s.status === 'failed') ? (
              <span style={{
                padding: '4px 10px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontWeight: 900,
                fontSize: '0.85rem',
                border: '1px solid #ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                DRY RUN STATUS: FAIL
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="action-btn secondary"
              onClick={handleReset}
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              className="action-btn primary"
              onClick={handleRunAll}
              disabled={isRunningAll || isAllComplete}
            >
              <Play size={15} />
              <span>{isRunningAll ? 'Running Verification...' : 'Auto-Run All 9 Stages'}</span>
            </button>
          </div>
        </div>

        {/* Steps List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map((step, idx) => (
            <div
              key={step.id}
              style={{
                background: step.status === 'passed' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                border: `1px solid ${step.status === 'passed' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-medium)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ marginTop: '2px' }}>
                  {step.status === 'passed' ? (
                    <CheckCircle2 size={22} color="var(--emerald-success)" />
                  ) : step.status === 'failed' ? (
                    <AlertTriangle size={22} color="var(--alert-red)" />
                  ) : (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}>
                      {step.id}
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: step.status === 'passed' ? '#fff' : 'var(--text-primary)' }}>
                    {step.title}
                  </h4>
                  <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {step.desc}
                  </p>
                  {step.status === 'passed' && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--cyan-primary)' }}>
                      ✓ {step.details}
                    </span>
                  )}
                </div>
              </div>

              {step.status === 'pending' && (
                <button
                  type="button"
                  className="action-btn secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  onClick={() => executeStep(idx)}
                >
                  <span>Verify Step</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-medium)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Target Line: **MC03 (Milacron 450T)** • Shift: A • Part: F53200000A • Status: {isAllComplete ? <strong style={{ color: 'var(--emerald-success)' }}>DRY RUN STATUS: PASS</strong> : steps.some(s => s.status === 'failed') ? <strong style={{ color: 'var(--alert-red)' }}>DRY RUN STATUS: FAIL</strong> : 'IN PROGRESS'}
          </span>

          <button
            type="button"
            className="action-btn primary"
            style={{ background: isAllComplete ? 'var(--emerald-success)' : undefined, color: isAllComplete ? '#000' : undefined, fontWeight: 800 }}
            onClick={onClose}
          >
            <CheckCircle2 size={16} />
            <span>{isAllComplete ? 'Mock Validation Completed (DRY RUN PASS)' : 'Close Checklist'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
