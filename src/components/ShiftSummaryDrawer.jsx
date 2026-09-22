// Radiance Polymers - Shift Summary & Signoff Drawer
import React, { useState } from 'react';
import {
  FileCheck,
  X,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Mail,
  Download,
  Printer,
  FileText,
  Sparkles,
  Layers,
  Clock,
  Gauge,
  Trash2
} from 'lucide-react';
import { calculateOEEMetrics } from '../services/validationEngine';
import { exportShiftReportToExcel, exportShiftReportPDF, sendShiftReportEmail } from '../services/exportService';
import { executeDailyBackupPipeline, getDailyBackupStatus } from '../services/storageService';
import { useI18n } from '../i18n/I18nContext';

export default function ShiftSummaryDrawer({
  isOpen,
  onClose,
  activeReport,
  currentUser,
  onSubmitReport,
  onApproveReport,
  onUnlockReport,
  systemSettings,
  onDeleteReport
}) {
  const { t, language } = useI18n();
  if (!isOpen || !activeReport) return null;

  const [supervisorNotes, setSupervisorNotes] = useState(activeReport.supervisorNotes || '');
  const [selectedSupervisor, setSelectedSupervisor] = useState(activeReport.supervisorName || '');
  const [unlockReason, setUnlockReason] = useState('');
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [backupStatus, setBackupStatus] = useState(() => getDailyBackupStatus()?.status || 'SUCCESS');

  // Aggregate stats across all sessions in the shift
  let totalProduction = 0;
  let totalAccepted = 0;
  let totalRejected = 0;
  let totalDowntimeMinutes = 0;
  let totalMaterialUsedKg = 0;

  activeReport.mouldSessions.forEach(session => {
    (session.entries || []).forEach(e => {
      totalProduction += Number(e.productionQty) || 0;
      totalAccepted += Number(e.acceptedQty) || 0;
      totalRejected += Number(e.rejectionQty) || 0;
      totalDowntimeMinutes += Number(e.downtimeMinutes) || 0;
    });

    (session.materials || []).forEach(m => {
      totalMaterialUsedKg += Number(m.usedQuantityKg) || 0;
    });
  });

  const rejectionRate = totalProduction > 0 ? ((totalRejected / totalProduction) * 100).toFixed(2) : '0.00';
  const mouldChangesCount = Math.max(0, activeReport.mouldSessions.length - 1);
  const plannedShiftMinutes = 12 * 60; // 12-hour shift baseline
  const machineUtilization = (((plannedShiftMinutes - totalDowntimeMinutes) / plannedShiftMinutes) * 100).toFixed(1);

  // First session cycle time as standard baseline for shift OEE
  const primarySession = activeReport.mouldSessions[0] || {};
  const oeeMetrics = calculateOEEMetrics({
    plannedProductionTimeMinutes: plannedShiftMinutes,
    totalDowntimeMinutes,
    totalProductionQty: totalProduction,
    acceptedQty: totalAccepted,
    standardCycleTimeSeconds: primarySession.standardCycleTimeSeconds || 20,
    cavityCount: primarySession.cavityCount || 2
  });

  const handleOperatorSubmit = () => {
    onSubmitReport(activeReport.id);
    onClose();
  };

  const handleSupervisorApprove = async () => {
    if (!selectedSupervisor) {
      alert('Supervisor selection is mandatory before report approval. Please select Mr. Lokesh or Mr. Akshay.');
      return;
    }
    setIsEmailing(true);
    const emailResult = await sendShiftReportEmail(activeReport, systemSettings.autoEmailRecipients);
    const backupResult = executeDailyBackupPipeline(activeReport, systemSettings.autoEmailRecipients);
    setBackupStatus(backupResult.status);
    setEmailStatus(emailResult);
    setIsEmailing(false);

    onApproveReport(activeReport.id, supervisorNotes, selectedSupervisor);
  };

  const handleManagerUnlock = () => {
    if (!unlockReason.trim()) {
      alert('Please state a valid engineering or quality reason to unlock an approved shift report.');
      return;
    }
    onUnlockReport(activeReport.id, unlockReason);
    setUnlockReason('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={20} color="var(--clr-primary)" />
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>
              {activeReport.machineNumber} • {activeReport.shift} Summary
            </h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email Notification Success Banner */}
          {emailStatus && (
            <div className="alert alert-success">
              <Mail size={18} color="var(--clr-success)" />
              <div style={{ fontSize: '0.82rem' }}>
                <strong>Summary Email Dispatched</strong> to {emailStatus.recipients?.join(', ')}
              </div>
            </div>
          )}

          {/* Shift Details Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', background: 'var(--bg-surface2)', padding: '10px', borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)' }}>
            <span className="badge badge-primary">{activeReport.machineNumber}</span>
            <span className="badge badge-gray">{activeReport.shift}</span>
            <span className="badge badge-gray">{activeReport.reportDate}</span>
            <span className={`badge ${activeReport.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
              {activeReport.status.toUpperCase()}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', marginLeft: 'auto' }}>
              Op: <strong>{activeReport.operator_name || activeReport.operatorName || 'Operator'}</strong>
            </span>
          </div>

          {/* KPI Deck - 2x3 Grid on Mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div className="kpi-card" style={{ padding: '10px' }}>
              <div className="kpi-title">{t('kpi_gross_production')}</div>
              <div className="kpi-val" style={{ fontSize: '1.25rem' }}>{totalProduction.toLocaleString()}</div>
              <div className="kpi-sub">Gross Units</div>
            </div>

            <div className="kpi-card" style={{ padding: '10px', borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>{t('kpi_accepted_quantity')}</div>
              <div className="kpi-val" style={{ fontSize: '1.25rem', color: 'var(--clr-success)' }}>{totalAccepted.toLocaleString()}</div>
              <div className="kpi-sub">Good Parts</div>
            </div>

            <div className="kpi-card" style={{ padding: '10px', borderTop: '3px solid var(--clr-error)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-error)' }}>{t('kpi_rejection_rate')}</div>
              <div className="kpi-val" style={{ fontSize: '1.25rem', color: 'var(--clr-error)' }}>
                {totalRejected} <span style={{ fontSize: '0.8rem' }}>({rejectionRate}%)</span>
              </div>
              <div className="kpi-sub">Rejections</div>
            </div>

            <div className="kpi-card" style={{ padding: '10px', borderTop: '3px solid var(--clr-orange)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-orange)' }}>{t('kpi_total_downtime')}</div>
              <div className="kpi-val" style={{ fontSize: '1.25rem', color: 'var(--clr-orange)' }}>
                {totalDowntimeMinutes}m
              </div>
              <div className="kpi-sub">Stoppage</div>
            </div>

            <div className="kpi-card" style={{ padding: '10px', borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>{t('kpi_machine_utilization')}</div>
              <div className="kpi-val" style={{ fontSize: '1.25rem', color: 'var(--clr-primary)' }}>{machineUtilization}%</div>
              <div className="kpi-sub">Uptime</div>
            </div>

            <div className="kpi-card" style={{ padding: '10px', borderTop: '3px solid var(--clr-purple)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-purple)' }}>OEE Score</div>
              <div className="kpi-val" style={{ fontSize: '1.25rem', color: 'var(--clr-purple)' }}>{oeeMetrics.oeePercent}%</div>
              <div className="kpi-sub">A:{oeeMetrics.availabilityPercent}% P:{oeeMetrics.performancePercent}%</div>
            </div>
          </div>

          {/* Mould Sessions Breakdown - Mobile Card List */}
          <div style={{ background: 'var(--bg-surface2)', padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--clr-text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} />
              <span>Shift Sessions ({activeReport.mouldSessions.length} total, {mouldChangesCount} Changes)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeReport.mouldSessions.map((session) => {
                const sProd = (session.entries || []).reduce((s, e) => s + (Number(e.productionQty) || 0), 0);
                const sAcc = (session.entries || []).reduce((s, e) => s + (Number(e.acceptedQty) || 0), 0);
                const shots = session.endCounter ? session.endCounter - session.startCounter : 0;

                return (
                  <div
                    key={session.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--clr-border)',
                      borderRadius: 'var(--r-md)',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-primary">S{session.sessionSequence}</span>
                        <strong style={{ fontSize: '0.85rem' }}>{session.partNumber}</strong>
                      </div>
                      <span className={`badge ${session.status === 'closed' ? 'badge-gray' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                        {session.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text3)' }}>
                      {session.partName} • {session.startTime} - {session.endTime || 'Running'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', paddingTop: '4px', borderTop: '1px solid var(--clr-border)' }}>
                      <span>Shots: <strong>{shots > 0 ? shots.toLocaleString() : '—'}</strong></span>
                      <span>Output: <strong style={{ color: 'var(--clr-success)' }}>{sAcc.toLocaleString()}</strong> / {sProd.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supervisor Selection & Signoff Block */}
          {activeReport.status !== 'approved' && (
            <div style={{ background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--clr-warning)' }}>
                  <span>Authorized Supervisor *</span>
                </label>
                <select
                  className="touch-select"
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  disabled={currentUser.role === 'operator'}
                >
                  <option value="">-- Select Supervisor --</option>
                  <option value="Mr. Lokesh">Mr. Lokesh</option>
                  <option value="Mr. Akshay">Mr. Akshay</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span>Supervisor Remarks</span>
                </label>
                <textarea
                  className="touch-input"
                  style={{ height: '60px', padding: '8px', fontSize: '0.85rem' }}
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="Quality notes, scrap remarks, or clearances..."
                  disabled={currentUser.role === 'operator'}
                />
              </div>
            </div>
          )}

          {activeReport.status === 'approved' && (
            <div style={{ background: 'var(--clr-success-lt)', border: '1px solid var(--clr-success)', borderRadius: 'var(--r-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--clr-success-dark)', textTransform: 'uppercase', fontWeight: 700 }}>Signed off by:</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--clr-success-dark)' }}>
                  {activeReport.supervisorName || 'Mr. Lokesh'}
                </div>
              </div>
              {activeReport.supervisorNotes && (
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-text2)', fontStyle: 'italic', maxWidth: '60%' }}>
                  "{activeReport.supervisorNotes}"
                </div>
              )}
            </div>
          )}

          {/* Unlock Section for Manager */}
          {activeReport.status === 'approved' && (currentUser.role === 'production_manager' || currentUser.role === 'admin') && (
            <div style={{ background: 'var(--clr-error-lt)', border: '1px solid var(--clr-error)', borderRadius: 'var(--r-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-error-dark)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Lock size={15} />
                <span>Unlock Approved Shift Report</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="touch-input"
                  style={{ height: '42px', fontSize: '0.82rem', flex: 1 }}
                  placeholder="Reason to unlock..."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--clr-error)', borderColor: 'var(--clr-error)' }}
                  onClick={handleManagerUnlock}
                >
                  <Unlock size={14} />
                  <span>Unlock</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ flex: '1 1 calc(50% - 4px)', color: 'var(--clr-success)', borderColor: 'var(--clr-success)' }}
            onClick={() => exportShiftReportToExcel(activeReport)}
          >
            <Download size={15} />
            <span>Excel</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ flex: '1 1 calc(50% - 4px)', color: 'var(--clr-primary)', borderColor: 'var(--clr-primary)' }}
            onClick={() => exportShiftReportPDF(activeReport)}
          >
            <FileText size={15} />
            <span>PDF</span>
          </button>

          {/* Operator Action */}
          {activeReport.status === 'draft' && (currentUser.role === 'operator' || currentUser.role === 'admin') && (
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleOperatorSubmit}
            >
              <CheckCircle size={18} />
              <span>{t('btn_submit_report')}</span>
            </button>
          )}

          {/* Supervisor Action */}
          {(activeReport.status === 'submitted' || activeReport.status === 'draft') &&
            (currentUser.role === 'supervisor' || currentUser.role === 'production_manager' || currentUser.role === 'admin') && (
            <button
              type="button"
              className="btn btn-success btn-full btn-lg"
              onClick={handleSupervisorApprove}
              disabled={isEmailing}
            >
              <Mail size={18} />
              <span>{isEmailing ? 'Dispatching...' : t('btn_approve_report')}</span>
            </button>
          )}

          {/* Delete Action (Supervisor / Admin) */}
          {onDeleteReport && (currentUser.role === 'supervisor' || currentUser.role === 'production_manager' || currentUser.role === 'admin') && (
            <button
              type="button"
              className="btn btn-outline btn-full"
              style={{
                color: 'var(--clr-error)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.05)',
                marginTop: '4px'
              }}
              onClick={() => {
                onDeleteReport(activeReport.id);
                onClose();
              }}
            >
              <Trash2 size={16} />
              <span>Delete This Shift Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
