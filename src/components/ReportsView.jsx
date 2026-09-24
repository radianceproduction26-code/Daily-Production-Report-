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
  FileText,
  Trash2
} from 'lucide-react';
import { exportShiftReportToExcel, exportShiftReportPDF, sendDailyProductionSummaryEmail } from '../services/exportService';
import { getSystemSettings } from '../services/storageService';
import { useI18n } from '../i18n/I18nContext';

export default function ReportsView({ reports = [], machines = [], rejectionCodes = [], downtimeCodes = [], onSelectReportForViewing, onDeleteReport }) {
  const { t, language } = useI18n();
  const [reportType, setReportType] = useState('shift'); // 'shift', 'daily', 'rejection', 'downtime', 'material'
  const [filterDate, setFilterDate] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
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
    const matchMachine = selectedMachine === 'ALL' || r.machineNumber === selectedMachine;
    return matchDate && matchMachine;
  });

  // Calculate detailed analyses across filtered reports
  // 1. Rejection breakdown
  const rejectionStats = {};
  let totalRejectionPieces = 0;
  let totalGrossProduction = 0;
  let totalAcceptedPieces = 0;
  let totalDowntimeMinutes = 0;
  let totalLumpsAccumulatedKg = 0;

  // 2. Downtime breakdown
  const downtimeStats = {};

  // 3. Material tracking
  const materialStats = {};

  // 4. Daily aggregations
  const dailyStats = {};

  filtered.forEach(rep => {
    const dateKey = rep.reportDate || 'Unknown Date';
    totalLumpsAccumulatedKg += Number(rep.lumpsGeneratedKg) || 0;

    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        date: dateKey,
        shiftsCount: 0,
        productionQty: 0,
        acceptedQty: 0,
        rejectionQty: 0,
        downtimeMin: 0,
        lumpsKg: 0,
        machines: new Set(),
        supervisors: new Set()
      };
    }
    dailyStats[dateKey].shiftsCount += 1;
    dailyStats[dateKey].lumpsKg += Number(rep.lumpsGeneratedKg) || 0;
    if (rep.machineNumber) dailyStats[dateKey].machines.add(rep.machineNumber);
    if (rep.supervisorName) dailyStats[dateKey].supervisors.add(rep.supervisorName);

    const sessions = rep.mouldSessions || rep.sessions || [];
    sessions.forEach(sess => {
      // Material accounting
      const matGrade = sess.rawMaterialGrade || sess.materialGrade || 'Standard Resin';
      const matLot = sess.materialBatchNo || sess.batchNumber || sess.rawMaterialLotNo || 'LOT-N/A';
      const matKey = `${matGrade}__${matLot}`;

      if (!materialStats[matKey]) {
        materialStats[matKey] = {
          grade: matGrade,
          lot: matLot,
          usedKg: 0,
          purgedKg: 0,
          regreedKg: 0,
          partNumber: sess.partNumber || '—'
        };
      }
      materialStats[matKey].usedKg += Number(sess.rawMaterialKgUsed || sess.materialUsedKg || sess.materialIssuedKg) || 0;
      materialStats[matKey].purgedKg += Number(sess.purgeKg || sess.lumpsKg) || 0;
      materialStats[matKey].regreedKg += Number(sess.regrindKg || sess.regrindUsedKg) || 0;

      (sess.entries || []).forEach(e => {
        const prod = Number(e.productionQty) || 0;
        const acc = Number(e.acceptedQty) || 0;
        const rej = Number(e.rejectionQty) || 0;
        const dt = Number(e.downtimeMinutes) || 0;

        totalGrossProduction += prod;
        totalAcceptedPieces += acc;
        totalRejectionPieces += rej;
        totalDowntimeMinutes += dt;

        dailyStats[dateKey].productionQty += prod;
        dailyStats[dateKey].acceptedQty += acc;
        dailyStats[dateKey].rejectionQty += rej;
        dailyStats[dateKey].downtimeMin += dt;

        // Rejection Breakdown
        if (Array.isArray(e.rejectionBreakdown) && e.rejectionBreakdown.length > 0) {
          e.rejectionBreakdown.forEach(rb => {
            const code = rb.code || 'REJ';
            const q = Number(rb.qty || rb.quantity) || 0;
            if (q > 0) {
              if (!rejectionStats[code]) {
                const master = rejectionCodes.find(r => r.code === code);
                rejectionStats[code] = {
                  code,
                  reason: rb.reason || rb.description || master?.description || `Defect ${code}`,
                  qty: 0,
                  affectedParts: new Set(),
                  affectedMachines: new Set()
                };
              }
              rejectionStats[code].qty += q;
              if (sess.partNumber) rejectionStats[code].affectedParts.add(sess.partNumber);
              if (rep.machineNumber) rejectionStats[code].affectedMachines.add(rep.machineNumber);
            }
          });
        } else if (rej > 0) {
          const code = e.primaryRejectionCode || 'REJ';
          if (!rejectionStats[code]) {
            const master = rejectionCodes.find(r => r.code === code);
            rejectionStats[code] = {
              code,
              reason: e.rejectionReason || master?.description || `Defect ${code}`,
              qty: 0,
              affectedParts: new Set(),
              affectedMachines: new Set()
            };
          }
          rejectionStats[code].qty += rej;
          if (sess.partNumber) rejectionStats[code].affectedParts.add(sess.partNumber);
          if (rep.machineNumber) rejectionStats[code].affectedMachines.add(rep.machineNumber);
        }

        // Downtime Breakdown
        if (Array.isArray(e.downtimeBreakdown) && e.downtimeBreakdown.length > 0) {
          e.downtimeBreakdown.forEach(db => {
            const code = db.code || 'DT';
            const mins = Number(db.minutes) || 0;
            if (mins > 0) {
              if (!downtimeStats[code]) {
                const master = downtimeCodes.find(d => d.code === code);
                downtimeStats[code] = {
                  code,
                  reason: db.reason || db.description || master?.description || `Stoppage ${code}`,
                  category: db.category || master?.category || 'General',
                  minutes: 0,
                  occurrences: 0,
                  affectedMachines: new Set()
                };
              }
              downtimeStats[code].minutes += mins;
              downtimeStats[code].occurrences += 1;
              if (rep.machineNumber) downtimeStats[code].affectedMachines.add(rep.machineNumber);
            }
          });
        } else if (dt > 0) {
          const code = e.primaryDowntimeCode || 'DT';
          if (!downtimeStats[code]) {
            const master = downtimeCodes.find(d => d.code === code);
            downtimeStats[code] = {
              code,
              reason: e.downtimeReason || master?.description || `Stoppage ${code}`,
              category: master?.category || 'General',
              minutes: 0,
              occurrences: 0,
              affectedMachines: new Set()
            };
          }
          downtimeStats[code].minutes += dt;
          downtimeStats[code].occurrences += 1;
          if (rep.machineNumber) downtimeStats[code].affectedMachines.add(rep.machineNumber);
        }
      });
    });
  });

  const sortedRejectionList = Object.values(rejectionStats).sort((a, b) => b.qty - a.qty);
  const sortedDowntimeList = Object.values(downtimeStats).sort((a, b) => b.minutes - a.minutes);
  const sortedMaterialList = Object.values(materialStats);
  const sortedDailyList = Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date));

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
              <option value="ALL">All Machines</option>
              {machines.map(m => (
                <option key={m.id || m.machineNumber} value={m.machineNumber}>
                  {m.machineNumber} {m.machineName ? `(${m.machineName})` : ''}
                </option>
              ))}
              {!machines.some(m => m.machineNumber === 'MC03') && (
                <option value="MC03">Machine No 3 (MC03)</option>
              )}
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

      {/* ============================================================ */}
      {/* 1. REJECTION REPORT VIEW                                      */}
      {/* ============================================================ */}
      {reportType === 'rejection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="kpi-deck">
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-error)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-error)' }}>Total Rejection Scrap</div>
              <div className="kpi-val" style={{ color: 'var(--clr-error)' }}>{totalRejectionPieces.toLocaleString()} pcs</div>
              <div className="kpi-sub">
                {totalGrossProduction > 0 ? ((totalRejectionPieces / totalGrossProduction) * 100).toFixed(2) : 0}% of gross production
              </div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Gross Production</div>
              <div className="kpi-val">{totalGrossProduction.toLocaleString()} pcs</div>
              <div className="kpi-sub">Accepted: {totalAcceptedPieces.toLocaleString()} pcs</div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>Active Defect Types</div>
              <div className="kpi-val">{sortedRejectionList.length}</div>
              <div className="kpi-sub">Distinct defect reasons captured</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-surface2)', borderBottom: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem' }}>Submitted Rejection Pareto Analysis</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>Sorted by Scrap Quantity</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="production-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Defect Code</th>
                    <th>Rejection Reason</th>
                    <th>Scrap Qty (pcs)</th>
                    <th>Share %</th>
                    <th>Cumulative %</th>
                    <th>Affected Machines</th>
                    <th>Affected Parts</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRejectionList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--clr-text3)' }}>
                        No rejection defects recorded in the submitted reports.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let cumSum = 0;
                      return sortedRejectionList.map((item, idx) => {
                        cumSum += item.qty;
                        const pct = totalRejectionPieces > 0 ? ((item.qty / totalRejectionPieces) * 100).toFixed(1) : 0;
                        const cumPct = totalRejectionPieces > 0 ? ((cumSum / totalRejectionPieces) * 100).toFixed(1) : 0;
                        const isPareto80 = Number(cumPct) <= 80 || (cumSum - item.qty < totalRejectionPieces * 0.8);

                        return (
                          <tr key={item.code}>
                            <td>
                              <span className="badge badge-error" style={{ fontSize: '11px', padding: '1px 6px', fontWeight: 800 }}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--clr-error)' }}>[{item.code}]</strong>
                              {isPareto80 && <span className="badge badge-amber" style={{ marginLeft: '6px', fontSize: '9px' }}>80/20</span>}
                            </td>
                            <td><strong>{item.reason}</strong></td>
                            <td className="num-cell rejection">{item.qty.toLocaleString()}</td>
                            <td className="num-cell">{pct}%</td>
                            <td className="num-cell" style={{ color: 'var(--clr-primary)', fontWeight: 700 }}>{cumPct}%</td>
                            <td>{Array.from(item.affectedMachines).join(', ') || '—'}</td>
                            <td>{Array.from(item.affectedParts).join(', ') || '—'}</td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. DOWNTIME REPORT VIEW                                      */}
      {/* ============================================================ */}
      {reportType === 'downtime' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="kpi-deck">
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>Total Downtime Loss</div>
              <div className="kpi-val" style={{ color: 'var(--clr-warning)' }}>{totalDowntimeMinutes} min</div>
              <div className="kpi-sub">{(totalDowntimeMinutes / 60).toFixed(1)} lost production hours</div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Stoppage Incidents</div>
              <div className="kpi-val">
                {sortedDowntimeList.reduce((acc, curr) => acc + curr.occurrences, 0)}
              </div>
              <div className="kpi-sub">Logged across hourly cycles</div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>Unique Stoppage Causes</div>
              <div className="kpi-val">{sortedDowntimeList.length}</div>
              <div className="kpi-sub">Distinct downtime reasons</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-surface2)', borderBottom: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem' }}>Submitted Downtime Loss Analysis</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>Ranked by Stoppage Duration</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="production-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Code</th>
                    <th>Stoppage Reason</th>
                    <th>Category</th>
                    <th>Incidents</th>
                    <th>Lost Minutes</th>
                    <th>Lost Hours</th>
                    <th>Share %</th>
                    <th>Affected Machines</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDowntimeList.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--clr-text3)' }}>
                        No downtime stoppages recorded in the submitted reports.
                      </td>
                    </tr>
                  ) : (
                    sortedDowntimeList.map((item, idx) => {
                      const pct = totalDowntimeMinutes > 0 ? ((item.minutes / totalDowntimeMinutes) * 100).toFixed(1) : 0;
                      return (
                        <tr key={item.code}>
                          <td>
                            <span className="badge badge-amber" style={{ fontSize: '11px', padding: '1px 6px', fontWeight: 800 }}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td><strong style={{ color: 'var(--clr-warning)' }}>[{item.code}]</strong></td>
                          <td><strong>{item.reason}</strong></td>
                          <td><span className="badge badge-gray">{item.category}</span></td>
                          <td className="num-cell">{item.occurrences}</td>
                          <td className="num-cell downtime">{item.minutes} min</td>
                          <td className="num-cell">{(item.minutes / 60).toFixed(1)} h</td>
                          <td className="num-cell" style={{ fontWeight: 700 }}>{pct}%</td>
                          <td>{Array.from(item.affectedMachines).join(', ') || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MATERIAL ACCOUNTING & PURGE LUMPS REPORT                  */}
      {/* ============================================================ */}
      {reportType === 'material' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="kpi-deck">
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Total Material Issued / Used</div>
              <div className="kpi-val">
                {sortedMaterialList.reduce((acc, curr) => acc + curr.usedKg, 0).toFixed(1)} kg
              </div>
              <div className="kpi-sub">Across active resin grades</div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>Total Lumps Generated</div>
              <div className="kpi-val" style={{ color: 'var(--clr-warning)' }}>{totalLumpsAccumulatedKg.toFixed(1)} kg</div>
              <div className="kpi-sub">Purge lumps reported by supervisors</div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>Regrind Re-utilized</div>
              <div className="kpi-val">
                {sortedMaterialList.reduce((acc, curr) => acc + curr.regreedKg, 0).toFixed(1)} kg
              </div>
              <div className="kpi-sub">Recycled back into process</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-surface2)', borderBottom: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem' }}>Submitted Raw Material & Lumps Summary</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>Batch & Grade Traceability</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="production-table">
                <thead>
                  <tr>
                    <th>Grade / Resin</th>
                    <th>Batch / Lot No</th>
                    <th>Associated Part</th>
                    <th>Material Used (kg)</th>
                    <th>Purge Waste (kg)</th>
                    <th>Regrind (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMaterialList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--clr-text3)' }}>
                        No material batches recorded in current shift reports.
                      </td>
                    </tr>
                  ) : (
                    sortedMaterialList.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.grade}</strong></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)' }}>{item.lot}</span></td>
                        <td>{item.partNumber}</td>
                        <td className="num-cell">{item.usedKg.toFixed(1)} kg</td>
                        <td className="num-cell" style={{ color: 'var(--clr-warning)', fontWeight: 700 }}>{item.purgedKg.toFixed(1)} kg</td>
                        <td className="num-cell">{item.regreedKg.toFixed(1)} kg</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DAILY SUMMARY REPORT VIEW                                 */}
      {/* ============================================================ */}
      {reportType === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="kpi-deck">
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Daily Production (Total)</div>
              <div className="kpi-val">{totalGrossProduction.toLocaleString()} pcs</div>
              <div className="kpi-sub">Across {sortedDailyList.length} production dates</div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>Total Accepted</div>
              <div className="kpi-val" style={{ color: 'var(--clr-success)' }}>{totalAcceptedPieces.toLocaleString()} pcs</div>
              <div className="kpi-sub">
                {totalGrossProduction > 0 ? ((totalAcceptedPieces / totalGrossProduction) * 100).toFixed(1) : 100}% Quality Yield
              </div>
            </div>
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>Total Lumps Purged</div>
              <div className="kpi-val" style={{ color: 'var(--clr-warning)' }}>{totalLumpsAccumulatedKg.toFixed(1)} kg</div>
              <div className="kpi-sub">Total downtime: {totalDowntimeMinutes} min</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-surface2)', borderBottom: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem' }}>Submitted Daily Production Summaries</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>Aggregated per Production Day</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="production-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shifts</th>
                    <th>Machines</th>
                    <th>Gross Production</th>
                    <th>Accepted (pcs)</th>
                    <th>Rejections (pcs)</th>
                    <th>Rej Rate %</th>
                    <th>Downtime (min)</th>
                    <th>Lumps (kg)</th>
                    <th>Supervisors</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDailyList.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--clr-text3)' }}>
                        No daily production records found for current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedDailyList.map(item => {
                      const rejRate = item.productionQty > 0 ? ((item.rejectionQty / item.productionQty) * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={item.date}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{item.date}</td>
                          <td><span className="badge badge-primary">{item.shiftsCount} Shifts</span></td>
                          <td>{Array.from(item.machines).join(', ') || '—'}</td>
                          <td className="num-cell" style={{ fontWeight: 700 }}>{item.productionQty.toLocaleString()}</td>
                          <td className="num-cell accepted">{item.acceptedQty.toLocaleString()}</td>
                          <td className="num-cell rejection">{item.rejectionQty.toLocaleString()}</td>
                          <td className="num-cell" style={{ color: 'var(--clr-error)' }}>{rejRate}%</td>
                          <td className="num-cell downtime">{item.downtimeMin} min</td>
                          <td className="num-cell" style={{ color: 'var(--clr-warning)', fontWeight: 700 }}>{item.lumpsKg.toFixed(1)} kg</td>
                          <td>{Array.from(item.supervisors).join(', ') || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SHIFT REPORTS TABLE & MOBILE CARDS (DEFAULT)              */}
      {/* ============================================================ */}
      {reportType === 'shift' && (
        <>
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
                  {onDeleteReport && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--clr-error)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      onClick={() => onDeleteReport(rep.id)}
                      title="Delete Shift Report"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  )}
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
                        {onDeleteReport && (
                          <button
                            type="button"
                            className="btn-log-hour"
                            style={{ height: '32px', padding: '0 10px', color: 'var(--clr-error)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            onClick={() => onDeleteReport(rep.id)}
                            title="Delete Shift Report"
                          >
                            <Trash2 size={14} />
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
      </>
      )}

    </div>
  );
}
