import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  Filter,
  Eye,
  CheckCircle2,
  Globe,
  Mail,
  Send,
  FileText
} from 'lucide-react';
import { exportShiftReportToExcel, exportShiftReportPDF, sendDailyProductionSummaryEmail } from '../services/exportService';
import { getSystemSettings } from '../services/storageService';
import { useI18n } from '../i18n/I18nContext';

export default function ReportsView({ reports = [], machines = [], onSelectReportForViewing }) {
  const { t, language } = useI18n();
  const [reportType, setReportType] = useState('shift'); // 'shift', 'daily', 'machine', 'rejection', 'downtime', 'material'
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMachine, setSelectedMachine] = useState('MC03');
  const [exportLanguage, setExportLanguage] = useState(language || 'en');
  const [emailingReportId, setEmailingReportId] = useState(null);
  const [emailSuccessResult, setEmailSuccessResult] = useState(null);

  const handleSendSummaryEmail = async (rep) => {
    setEmailingReportId(rep.id);
    const settings = getSystemSettings();
    const result = await sendDailyProductionSummaryEmail(rep, settings.autoEmailRecipients);
    setEmailSuccessResult(result);
    setEmailingReportId(null);
    setTimeout(() => {
      setEmailSuccessResult(null);
    }, 6000);
  };

  const filtered = reports.filter(r => {
    const matchDate = filterDate ? r.reportDate === filterDate : true;
    const matchMachine = selectedMachine === 'ALL' || r.machineNumber === selectedMachine || r.machineNumber === 'MC03' || (r.machineNumber || '').includes('3');
    return matchDate && matchMachine;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
      
      {/* Header Bar */}
      <div className="card" style={{ padding: 'var(--gap-md)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--clr-success)" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
                {t('reports_hub_title')}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: '2px 0 0 0' }}>
                Audit-ready shift reports & Excel exports
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm hide-on-mobile"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>

        {/* Report Type Selector Pills (Horizontally Scrollable on Mobile) */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'shift', label: t('tab_shift_report') },
            { id: 'daily', label: t('tab_daily_summary') },
            { id: 'rejection', label: t('tab_rejection_report') },
            { id: 'downtime', label: t('tab_downtime_report') },
            { id: 'material', label: t('tab_material_report') }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-full)',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: reportType === tab.id ? 'var(--clr-primary)' : 'var(--bg-surface2)',
                color: reportType === tab.id ? '#ffffff' : 'var(--clr-text2)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="card" style={{ padding: 'var(--gap-sm) var(--gap-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clr-text3)' }}>Date</span>
            <input
              type="date"
              className="touch-input"
              style={{ height: '42px', fontSize: '0.85rem' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clr-text3)' }}>Machine</span>
            <select
              className="touch-select"
              style={{ height: '42px', fontSize: '0.85rem' }}
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              <option value="MC03">Machine No 3 (MC03)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clr-text3)' }}>Language</span>
            <select
              className="touch-select"
              style={{ height: '42px', fontSize: '0.85rem' }}
              value={exportLanguage}
              onChange={(e) => setExportLanguage(e.target.value)}
            >
              <option value="en">English (.xlsx)</option>
              <option value="hi">हिंदी (.xlsx)</option>
              <option value="bilingual">Bilingual (.xlsx)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email Dispatched Alert Banner */}
      {emailSuccessResult && (
        <div className="alert alert-success">
          <Mail size={18} color="var(--clr-success)" />
          <div style={{ fontSize: '0.82rem' }}>
            <strong>Email Dispatched</strong> to {emailSuccessResult.recipients?.join(', ')}
          </div>
        </div>
      )}

      {/* MOBILE REPORT CARDS (visible <= 640px via CSS) */}
      <div className="report-card-list">
        {filtered.length === 0 ? (
          <div className="card text-center" style={{ padding: '32px 16px', color: 'var(--clr-text3)' }}>
            No shift reports match current filters.
          </div>
        ) : (
          filtered.map((rep) => {
            let pTotal = 0;
            let aTotal = 0;
            let rTotal = 0;
            let dtTotal = 0;

            rep.mouldSessions.forEach(s => {
              (s.entries || []).forEach(e => {
                pTotal += Number(e.productionQty) || 0;
                aTotal += Number(e.acceptedQty) || 0;
                rTotal += Number(e.rejectionQty) || 0;
                dtTotal += Number(e.downtimeMinutes) || 0;
              });
            });

            const isCurrentlyEmailing = emailingReportId === rep.id;
            const firstPart = rep.mouldSessions?.[0]?.partNumber || '—';

            return (
              <div key={rep.id} className="report-card">
                <div className="report-card-body">
                  <div className="report-card-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-primary">{rep.machineNumber}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{rep.shift}</span>
                    </div>
                    <span className={`badge ${rep.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                      {rep.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="report-card-grid">
                    <div className="report-card-row">
                      <span className="report-card-key">Date</span>
                      <span className="report-card-val">{rep.reportDate}</span>
                    </div>
                    <div className="report-card-row">
                      <span className="report-card-key">Part / Tool</span>
                      <span className="report-card-val" style={{ color: 'var(--clr-primary)' }}>{firstPart}</span>
                    </div>
                    <div className="report-card-row">
                      <span className="report-card-key">Operator</span>
                      <span className="report-card-val">{rep.operator_name || rep.operatorName || 'Operator'}</span>
                    </div>
                    <div className="report-card-row">
                      <span className="report-card-key">Supervisor</span>
                      <span className="report-card-val">{rep.supervisorName || '—'}</span>
                    </div>
                    <div className="report-card-row">
                      <span className="report-card-key">Produced / Accepted</span>
                      <span className="report-card-val">{pTotal.toLocaleString()} / <strong style={{ color: 'var(--clr-success)' }}>{aTotal.toLocaleString()}</strong></span>
                    </div>
                    <div className="report-card-row">
                      <span className="report-card-key">Rej / Downtime</span>
                      <span className="report-card-val"><span style={{ color: 'var(--clr-error)' }}>{rTotal}</span> / <span style={{ color: 'var(--clr-orange)' }}>{dtTotal}m</span></span>
                    </div>
                  </div>
                </div>

                <div className="report-card-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onSelectReportForViewing(rep)}
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => exportShiftReportToExcel(rep)}
                  >
                    <Download size={14} />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--clr-primary)', borderColor: 'var(--clr-primary)' }}
                    onClick={() => exportShiftReportPDF(rep)}
                  >
                    <FileText size={14} />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSendSummaryEmail(rep)}
                    disabled={isCurrentlyEmailing}
                  >
                    <Mail size={14} />
                    <span>{isCurrentlyEmailing ? '...' : 'Email'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE (hidden <= 640px via CSS) */}
      <div className="reports-table-container card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="production-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>{t('active_shift')}</th>
              <th>{t('active_machine')}</th>
              <th>{t('role_operator')}</th>
              <th>{t('role_supervisor')}</th>
              <th>{t('session')}s</th>
              <th>{t('col_production')}</th>
              <th>{t('col_accepted')}</th>
              <th>{t('col_rejection')}</th>
              <th>{t('col_downtime')}</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>{t('col_action')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text3)' }}>
                  No shift reports match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((rep) => {
                let pTotal = 0;
                let aTotal = 0;
                let rTotal = 0;
                let dtTotal = 0;

                rep.mouldSessions.forEach(s => {
                  (s.entries || []).forEach(e => {
                    pTotal += Number(e.productionQty) || 0;
                    aTotal += Number(e.acceptedQty) || 0;
                    rTotal += Number(e.rejectionQty) || 0;
                    dtTotal += Number(e.downtimeMinutes) || 0;
                  });
                });

                const isCurrentlyEmailing = emailingReportId === rep.id;

                return (
                  <tr key={rep.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{rep.reportDate}</td>
                    <td><span className="badge badge-primary">{rep.shift}</span></td>
                    <td><strong>{rep.machineNumber}</strong></td>
                    <td>{rep.operator_name || rep.operatorName || 'Floor Operator'}</td>
                    <td>{rep.supervisorName || 'Pending'}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--clr-text3)' }}>
                        {rep.mouldSessions.length} {rep.mouldSessions.length === 1 ? 'Mould' : 'Moulds'}
                      </span>
                    </td>
                    <td className="num-cell" style={{ color: 'var(--clr-text)' }}>{pTotal.toLocaleString()}</td>
                    <td className="num-cell accepted">{aTotal.toLocaleString()}</td>
                    <td className="num-cell rejection">{rTotal.toLocaleString()}</td>
                    <td className="num-cell downtime">{dtTotal} min</td>
                    <td>
                      <span
                        className={`badge ${
                          rep.status === 'approved' ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {rep.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-log-hour"
                          style={{ height: '32px', padding: '0 10px' }}
                          onClick={() => onSelectReportForViewing(rep)}
                          title="Open in Production Console"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn-log-hour"
                          style={{ height: '32px', padding: '0 10px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                          onClick={() => exportShiftReportToExcel(rep)}
                          title="Export Single-Sheet Excel (.xlsx)"
                        >
                          <Download size={14} />
                          <span>Excel</span>
                        </button>
                        <button
                          type="button"
                          className="btn-log-hour"
                          style={{ height: '32px', padding: '0 10px', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                          onClick={() => exportShiftReportPDF(rep)}
                          title="Export Clean PDF Report (.pdf)"
                        >
                          <FileText size={14} />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          className="btn-log-hour"
                          style={{ height: '32px', padding: '0 10px', color: 'var(--clr-primary)', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                          onClick={() => handleSendSummaryEmail(rep)}
                          disabled={isCurrentlyEmailing}
                          title="Dispatch Daily Production Summary Email"
                        >
                          <Mail size={14} />
                          <span>{isCurrentlyEmailing ? 'Sending...' : 'Email'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
