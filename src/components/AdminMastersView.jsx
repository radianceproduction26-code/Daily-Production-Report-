// Radiance Polymers - Admin Masters & System Configuration Center
import React, { useState } from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Mail,
  ShieldCheck,
  Building,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { validateMachineCode } from '../services/validationEngine';
import { getSupervisors, getMachinePartMappings } from '../services/storageService';

export default function AdminMastersView({
  machines = [],
  moulds = [],
  parts = [],
  rejectionCodes = [],
  downtimeCodes = [],
  materials = [],
  settings = {},
  onUpdateMachines,
  onUpdateMoulds,
  onUpdateParts,
  onUpdateRejectionCodes,
  onUpdateDowntimeCodes,
  onUpdateSettings
}) {
  const [activeSubTab, setActiveSubTab] = useState('machines'); // 'machines', 'moulds', 'parts', 'mappings', 'supervisors', 'rejections', 'downtimes', 'settings'
  const [mappings] = useState(() => getMachinePartMappings());
  const [supervisors] = useState(() => getSupervisors());

  // Local state for Downtime Code creation
  const [newDtCode, setNewDtCode] = useState('');
  const [newDtCategory, setNewDtCategory] = useState('Machine Related');
  const [newDtDesc, setNewDtDesc] = useState('');

  // Local state for Machine creation
  const [newMachineNum, setNewMachineNum] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineTonnage, setNewMachineTonnage] = useState('250');

  // Toggle Rejection code active/inactive (Prompt: "Admin can activate/deactivate codes but should not change the code structure")
  const toggleRejectionCode = (code) => {
    const updated = rejectionCodes.map(c =>
      c.code === code ? { ...c, isActive: !c.isActive } : c
    );
    onUpdateRejectionCodes(updated);
  };

  // Add new downtime code
  const handleAddDowntimeCode = (e) => {
    e.preventDefault();
    if (!newDtCode.trim() || !newDtDesc.trim()) return;

    if (downtimeCodes.some(d => d.code === newDtCode.trim().toUpperCase())) {
      alert('Downtime code already exists!');
      return;
    }

    const updated = [
      ...downtimeCodes,
      {
        code: newDtCode.trim().toUpperCase(),
        category: newDtCategory,
        description: newDtDesc.trim(),
        isActive: true
      }
    ];
    onUpdateDowntimeCodes(updated);
    setNewDtCode('');
    setNewDtDesc('');
  };

  // Add new Machine
  const handleAddMachine = (e) => {
    e.preventDefault();
    if (!newMachineNum.trim()) return;

    const validation = validateMachineCode(newMachineNum.trim().toUpperCase());
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    if (machines.some(m => m.machineNumber === validation.machineCode)) {
      alert(`Machine ${validation.machineCode} already exists!`);
      return;
    }

    const updated = [
      ...machines,
      {
        id: 'm-' + validation.machineCode.toLowerCase(),
        machineNumber: validation.machineCode,
        machineName: newMachineName.trim() || `${validation.machineCode} Injection Moulding`,
        capacityTon: Number(newMachineTonnage) || 200,
        status: 'active'
      }
    ];
    onUpdateMachines(updated);
    setNewMachineNum('');
    setNewMachineName('');
    setNewMachineTonnage(200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '18px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-medium)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={22} color="var(--cyan-primary)" />
            <span>Plant Master Data & Configuration Console</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Configure machines, moulds, parts, rejection rules, downtime libraries, and tolerance parameters.
          </p>
        </div>

        {/* Sub Navigation Pills (Swipeable on mobile) */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-space)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'machines', label: 'Machines' },
            { id: 'moulds', label: 'Moulds' },
            { id: 'parts', label: 'Parts Master' },
            { id: 'mappings', label: 'Mapping' },
            { id: 'supervisors', label: 'Supervisors' },
            { id: 'rejections', label: 'Rejections' },
            { id: 'downtimes', label: 'Downtimes' },
            { id: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: activeSubTab === tab.id ? 'var(--clr-primary)' : 'transparent',
                color: activeSubTab === tab.id ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. MACHINES TAB */}
      {activeSubTab === 'machines' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="production-grid-wrapper">
            <div className="grid-header-bar">
              <span className="grid-title">Active Injection Machines ({machines.length})</span>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Machine No</th>
                  <th>Machine Name</th>
                  <th>Capacity (Ton)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {machines.map(m => (
                  <tr key={m.id}>
                    <td><span className="badge-tag machine">{m.machineNumber}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.machineName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{m.capacityTon} Ton</td>
                    <td>
                      <span className="badge-tag synced">{m.status.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Machine Creation Card */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--cyan-primary)' }}>
              Add New Machine Master
            </span>
            <form onSubmit={handleAddMachine} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Machine Code (Standard: MC01–MC99)</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--cyan-primary)', fontFamily: 'monospace' }}>Pattern: MC[0-9][0-9]</span>
                </div>
                <input
                  type="text"
                  className="touch-input"
                  placeholder="e.g. MC15"
                  value={newMachineNum}
                  onChange={(e) => setNewMachineNum(e.target.value.toUpperCase())}
                  maxLength={4}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Standard convention: MC + 2-digit number (MC01–MC99).
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Machine Name / Make</label>
                <input
                  type="text"
                  className="touch-input"
                  placeholder="e.g. Milacron 450T"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tonnage Capacity (Ton)</label>
                <input
                  type="number"
                  className="touch-input"
                  value={newMachineTonnage}
                  onChange={(e) => setNewMachineTonnage(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="action-btn primary" style={{ marginTop: '10px' }}>
                <Plus size={16} />
                <span>Save Machine Master</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MOULDS TAB (SOURCE OF TRUTH FOR CYCLE TIME & CAVITY COUNT) */}
      {activeSubTab === 'moulds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="validation-banner warning" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'var(--cyan-primary)' }}>
            <ShieldCheck size={20} color="var(--cyan-primary)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--cyan-primary)' }}>Mould Master Single Source of Truth:</strong> Standard Cycle Time (sec) and Cavity Count are strictly maintained in Mould Master. All hourly target and validation calculations derive from these values.
            </div>
          </div>

          <div className="production-grid-wrapper">
            <div className="grid-header-bar">
              <span className="grid-title">Mould Master Catalog ({moulds.length})</span>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Mould Number</th>
                  <th>Part Code</th>
                  <th>Std Cycle Time (sec)</th>
                  <th>Cavity Count</th>
                  <th>Theoretical Target</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {moulds.map(m => {
                  const targetPerHour = m.standardCycleTimeSeconds > 0 
                    ? Math.floor((3600 / m.standardCycleTimeSeconds) * (m.cavityCount || 1))
                    : '-';
                  return (
                    <tr key={m.id}>
                      <td><span className="badge-tag machine">{m.mouldNumber}</span></td>
                      <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{m.partCode || '-'}</strong></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber-warning)' }}>
                        {m.standardCycleTimeSeconds} sec
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                        {m.cavityCount} Cav
                      </td>
                      <td className="num-cell target">{targetPerHour} pcs/hr</td>
                      <td><span className="badge-tag synced">{m.status.toUpperCase()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PARTS TAB (OPERATIONAL MASTER: PART NUMBER = PRODUCTION TOOL IDENTIFIER) */}
      {activeSubTab === 'parts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="validation-banner warning" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'var(--emerald-success)' }}>
            <CheckCircle2 size={20} color="var(--emerald-success)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--emerald-success)' }}>Part Master is the Operational Master:</strong> At Radiance Polymers, Part Number is the Production Tool Identifier used across planning, shop-floor operations, and quality. It serves as the single source of truth for cycle time, cavities, target rates, and validations.
            </div>
          </div>

          <div className="production-grid-wrapper">
            <div className="grid-header-bar">
              <span className="grid-title">Part Master & Tool Engineering Specs ({parts.length})</span>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Part Number (Tool ID)</th>
                  <th>Part Name</th>
                  <th>Customer</th>
                  <th>Material Grade</th>
                  <th>Part Wt (g)</th>
                  <th>Runner Wt (g)</th>
                  <th>Cycle (s)</th>
                  <th>Cavities</th>
                  <th>Target Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => {
                  const target = p.standardCycleTimeSeconds > 0 
                    ? Math.floor((3600 / p.standardCycleTimeSeconds) * (p.cavityCount || 1))
                    : '-';
                  return (
                    <tr key={p.id}>
                      <td><strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>{p.partNumber || p.partCode}</strong></td>
                      <td style={{ fontWeight: 600 }}>{p.partName}</td>
                      <td><span className="badge-tag machine">{p.customer}</span></td>
                      <td><span className="badge-tag shift">{p.rawMaterialGrade || 'PPCP'}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{p.partWeightGrams} g</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{p.runnerWeightGrams} g</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber-warning)' }}>
                        {p.standardCycleTimeSeconds || 20}s
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                        {p.cavityCount || 2} Cav
                      </td>
                      <td className="num-cell target">{target} pcs/hr</td>
                      <td>
                        <span className={`badge-tag ${p.status === 'active' ? 'synced' : 'shift'}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MACHINE-PART MAPPINGS TAB (MC03 PILOT) */}
      {activeSubTab === 'mappings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="validation-banner warning" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'var(--amber-warning)' }}>
            <Sliders size={20} color="var(--amber-warning)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--amber-warning)' }}>MC03 Machine-Part Mapping Update:</strong> Actual floor mould numbers are not yet stamped. The mapping structure renames "Mould No" to "Part Code" temporarily. Future-ready for full mould numbers.
            </div>
          </div>

          <div className="production-grid-wrapper">
            <div className="grid-header-bar">
              <span className="grid-title">Machine Authorization & Approved Parts Matrix</span>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Machine Code</th>
                  <th>Part Code</th>
                  <th>Approved to Run</th>
                  <th>Pilot Authorization</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(map => (
                  <tr key={map.id}>
                    <td><span className="badge-tag machine">{map.machineCode}</span></td>
                    <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{map.partCode}</strong></td>
                    <td>
                      <span className="badge-tag synced" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                        APPROVED TO RUN
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Active on MC03 (Trial Scope)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUPERVISORS TAB (PILOT MASTER) */}
      {activeSubTab === 'supervisors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="validation-banner warning" style={{ background: 'rgba(139, 92, 246, 0.08)', borderColor: '#8b5cf6' }}>
            <ShieldCheck size={20} color="#8b5cf6" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#a78bfa' }}>Pilot Supervisor Master (Simplified Floor Operations):</strong> Operator user creation requirement has been eliminated for the pilot. Reports require mandatory supervisor signoff from this master list without PIN requirement.
            </div>
          </div>

          <div className="production-grid-wrapper">
            <div className="grid-header-bar">
              <span className="grid-title">Authorized Shift Supervisors ({supervisors.length})</span>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Supervisor Name</th>
                  <th>Role</th>
                  <th>Designation</th>
                  <th>Shift Signoff Dropdown</th>
                  <th>PIN Validation</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</td>
                    <td><span className="badge-tag machine">{s.role.toUpperCase()}</span></td>
                    <td>{s.designation}</td>
                    <td>
                      <span className="badge-tag synced">MANDATORY DROPDOWN ACTIVE</span>
                    </td>
                    <td>
                      <span className="badge-tag shift" style={{ color: '#38bdf8' }}>WAIVED FOR PILOT</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. REJECTION CODES (ORIGINAL A TO Q PRESERVED) */}
      {activeSubTab === 'rejections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="validation-banner warning">
            <ShieldCheck size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Original A–Q Code Structure:</strong> Per Radiance Polymers policy, the code structure (A to Q) is preserved exactly from the current paper report. Admins may activate/deactivate codes for shop floor visibility.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {rejectionCodes.map(rc => (
              <div
                key={rc.code}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '1.1rem'
                    }}
                  >
                    {rc.code}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{rc.description}</div>
                    <div style={{ fontSize: '0.72rem', color: rc.isActive ? '#34d399' : '#94a3b8' }}>
                      {rc.isActive ? 'Active on floor' : 'Deactivated'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleRejectionCode(rc.code)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: rc.isActive ? 'var(--emerald-success)' : 'var(--text-muted)' }}
                  title="Toggle Active Status"
                >
                  {rc.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DOWNTIME CODES (EXPANDABLE MASTER) */}
      {activeSubTab === 'downtimes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="production-grid-wrapper">
            <div className="grid-header-bar">
              <span className="grid-title">Categorized Downtime Library ({downtimeCodes.length})</span>
            </div>
            <div className="admin-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="production-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {downtimeCodes.map(dt => (
                  <tr key={dt.code}>
                    <td><span className="code-chip downtime">{dt.code}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{dt.category}</td>
                    <td style={{ fontWeight: 600 }}>{dt.description}</td>
                    <td><span className="badge-tag synced">{dt.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Add Downtime Code Form */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--amber-primary)' }}>
              Add New Downtime Code
            </span>
            <form onSubmit={handleAddDowntimeCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Downtime Code</label>
                <input
                  type="text"
                  className="touch-input"
                  placeholder="e.g. DT-105"
                  value={newDtCode}
                  onChange={(e) => setNewDtCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classification Category</label>
                <select
                  className="touch-select"
                  value={newDtCategory}
                  onChange={(e) => setNewDtCategory(e.target.value)}
                >
                  <option value="Machine Related">Machine Related</option>
                  <option value="Mould Related">Mould Related</option>
                  <option value="Material Related">Material Related</option>
                  <option value="Process Related">Process Related</option>
                  <option value="Utility Related">Utility Related</option>
                  <option value="Manpower Related">Manpower Related</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Root Cause</label>
                <input
                  type="text"
                  className="touch-input"
                  placeholder="e.g. Nozzle Choke / Barrel Jam"
                  value={newDtDesc}
                  onChange={(e) => setNewDtDesc(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="action-btn amber" style={{ marginTop: '10px' }}>
                <Plus size={16} />
                <span>Register Downtime Code</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. SYSTEM SETTINGS & TOLERANCES */}
      {activeSubTab === 'settings' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--cyan-primary)' }}>
            System Validation Tolerances & Automated Email Settings
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>Validation 6: Shot Counter Tolerance (%)</span>
              </label>
              <input
                type="number"
                step="0.5"
                className="touch-input"
                value={settings.shotCounterTolerancePercent || 3.0}
                onChange={(e) => onUpdateSettings({ ...settings, shotCounterTolerancePercent: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Flags entry if shots vs piece output deviates more than this limit.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Validation 7: Material Variance Tolerance (%)</span>
              </label>
              <input
                type="number"
                step="0.5"
                className="touch-input"
                value={settings.materialVarianceTolerancePercent || 5.0}
                onChange={(e) => onUpdateSettings({ ...settings, materialVarianceTolerancePercent: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Flags abnormal consumption vs theoretical part + runner weight.
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Daily Production Summary Email Distribution List (Recipients)</span>
            </label>
            <input
              type="text"
              className="touch-input"
              placeholder="planthead@radiancepolymers.com, quality@radiancepolymers.com, production@radiancepolymers.com"
              value={(settings.autoEmailRecipients || []).join(', ')}
              onChange={(e) => onUpdateSettings({ ...settings, autoEmailRecipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Comma-separated emails that automatically receive the Daily Production Summary Email (Machine, Part, Operator, Supervisor, Gross, Rejections, Accepted, Downtime, Material, Status, with attached Excel and PDF reports) at shift close or end of day.
            </span>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius-md)', padding: '14px', color: '#a7f3d0', fontSize: '0.85rem' }}>
            <strong>Cloud Sync & Backup Engine:</strong> Supabase real-time sync active with local IndexedDB fallback. Auto-recovery is active.
          </div>
        </div>
      )}

    </div>
  );
}
