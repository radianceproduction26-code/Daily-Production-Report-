import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Zap,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { exportConsolidatedMasterSheetToExcel, exportShiftReportToExcel } from '../services/exportService';
import {
  getMasterSheetWebhookUrl,
  saveMasterSheetWebhookUrl,
  triggerMasterSheetWebhook,
  summarizeReportForMasterSync,
  syncAllReportsToGoogleSheet
} from '../services/cloudSyncService';
import { getSupabaseConfig } from '../services/storageService';
import { useI18n } from '../i18n/I18nContext';

export default function MasterSheetView({
  reports = [],
  onSelectReportForViewing,
  onRefreshCloud,
  isSyncing = false,
  lastSyncTime = null,
  onDeleteReport
}) {
  const { t } = useI18n();
  const supabaseConfig = getSupabaseConfig();
  const isCloudConnected = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState(''); // empty = all dates
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(getMasterSheetWebhookUrl());
  const [webhookTestStatus, setWebhookTestStatus] = useState(null); // 'testing', 'success', 'error'
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [pushAllStatus, setPushAllStatus] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);

  // Extract unique machines and shifts for filter dropdowns
  const availableMachines = useMemo(() => {
    const set = new Set();
    reports.forEach(r => { if (r.machineNumber) set.add(r.machineNumber); });
    return Array.from(set);
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Search
      const searchMatch = !searchTerm || (
        (r.machineNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.operatorName || r.operator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.supervisorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.partNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.partName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Date
      const dateMatch = !filterDate || r.reportDate === filterDate;

      // Shift (Shift A & Shift B)
      const shiftMatch = filterShift === 'ALL' ||
        r.shift === filterShift ||
        (filterShift === 'Shift A' && (r.shift === 'Shift 1' || r.shift === 'A')) ||
        (filterShift === 'Shift B' && (r.shift === 'Shift 2' || r.shift === 'B'));

      // Machine
      const machineMatch = filterMachine === 'ALL' || r.machineNumber === filterMachine;

      // Status
      const statusMatch = filterStatus === 'ALL' || (r.status || 'draft').toLowerCase() === filterStatus.toLowerCase();

      return searchMatch && dateMatch && shiftMatch && machineMatch && statusMatch;
    });
  }, [reports, searchTerm, filterDate, filterShift, filterMachine, filterStatus]);

  // Aggregate KPIs over filtered reports
  const kpis = useMemo(() => {
    let target = 0;
    let prod = 0;
    let acc = 0;
    let rej = 0;
    let dt = 0;

    filteredReports.forEach(r => {
      const summary = summarizeReportForMasterSync(r);
      if (summary) {
        target += summary.target_qty;
        prod += summary.production_qty;
        acc += summary.accepted_qty;
        rej += summary.rejection_qty;
        dt += summary.downtime_minutes;
      }
    });

    const rejRate = prod > 0 ? ((rej / prod) * 100).toFixed(2) : '0.00';
    const eff = target > 0 ? ((prod / target) * 100).toFixed(1) : '100.0';

    return {
      totalShifts: filteredReports.length,
      target,
      prod,
      acc,
      rej,
      rejRate,
      dt,
      eff
    };
  }, [filteredReports]);

  // Save webhook handler
  const handleSaveWebhook = () => {
    saveMasterSheetWebhookUrl(webhookUrlInput);
    alert('Google Sheets Webhook URL saved! New reports will automatically be mirrored.');
    setShowWebhookModal(false);
  };

  // Push all existing submitted reports to Google Sheet
  const handleSyncAllToGoogleSheet = async () => {
    if (!webhookUrlInput) {
      alert('Please configure and test your Google Sheet Webhook URL first.');
      return;
    }
    setIsPushingAll(true);
    setPushAllStatus(null);
    saveMasterSheetWebhookUrl(webhookUrlInput);
    const res = await syncAllReportsToGoogleSheet(reports);
    setIsPushingAll(false);
    if (res.success) {
      setPushAllStatus(`✓ Successfully sent ${res.count} submitted report(s) directly to your Google Sheet!`);
      setTimeout(() => setPushAllStatus(null), 6000);
    } else {
      setPushAllStatus(`✗ Push failed: ${res.error}`);
      setTimeout(() => setPushAllStatus(null), 6000);
    }
  };

  // Test webhook handler
  const handleTestWebhook = async () => {
    if (!webhookUrlInput) {
      alert('Please enter a Webhook URL first.');
      return;
    }
    setWebhookTestStatus('testing');
    const dummyRow = {
      id: 'test-sync-' + Date.now(),
      report_date: new Date().toISOString().split('T')[0],
      shift: 'Shift 1',
      machine_number: 'MC03',
      machine_name: 'Milacron 450T (Test)',
      operator_name: 'Test Operator',
      supervisor_name: 'Mr. Lokesh',
      part_number: 'TEST-PART-01',
      part_name: 'Sample Production Item',
      target_qty: 1000,
      production_qty: 980,
      accepted_qty: 960,
      rejection_qty: 20,
      rejection_rate: 2.04,
      downtime_minutes: 15,
      efficiency_percent: 98.0,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };

    saveMasterSheetWebhookUrl(webhookUrlInput);
    const res = await triggerMasterSheetWebhook(dummyRow);
    if (res.sent) {
      setWebhookTestStatus('success');
      setTimeout(() => setWebhookTestStatus(null), 4000);
    } else {
      setWebhookTestStatus('error');
      setTimeout(() => setWebhookTestStatus(null), 4000);
    }
  };

  const googleAppsScriptCode = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Date", "Shift", "Machine", "Part Number", "Part Name",
        "Operator", "Supervisor", "Target Qty", "Production Qty",
        "Accepted Qty", "Rejection Qty", "Rejection %", "Downtime (Min)",
        "Efficiency %", "Lumps (Kg)", "Status", "Submitted At"
      ]);
    }
    sheet.appendRow([
      data.date || "",
      data.shift || "",
      data.machineNumber || "",
      data.partNumber || "",
      data.partName || "",
      data.operatorName || "",
      data.supervisorName || "",
      data.targetQty || 0,
      data.productionQty || 0,
      data.acceptedQty || 0,
      data.rejectionQty || 0,
      (data.rejectionRatePercent !== undefined ? data.rejectionRatePercent + "%" : "0%"),
      data.downtimeMinutes || 0,
      (data.efficiencyPercent !== undefined ? data.efficiencyPercent + "%" : "100%"),
      ((data.lumps_generated_kg || data.lumpsGeneratedKg || 0) + " kg"),
      data.status || "submitted",
      data.submittedAt || new Date().toISOString()
    ]);
    return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)', width: '100%', maxWidth: '100%' }}>
      
      {/* ─── Top Executive Master Control Bar ─── */}
      <div className="card" style={{ padding: 'var(--gap-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Title & Cloud Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
                  Master Production Sheet
                </h2>
                {/* Cloud Live Status Pill */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: isCloudConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: isCloudConnected ? '#059669' : '#d97706',
                  border: `1px solid ${isCloudConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isCloudConnected ? '#10b981' : '#f59e0b',
                    boxShadow: isCloudConnected ? '0 0 8px #10b981' : 'none'
                  }} />
                  {isSyncing ? 'Syncing...' : (isCloudConnected ? '🟢 Supabase Cloud Live' : '🟠 Local Storage Mode')}
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: '3px 0 0 0' }}>
                Live consolidated factory production ledger | Automatic laptop reflection on report submission
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onRefreshCloud}
              disabled={isSyncing}
              title="Pull latest submissions from Supabase Cloud"
            >
              <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowWebhookModal(true)}
              title="Connect to a Google Sheet on your laptop"
            >
              <ExternalLink size={14} />
              <span>Link Google Sheet</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => exportConsolidatedMasterSheetToExcel(filteredReports)}
              title="Download Master Sheet as Excel file"
            >
              <Download size={14} />
              <span>Download Master Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* KPI Aggregate Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-surface2)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', fontWeight: 600 }}>Total Shifts</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text)' }}>{kpis.totalShifts}</div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-surface2)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', fontWeight: 600 }}>Gross Output</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>{kpis.prod.toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>pcs</span></div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)' }}>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Accepted Qty</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{kpis.acc.toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>pcs</span></div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: Number(kpis.rejRate) > 3 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-surface2)' }}>
            <div style={{ fontSize: '0.72rem', color: Number(kpis.rejRate) > 3 ? '#dc2626' : 'var(--clr-text3)', fontWeight: 600 }}>Rejections</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: Number(kpis.rejRate) > 3 ? '#dc2626' : 'var(--clr-text)' }}>
              {kpis.rej.toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>({kpis.rejRate}%)</span>
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-surface2)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', fontWeight: 600 }}>Total Downtime</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{kpis.dt} <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>min</span></div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-surface2)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', fontWeight: 600 }}>Avg Efficiency</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>{kpis.eff}%</div>
          </div>
        </div>
      </div>

      {/* ─── Search & Advanced Filter Controls ─── */}
      <div className="card" style={{ padding: '12px var(--gap-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          
          {/* Search Input */}
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text3)' }} />
            <input
              type="text"
              placeholder="Search by part, operator, machine..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '0.82rem',
                background: 'var(--bg-surface2)',
                color: 'var(--clr-text)'
              }}
            />
          </div>

          {/* Date Picker */}
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              background: 'var(--bg-surface2)',
              color: 'var(--clr-text)'
            }}
          />
          {filterDate && (
            <button
              type="button"
              onClick={() => setFilterDate('')}
              style={{ background: 'none', border: 'none', color: 'var(--clr-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear Date
            </button>
          )}

          {/* Shift Filter */}
          <select
            value={filterShift}
            onChange={e => setFilterShift(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              background: 'var(--bg-surface2)',
              color: 'var(--clr-text)'
            }}
          >
            <option value="ALL">All Shifts</option>
            <option value="Shift A">Shift A (08:00 - 20:00)</option>
            <option value="Shift B">Shift B (20:00 - 08:00)</option>
          </select>

          {/* Machine Filter */}
          <select
            value={filterMachine}
            onChange={e => setFilterMachine(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              background: 'var(--bg-surface2)',
              color: 'var(--clr-text)'
            }}
          >
            <option value="ALL">All Machines</option>
            {availableMachines.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              background: 'var(--bg-surface2)',
              color: 'var(--clr-text)'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft (In Progress)</option>
          </select>

          <span style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', marginLeft: 'auto' }}>
            Showing <strong>{filteredReports.length}</strong> of {reports.length} records
          </span>
        </div>
      </div>

      {/* ─── Master Spreadsheet Ledger Table ─── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1B365D', color: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Shift</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Machine</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Tool / Part #</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Part Description</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Operator</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Target</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Produced</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Accepted</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Rejections</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Rej Rate</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Downtime</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Efficiency</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Lumps (kg)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--clr-text3)' }}>
                    <AlertTriangle size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No production shift records found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => {
                  const s = summarizeReportForMasterSync(report);
                  const isSubmitted = report.status === 'submitted' || report.status === 'approved';
                  const isApproved = report.status === 'approved';
                  const isHighRej = Number(s.rejection_rate) > 3.0;

                  return (
                    <tr
                      key={report.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface2)',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {report.reportDate}
                      </td>

                      {/* Shift */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: report.shift?.includes('1') ? 'rgba(59, 130, 246, 0.12)' : (report.shift?.includes('2') ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)'),
                          color: report.shift?.includes('1') ? '#2563eb' : (report.shift?.includes('2') ? '#d97706' : '#7c3aed'),
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {report.shift}
                        </span>
                      </td>

                      {/* Machine */}
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--clr-text)' }}>
                        {report.machineNumber || 'MC03'}
                      </td>

                      {/* Tool / Part Number */}
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-primary)' }}>
                        {s.part_number || '-'}
                      </td>

                      {/* Part Description */}
                      <td style={{ padding: '10px 12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.part_name || '-'}
                      </td>

                      {/* Operator */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {report.operatorName || report.operator_name || 'Operator'}
                      </td>

                      {/* Target */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--clr-text3)' }}>
                        {s.target_qty.toLocaleString()}
                      </td>

                      {/* Produced */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {s.production_qty.toLocaleString()}
                      </td>

                      {/* Accepted */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {s.accepted_qty.toLocaleString()}
                      </td>

                      {/* Rejections */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isHighRej ? '#dc2626' : 'var(--clr-text)' }}>
                        {s.rejection_qty.toLocaleString()}
                      </td>

                      {/* Rej Rate */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isHighRej ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                          color: isHighRej ? '#dc2626' : '#059669'
                        }}>
                          {s.rejection_rate}%
                        </span>
                      </td>

                      {/* Downtime */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: s.downtime_minutes > 30 ? '#d97706' : 'var(--clr-text3)', fontWeight: s.downtime_minutes > 30 ? 700 : 500 }}>
                        {s.downtime_minutes} m
                      </td>

                      {/* Efficiency */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--clr-primary)' }}>
                        {s.efficiency_percent}%
                      </td>

                      {/* Lumps (kg) */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--clr-text)' }}>
                        {(report.lumpsGeneratedKg !== undefined && report.lumpsGeneratedKg !== null ? report.lumpsGeneratedKg : 0)} kg
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {isApproved ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        ) : isSubmitted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb' }}>
                            <Clock size={12} /> Submitted
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(148, 163, 184, 0.15)', color: 'var(--clr-text3)' }}>
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => onSelectReportForViewing(report)}
                            title="Open detailed hourly breakdown"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => exportShiftReportToExcel(report)}
                            title="Download Shift Excel"
                          >
                            <Download size={12} />
                          </button>
                          {onDeleteReport && (
                            <button
                              type="button"
                              className="btn btn-outline btn-xs"
                              onClick={() => onDeleteReport(report.id)}
                              title="Delete this shift report"
                              style={{
                                color: 'var(--clr-error)',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                background: 'rgba(239, 68, 68, 0.05)'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
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

      {/* ─── Google Sheets Webhook Configuration Modal ─── */}
      {showWebhookModal && (
        <div className="modal-backdrop" onClick={() => setShowWebhookModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px', padding: 'var(--gap-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ExternalLink size={22} color="var(--clr-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Link to Laptop Google Sheet
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowWebhookModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--clr-text2)', lineHeight: 1.5, marginBottom: '16px' }}>
              Whenever any shift report is submitted on the floor, it will instantly append a new row directly into your personal Google Sheet on your laptop!
            </p>

            {/* Step 1: Webhook URL Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                Google Apps Script Web App URL:
              </label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrlInput}
                onChange={e => setWebhookUrlInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.84rem',
                  background: 'var(--bg-surface)',
                  color: 'var(--clr-text)'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleTestWebhook}
                  disabled={webhookTestStatus === 'testing'}
                >
                  <Zap size={14} />
                  <span>{webhookTestStatus === 'testing' ? 'Sending Test...' : 'Test Connection'}</span>
                </button>
                {webhookTestStatus === 'success' && (
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, alignSelf: 'center' }}>
                    ✓ Test row sent to Google Sheet!
                  </span>
                )}
                {webhookTestStatus === 'error' && (
                  <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, alignSelf: 'center' }}>
                    ✗ Webhook request failed. Check URL.
                  </span>
                )}
              </div>
            </div>

            {/* Step 2: 1-Click Google Apps Script Copy */}
            <div style={{ background: 'var(--bg-surface2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--clr-text)' }}>
                  Google Apps Script (Copy & Paste in Google Sheets):
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={copyScriptToClipboard}
                >
                  {copiedScript ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.2)',
                padding: '8px',
                borderRadius: '4px',
                overflowX: 'auto',
                maxHeight: '130px'
              }}>
                {googleAppsScriptCode}
              </pre>
              <ol style={{ fontSize: '0.75rem', color: 'var(--clr-text3)', margin: '8px 0 0 16px', padding: 0 }}>
                <li>Open your Google Sheet on your laptop.</li>
                <li>Click <strong>Extensions &gt; Apps Script</strong> and paste this code.</li>
                <li>Click <strong>Deploy &gt; New Deployment &gt; Web App</strong> (Execute as: Me, Access: Anyone).</li>
                <li>Paste the provided Web App URL into the box above.</li>
              </ol>
            </div>

            {pushAllStatus && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '14px',
                background: pushAllStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: pushAllStatus.startsWith('✓') ? '#059669' : '#dc2626',
                border: pushAllStatus.startsWith('✓') ? '1px solid #10b981' : '1px solid #ef4444'
              }}>
                {pushAllStatus}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleSyncAllToGoogleSheet}
                disabled={isPushingAll || !webhookUrlInput}
                title="Send all submitted shift reports in the app to your Google Sheet"
                style={{ borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}
              >
                <RefreshCw size={14} className={isPushingAll ? 'spin' : ''} />
                <span>{isPushingAll ? 'Syncing to Google Sheet...' : 'Sync All Reports to Google Sheet Now'}</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowWebhookModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveWebhook}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
