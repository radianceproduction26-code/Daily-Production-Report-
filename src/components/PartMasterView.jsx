// Radiance Polymers - Plant Master Center (Part, Rejection, Downtime, Operator, Supervisor)
import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Layers,
  Search,
  AlertOctagon,
  Clock,
  Users,
  UserCheck,
  Plus,
  Shield,
  ShieldCheck,
  Filter,
  Lock,
  Edit3
} from 'lucide-react';
import {
  downloadUnifiedPartMasterTemplate,
  downloadRejectionMasterTemplate,
  downloadDowntimeMasterTemplate,
  parseUnifiedPartMasterExcel,
  parseRejectionMasterExcel,
  parseDowntimeMasterExcel
} from '../services/dataUploadService';
import {
  saveUnifiedMasterData,
  saveParts,
  getRejectionCodes,
  saveRejectionCodes,
  getDowntimeCodes,
  saveDowntimeCodes,
  getOperators,
  saveOperators,
  getSupervisors,
  generateNextDowntimeCode,
  generateNextRejectionCode
} from '../services/storageService';

export default function PartMasterView({
  parts = [],
  machines = [],
  mappings = [],
  onRefreshData,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState('parts'); // 'parts', 'rejections', 'downtimes', 'operators', 'supervisors'

  // Master Data States
  const [rejections, setRejections] = useState(() => getRejectionCodes());
  const [downtimes, setDowntimes] = useState(() => getDowntimeCodes());
  const [operators, setOperators] = useState(() => getOperators());
  const [supervisors] = useState(() => getSupervisors());

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMachine, setFilterMachine] = useState('ALL');

  // Upload States
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // New Code Form Modals
  const [showAddRejection, setShowAddRejection] = useState(false);
  const [newRejDesc, setNewRejDesc] = useState('');

  const [showAddDowntime, setShowAddDowntime] = useState(false);
  const [newDtDesc, setNewDtDesc] = useState('');
  const [newDtCategory, setNewDtCategory] = useState('Machine Related');

  const [showAddOperator, setShowAddOperator] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpCode, setNewOpCode] = useState('');

  // Handle inline update of Actual Cycle Time
  const handleActualCycleTimeChange = (partId, value) => {
    const num = parseFloat(value);
    const updated = parts.map(p => {
      if (p.id === partId || p.partNumber === partId || p.partCode === partId) {
        return {
          ...p,
          actualCycleTimeSeconds: isNaN(num) || num <= 0 ? (p.standardCycleTimeSeconds || 20) : num
        };
      }
      return p;
    });
    saveParts(updated);
    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Template Download Handlers with clear path confirmation
  const handleDownloadPartTemplate = async () => {
    const res = await downloadUnifiedPartMasterTemplate();
    if (res?.success) {
      setUploadResult({
        success: true,
        message: `Template downloaded successfully\nLocation: ${res.location || 'Downloads/Radiance_Part_Master_Template.xlsx'}`
      });
    }
  };

  const handleDownloadRejectionTemplate = async () => {
    const res = await downloadRejectionMasterTemplate();
    if (res?.success) {
      setUploadResult({
        success: true,
        message: `Template downloaded successfully\nLocation: ${res.location || 'Downloads/Radiance_Rejection_Master_Template.xlsx'}`
      });
    }
  };

  const handleDownloadDowntimeTemplate = async () => {
    const res = await downloadDowntimeMasterTemplate();
    if (res?.success) {
      setUploadResult({
        success: true,
        message: `Template downloaded successfully\nLocation: ${res.location || 'Downloads/Radiance_Downtime_Master_Template.xlsx'}`
      });
    }
  };

  // 1. Part Master Upload Handler
  const handlePartFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseUnifiedPartMasterExcel(buffer);

      if (!result.success && result.errors?.length > 0 && (!result.parts || result.parts.length === 0)) {
        setUploadResult({
          success: false,
          error: result.error || result.errors.join('; ')
        });
        setUploading(false);
        return;
      }

      saveUnifiedMasterData({
        parts: result.parts,
        machines: result.machines,
        mappings: result.mappings
      });

      setUploadResult({
        success: true,
        message: `Loaded: ${result.partsCount} Parts, ${result.machinesCount} Machines, ${result.mappingsCount} Mappings.`
      });

      if (onRefreshData) onRefreshData();
    } catch (err) {
      setUploadResult({
        success: false,
        error: `Upload failed: ${err.message}`
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 2. Rejection Master Upload Handler
  const handleRejectionFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseRejectionMasterExcel(buffer);

      if (!result.success || !result.codes || result.codes.length === 0) {
        setUploadResult({
          success: false,
          error: result.error || 'Failed to parse Rejection Master file.'
        });
        setUploading(false);
        return;
      }

      saveRejectionCodes(result.codes);
      setRejections(result.codes);
      setUploadResult({
        success: true,
        message: `Successfully loaded ${result.codes.length} rejection defect codes.`
      });
    } catch (err) {
      setUploadResult({
        success: false,
        error: `Upload error: ${err.message}`
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 3. Downtime Master Upload Handler
  const handleDowntimeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseDowntimeMasterExcel(buffer);

      if (!result.success || !result.codes || result.codes.length === 0) {
        setUploadResult({
          success: false,
          error: result.error || 'Failed to parse Downtime Master file.'
        });
        setUploading(false);
        return;
      }

      saveDowntimeCodes(result.codes);
      setDowntimes(result.codes);
      setUploadResult({
        success: true,
        message: `Successfully loaded ${result.codes.length} downtime reason codes.`
      });
    } catch (err) {
      setUploadResult({
        success: false,
        error: `Upload error: ${err.message}`
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Add Dynamic Rejection
  const handleCreateRejection = (e) => {
    e.preventDefault();
    if (!newRejDesc.trim()) return;

    const nextCode = generateNextRejectionCode(rejections);
    const newEntry = {
      code: nextCode,
      description: newRejDesc.trim(),
      status: 'active',
      isActive: true
    };

    const updated = [...rejections, newEntry];
    saveRejectionCodes(updated);
    setRejections(updated);
    setNewRejDesc('');
    setShowAddRejection(false);
  };

  // Add Dynamic Downtime
  const handleCreateDowntime = (e) => {
    e.preventDefault();
    if (!newDtDesc.trim()) return;

    const nextCode = generateNextDowntimeCode(downtimes);
    const newEntry = {
      code: nextCode,
      description: newDtDesc.trim(),
      category: newDtCategory,
      status: 'active',
      isActive: true
    };

    const updated = [...downtimes, newEntry];
    saveDowntimeCodes(updated);
    setDowntimes(updated);
    setNewDtDesc('');
    setShowAddDowntime(false);
  };

  // Add Operator
  const handleCreateOperator = (e) => {
    e.preventDefault();
    if (!newOpName.trim()) return;

    const nextId = `op-${Date.now().toString().slice(-4)}`;
    const empCode = newOpCode.trim() || `EMP-${String(operators.length + 101).padStart(3, '0')}`;
    const newEntry = {
      id: nextId,
      operatorName: newOpName.trim(),
      employeeCode: empCode,
      status: 'active'
    };

    const updated = [...operators, newEntry];
    saveOperators(updated);
    setOperators(updated);
    setNewOpName('');
    setNewOpCode('');
    setShowAddOperator(false);
  };

  // Filter Parts
  const filteredParts = parts.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      !query ||
      (p.partNumber && p.partNumber.toLowerCase().includes(query)) ||
      (p.partName && p.partName.toLowerCase().includes(query)) ||
      (p.customer && p.customer.toLowerCase().includes(query));

    if (!matchSearch) return false;

    if (filterMachine !== 'ALL') {
      const isMapped = mappings.some(
        m => m.machineCode === filterMachine && (m.partCode === p.partNumber || m.partCode === p.partCode)
      );
      if (!isMapped) return false;
    }

    return true;
  });

  return (
    <div className="main-viewport">
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Layers size={22} />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Master Center</h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.4 }}>
          Plant master data management: Simplified 13-column Part Master, Rejection codes, Downtime reasons, Operators, and Supervisors.
        </p>
      </div>

      {/* Sub Navigation Bar */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
        {[
          { id: 'parts', label: `Parts (${parts.length})`, icon: Layers },
          { id: 'rejections', label: `Rejections (${rejections.length})`, icon: AlertOctagon },
          { id: 'downtimes', label: `Downtime (${downtimes.length})`, icon: Clock },
          { id: 'operators', label: `Operators (${operators.length})`, icon: Users },
          { id: 'supervisors', label: `Supervisors (${supervisors.length})`, icon: UserCheck }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setActiveTab(tab.id);
                setUploadResult(null);
              }}
              style={{
                flexShrink: 0,
                height: '42px',
                borderRadius: '8px',
                fontWeight: isActive ? 800 : 600,
                background: isActive ? 'var(--clr-primary)' : 'var(--bg-surface)',
                color: isActive ? '#fff' : 'var(--clr-text)',
                borderColor: isActive ? 'var(--clr-primary)' : 'var(--clr-border)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Feedback Banner */}
      {uploadResult && (
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: uploadResult.success ? 'var(--clr-success-lt)' : 'var(--clr-error-lt)',
            border: `1px solid ${uploadResult.success ? 'var(--clr-success)' : 'var(--clr-error)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {uploadResult.success ? (
            <CheckCircle2 size={20} color="var(--clr-success)" style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={20} color="var(--clr-error)" style={{ flexShrink: 0 }} />
          )}
          <div style={{ fontSize: '0.85rem', color: uploadResult.success ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)', fontWeight: 600, whiteSpace: 'pre-line' }}>
            {uploadResult.message || uploadResult.error}
          </div>
        </div>
      )}

      {/* ── TAB 1: PART MASTER (13-COL UNIFIED) ── */}
      {activeTab === 'parts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Action Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadPartTemplate}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={18} />
                <span>Download Part Master Template</span>
              </button>

              <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', margin: 0 }}>
                <Upload size={18} />
                <span>{uploading ? 'Processing Excel...' : 'Upload Part Master Excel'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handlePartFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', lineHeight: 1.4 }}>
              Uploading the 13-column template automatically creates Parts, Machines, and Machine-Part Mappings in one step.
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
                <Search size={16} color="var(--clr-text3)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="touch-input"
                  placeholder="Search Part #, Name, Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', height: '44px', fontSize: '0.88rem' }}
                />
              </div>

              <select
                className="touch-select"
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                style={{ width: 'auto', minWidth: '120px', height: '44px' }}
              >
                <option value="ALL">All Machines</option>
                {machines.map(m => (
                  <option key={m.id} value={m.machineNumber}>{m.machineNumber}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cycle Time Policy Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: 'var(--clr-text2)'
          }}>
            <span style={{ fontSize: '1rem' }}>🔒</span>
            <div>
              <strong style={{ color: 'var(--clr-primary)' }}>Standard Cycle Time</strong> is strictly locked for target calculations (<code style={{ fontFamily: 'var(--font-mono)' }}>(3600/Std) × Cavities</code>). <strong style={{ color: 'var(--clr-text)' }}>Actual Cycle Time</strong> is editable to record floor observations.
            </div>
          </div>

          {/* Parts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredParts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--clr-text3)' }}>
                <FileSpreadsheet size={36} color="var(--clr-border)" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No Parts Registered</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Click "Download Part Master Template", fill your data, and click "Upload Part Master Excel".
                </div>
              </div>
            ) : (
              filteredParts.map(part => {
                const mappedMachines = mappings
                  .filter(m => m.partCode === part.partNumber || m.partCode === part.partCode)
                  .map(m => m.machineCode);

                return (
                  <div
                    key={part.id}
                    className="card"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderLeft: '4px solid var(--clr-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                          {part.partNumber || part.partCode}
                        </div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--clr-text2)', fontWeight: 600 }}>
                          {part.partName}
                        </div>
                      </div>
                      <span className="badge badge-primary">{part.customer}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px', textAlign: 'center', background: 'var(--bg-surface2)', padding: '10px 8px', borderRadius: '8px' }}>
                      {/* Standard Cycle Time - Strictly locked & used for target calculation */}
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          <span style={{ fontWeight: 700 }}>STD CYCLE</span>
                          <Lock size={10} color="var(--clr-text3)" />
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', color: 'var(--clr-primary)', marginTop: '2px' }}>
                          {part.standardCycleTimeSeconds}s
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--clr-text3)' }}>Target Base</div>
                      </div>

                      {/* Actual Cycle Time - Editable field */}
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--clr-text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          <span style={{ fontWeight: 700 }}>ACTUAL CYCLE</span>
                          <Edit3 size={10} color="var(--clr-primary)" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="999"
                            defaultValue={part.actualCycleTimeSeconds ?? part.standardCycleTimeSeconds}
                            onBlur={(e) => handleActualCycleTimeChange(part.id || part.partNumber || part.partCode, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                            }}
                            title="Floor observed cycle time in seconds"
                            style={{
                              width: '46px',
                              height: '24px',
                              padding: '1px 2px',
                              fontSize: '0.82rem',
                              textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--clr-primary)',
                              borderRadius: '4px',
                              color: 'var(--clr-text)'
                            }}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--clr-text2)' }}>s</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'var(--clr-primary)' }}>Observed</div>
                      </div>

                      <div style={{ padding: '4px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)' }}>CAVITIES</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginTop: '4px' }}>{part.cavityCount}</div>
                      </div>
                      <div style={{ padding: '4px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)' }}>PART WT</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginTop: '4px' }}>{part.partWeightGrams}g</div>
                      </div>
                      <div style={{ padding: '4px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--clr-text3)' }}>RUNNER</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginTop: '4px' }}>{part.runnerWeightGrams}g</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--clr-text3)' }}>Grade: <strong>{part.rawMaterialGrade || 'PPCP'}</strong></span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {mappedMachines.map(mc => (
                          <span key={mc} className="badge badge-gray">{mc}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: REJECTION MASTER ── */}
      {activeTab === 'rejections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Action Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadRejectionTemplate}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={18} />
                <span>Download Template (.xlsx)</span>
              </button>

              <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', margin: 0 }}>
                <Upload size={18} />
                <span>{uploading ? 'Processing...' : 'Upload Rejection Excel'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleRejectionFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAddRejection(prev => !prev)}
                style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}
              >
                <Plus size={18} />
                <span>Add Defect Code</span>
              </button>
            </div>
          </div>

          {/* Add Rejection Form */}
          {showAddRejection && (
            <form onSubmit={handleCreateRejection} className="card" style={{ padding: '14px', background: 'var(--bg-surface2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                Add New Rejection Defect Reason
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Defect Description *</label>
                <input
                  type="text"
                  className="touch-input"
                  placeholder="e.g. Silver Mark, Flash, Short Shot"
                  value={newRejDesc}
                  onChange={(e) => setNewRejDesc(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Defect (Permanent)
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRejection(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Rejection Codes List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rejections.map(r => (
              <div
                key={r.code}
                className="card"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--clr-error)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      background: 'var(--clr-error-lt)',
                      color: 'var(--clr-error)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {r.code}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                      {r.description}
                    </div>
                  </div>
                </div>

                <span className="badge badge-success">ACTIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: DOWNTIME MASTER ── */}
      {activeTab === 'downtimes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Action Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadDowntimeTemplate}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={18} />
                <span>Download Template (.xlsx)</span>
              </button>

              <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', margin: 0 }}>
                <Upload size={18} />
                <span>{uploading ? 'Processing...' : 'Upload Downtime Excel'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleDowntimeFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAddDowntime(prev => !prev)}
                style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}
              >
                <Plus size={18} />
                <span>Add Downtime Code</span>
              </button>
            </div>
          </div>

          {/* Add Downtime Form */}
          {showAddDowntime && (
            <form onSubmit={handleCreateDowntime} className="card" style={{ padding: '14px', background: 'var(--bg-surface2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                Add New Downtime Reason (Next Code: {generateNextDowntimeCode(downtimes)})
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category</label>
                <select
                  className="touch-select"
                  value={newDtCategory}
                  onChange={(e) => setNewDtCategory(e.target.value)}
                >
                  <option value="Machine Related">Machine Related</option>
                  <option value="Mould Related">Mould Related</option>
                  <option value="Material Related">Material Related</option>
                  <option value="Utility Related">Utility Related</option>
                  <option value="Process Related">Process Related</option>
                  <option value="Manpower Related">Manpower Related</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason Description *</label>
                <input
                  type="text"
                  className="touch-input"
                  placeholder="e.g. Hydraulic Hose Replacement"
                  value={newDtDesc}
                  onChange={(e) => setNewDtDesc(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Downtime Code (Permanent)
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDowntime(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Downtime Codes List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {downtimes.map(dt => (
              <div
                key={dt.code}
                className="card"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--clr-warning)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      background: 'var(--clr-warning-lt)',
                      color: 'var(--clr-warning-dark)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {dt.code}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                      {dt.description}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--clr-text3)' }}>
                      {dt.category}
                    </div>
                  </div>
                </div>

                <span className="badge badge-success">ACTIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: OPERATOR MASTER ── */}
      {activeTab === 'operators' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '14px', background: 'var(--bg-surface2)' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--clr-text)', marginBottom: '4px' }}>
              Floor Operator Management
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--clr-text3)', margin: 0, lineHeight: 1.4 }}>
              For the MC03 pilot, operator entry on the floor remains free-text with autocomplete suggestions. This master maintains operators for current floor suggestions and future user authentication.
            </p>
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddOperator(prev => !prev)}
              >
                <Plus size={16} />
                <span>Add Operator to Master</span>
              </button>
            </div>
          </div>

          {/* Add Operator Form */}
          {showAddOperator && (
            <form onSubmit={handleCreateOperator} className="card" style={{ padding: '14px', background: 'var(--bg-surface2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                Add Operator to System Master
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Operator Name *</label>
                  <input
                    type="text"
                    className="touch-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Employee Code</label>
                  <input
                    type="text"
                    className="touch-input"
                    placeholder="e.g. EMP-105"
                    value={newOpCode}
                    onChange={(e) => setNewOpCode(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Operator
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddOperator(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Operator List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {operators.map(op => (
              <div
                key={op.id || op.employeeCode}
                className="card"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--clr-primary)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                    {op.operatorName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--clr-text3)', fontFamily: 'var(--font-mono)' }}>
                    {op.employeeCode}
                  </div>
                </div>

                <span className="badge badge-success">ACTIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: SUPERVISOR MASTER (STRICTLY MR. LOKESH & MR. AKSHAY) ── */}
      {activeTab === 'supervisors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '14px', background: 'var(--clr-primary-lt)', border: '1px solid #7dd3fc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--clr-primary)', fontWeight: 800, fontSize: '0.92rem' }}>
              <ShieldCheck size={18} />
              <span>Authorized Shift Supervisors</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--clr-text2)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              Strictly authorized shift supervisors for the MC03 trial signoff. All demo, sample, and seed supervisors have been purged.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {supervisors.map(sup => (
              <div
                key={sup.id}
                className="card"
                style={{
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: '4px solid var(--clr-success)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--clr-success-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-success)', fontWeight: 800, fontSize: '1rem' }}>
                    {sup.name.slice(3, 4)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--clr-text)' }}>
                      {sup.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text3)' }}>
                      Authorized Floor Lead • Shift Signoff Active
                    </div>
                  </div>
                </div>

                <span className="badge badge-success">MANDATORY ACTIVE</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
