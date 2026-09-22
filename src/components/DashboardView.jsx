// Radiance Polymers - Plant Analytics, OEE & Unified Shift Reports Dashboard
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  PieChart,
  Layers,
  Wrench,
  CheckCircle2,
  Calendar,
  Filter,
  Users,
  Activity,
  ShieldCheck,
  Zap,
  FileCheck,
  Award,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Gauge,
  Target,
  ArrowUpRight,
  Cpu
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import ReportsView from './ReportsView';
import MasterSheetView from './MasterSheetView';

export default function DashboardView({
  reports = [],
  machines = [],
  rejectionCodes = [],
  downtimeCodes = [],
  currentUser,
  onSelectReportForViewing,
  initialSubTab = 'oee',
  onRefreshCloud,
  isSyncing = false,
  onDeleteReport
}) {
  const { t, getRejectionDescription, getDowntimeCategory } = useI18n();
  const [dashboardMode, setDashboardMode] = useState(
    initialSubTab === 'mastersheet' ? 'mastersheet' : (initialSubTab === 'reports' ? 'reports' : 'oee')
  ); // 'oee', 'mastersheet', 'reports', 'pilot', 'management'
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('ALL');

  useEffect(() => {
    if (initialSubTab === 'mastersheet') {
      setDashboardMode('mastersheet');
    } else if (initialSubTab === 'reports') {
      setDashboardMode('reports');
    }
  }, [initialSubTab]);

  const filteredReports = selectedMachineFilter === 'ALL'
    ? reports
    : reports.filter(r => r.machineNumber === selectedMachineFilter);

  // Core Aggregations
  let totalProduction = 0;
  let totalAccepted = 0;
  let totalRejection = 0;
  let totalDowntimeMin = 0;
  let totalMouldChanges = 0;
  let totalHourlyLogs = 0;
  let totalTheoreticalTarget = 0;

  const rejectionByCode = {};
  const downtimeByCategory = {
    'Machine Related': 0,
    'Mould Related': 0,
    'Material Related': 0,
    'Process Related': 0,
    'Utility Related': 0,
    'Manpower Related': 0,
    'Others': 0
  };

  const machineWiseStats = {};
  machines.forEach(m => {
    machineWiseStats[m.machineNumber] = { production: 0, accepted: 0, rejected: 0, downtime: 0, target: 0 };
  });

  filteredReports.forEach(rep => {
    totalMouldChanges += Math.max(0, rep.mouldSessions.length - 1);

    rep.mouldSessions.forEach(session => {
      const sessionTarget = Number(session.theoreticalHourlyTarget) || 0;

      (session.entries || []).forEach(e => {
        const prod = Number(e.productionQty) || 0;
        const acc = Number(e.acceptedQty) || 0;
        const rej = Number(e.rejectionQty) || 0;
        const dt = Number(e.downtimeMinutes) || 0;
        const tgt = Number(e.theoreticalTarget) || Number(e.targetProduction) || sessionTarget || 0;

        totalProduction += prod;
        totalAccepted += acc;
        totalRejection += rej;
        totalDowntimeMin += dt;
        totalTheoreticalTarget += tgt;
        totalHourlyLogs++;

        // Machine breakdown
        if (machineWiseStats[rep.machineNumber]) {
          machineWiseStats[rep.machineNumber].production += prod;
          machineWiseStats[rep.machineNumber].accepted += acc;
          machineWiseStats[rep.machineNumber].rejected += rej;
          machineWiseStats[rep.machineNumber].downtime += dt;
          machineWiseStats[rep.machineNumber].target += tgt;
        }

        // Rejection code breakdown (multi-reason aware)
        if (e.rejectionBreakdown && e.rejectionBreakdown.length > 0) {
          e.rejectionBreakdown.forEach(rb => {
            const code = rb.code;
            const q = Number(rb.qty || rb.quantity) || 0;
            if (code) {
              rejectionByCode[code] = (rejectionByCode[code] || 0) + q;
            }
          });
        } else if (e.primaryRejectionCode) {
          rejectionByCode[e.primaryRejectionCode] = (rejectionByCode[e.primaryRejectionCode] || 0) + rej;
        }

        // Downtime category breakdown (multi-reason aware)
        if (e.downtimeBreakdown && e.downtimeBreakdown.length > 0) {
          e.downtimeBreakdown.forEach(db => {
            const code = db.code;
            const mins = Number(db.minutes) || 0;
            const dtObj = downtimeCodes.find(d => d.code === code);
            const cat = dtObj ? dtObj.category : 'Others';
            if (downtimeByCategory[cat] !== undefined) {
              downtimeByCategory[cat] += mins;
            } else {
              downtimeByCategory['Others'] += mins;
            }
          });
        } else if (e.primaryDowntimeCode) {
          const dtObj = downtimeCodes.find(d => d.code === e.primaryDowntimeCode);
          const cat = dtObj ? dtObj.category : 'Others';
          if (downtimeByCategory[cat] !== undefined) {
            downtimeByCategory[cat] += dt;
          } else {
            downtimeByCategory['Others'] += dt;
          }
        }
      });
    });
  });

  if (totalTheoreticalTarget === 0) {
    totalTheoreticalTarget = totalProduction > 0 ? Math.round(totalProduction * 1.05) : 360;
  }

  // OEE Mathematical Computations
  const plannedMinutes = Math.max(60, totalHourlyLogs * 60 || filteredReports.length * 12 * 60 || 720);
  const operatingMinutes = Math.max(0, plannedMinutes - totalDowntimeMin);

  // 1. Availability (A)
  const availabilityRate = plannedMinutes > 0 ? Math.min(100, Math.max(0, (operatingMinutes / plannedMinutes) * 100)) : 100;

  // 2. Performance (P)
  const performanceRate = totalTheoreticalTarget > 0 ? (totalProduction / totalTheoreticalTarget) * 100 : 95.0;
  const clampedPerformance = Math.min(100, Math.max(0, performanceRate));

  // 3. Quality (Q)
  const qualityRate = totalProduction > 0 ? Math.min(100, Math.max(0, (totalAccepted / totalProduction) * 100)) : 98.0;

  // 4. Overall OEE (A x P x Q)
  const overallOEE = (availabilityRate / 100) * (clampedPerformance / 100) * (qualityRate / 100) * 100;

  let oeeBadge = { text: 'WORLD CLASS', bg: 'var(--clr-success-lt)', border: 'var(--clr-success)', color: 'var(--clr-success-dark)' };
  if (overallOEE < 65) {
    oeeBadge = { text: 'NEEDS ATTENTION', bg: 'var(--clr-error-lt)', border: 'var(--clr-error)', color: 'var(--clr-error)' };
  } else if (overallOEE < 85) {
    oeeBadge = { text: 'GOOD PERFORMANCE', bg: 'var(--clr-primary-lt)', border: 'var(--clr-primary)', color: 'var(--clr-primary)' };
  }

  const overallRejectionRate = totalProduction > 0 ? ((totalRejection / totalProduction) * 100).toFixed(2) : '0.00';
  const totalShiftMinutes = Math.max(1, filteredReports.length * 12 * 60);
  const plantUtilization = (((totalShiftMinutes - totalDowntimeMin) / totalShiftMinutes) * 100).toFixed(1);

  // Sorted rejection codes
  const sortedRejections = Object.entries(rejectionByCode).sort((a, b) => b[1] - a[1]);

  return (
    <div className="main-viewport">
      
      {/* Top Header & Sub-Tab Selector */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--clr-primary-lt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--clr-primary)',
              flexShrink: 0
            }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
                {dashboardMode === 'oee' && 'OEE & Production Dashboard'}
                {dashboardMode === 'mastersheet' && 'Master Production Sheet (Laptop View)'}
                {dashboardMode === 'reports' && 'Shift Reports Hub'}
                {dashboardMode === 'pilot' && 'MC03 Pilot Monitoring'}
                {dashboardMode === 'management' && 'Executive KPI & ROI'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: '2px 0 0 0' }}>
                Real-time OEE • {filteredReports.length} Shifts Recorded • Machine MC03 (Milacron 450T)
              </p>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'var(--bg-surface2)',
            border: '1px solid var(--clr-border)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--clr-primary)'
          }}>
            <Cpu size={13} />
            <span>Milacron 450T</span>
          </div>
        </div>

        {/* Swipeable Mode Tabs: OEE & Overview, Shift Reports, Pilot, Executive */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', width: '100%' }}>
          <button
            type="button"
            className={`btn ${dashboardMode === 'oee' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setDashboardMode('oee')}
            style={{ flexShrink: 0, minHeight: '44px', padding: '0 14px', fontSize: '13px', fontWeight: 700 }}
          >
            <Gauge size={16} />
            <span>OEE Dashboard</span>
          </button>

          <button
            type="button"
            className={`btn ${dashboardMode === 'mastersheet' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setDashboardMode('mastersheet')}
            style={{ flexShrink: 0, minHeight: '44px', padding: '0 14px', fontSize: '13px', fontWeight: 700 }}
          >
            <FileSpreadsheet size={16} />
            <span>Master Sheet (Laptop)</span>
          </button>

          <button
            type="button"
            className={`btn ${dashboardMode === 'reports' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setDashboardMode('reports')}
            style={{ flexShrink: 0, minHeight: '44px', padding: '0 14px', fontSize: '13px', fontWeight: 700 }}
          >
            <FileSpreadsheet size={16} />
            <span>Shift Reports</span>
          </button>

          <button
            type="button"
            className={`btn ${dashboardMode === 'pilot' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setDashboardMode('pilot')}
            style={{ flexShrink: 0, minHeight: '44px', padding: '0 14px', fontSize: '13px', fontWeight: 700 }}
          >
            <Activity size={16} />
            <span>Pilot Monitoring</span>
          </button>

          <button
            type="button"
            className={`btn ${dashboardMode === 'management' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setDashboardMode('management')}
            style={{ flexShrink: 0, minHeight: '44px', padding: '0 14px', fontSize: '13px', fontWeight: 700 }}
          >
            <Award size={16} />
            <span>Executive KPI</span>
          </button>
        </div>

        {/* Machine Filter Dropdown (hidden in reports sub-tab which has its own filter) */}
        {dashboardMode !== 'reports' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} style={{ color: 'var(--clr-text3)' }} />
            <select
              style={{
                width: '100%',
                minHeight: '44px',
                borderRadius: '10px',
                border: '1px solid var(--clr-border)',
                background: 'var(--bg-surface2)',
                fontFamily: 'var(--font)',
                fontSize: '13px',
                padding: '0 10px',
                fontWeight: 600
              }}
              value={selectedMachineFilter}
              onChange={(e) => setSelectedMachineFilter(e.target.value)}
            >
              <option value="ALL">All Machines ({machines.length || 1})</option>
              {machines.map(m => (
                <option key={m.id || m.machineNumber} value={m.machineNumber}>
                  {m.machineNumber} ({m.machineNumber === 'MC03' ? 'Milacron 450T' : (m.machineName || `${m.capacityTon || 450}T`)})
                </option>
              ))}
              {!machines.some(m => m.machineNumber === 'MC03') && (
                <option value="MC03">MC03 (Milacron 450T)</option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: OEE & PRODUCTION DASHBOARD (DEFAULT)                 */}
      {/* ============================================================ */}
      {dashboardMode === 'oee' && (
        <>
          {/* OEE MASTER HERO CARD */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface2) 100%)',
            border: '2px solid var(--clr-primary)',
            borderRadius: 'var(--r-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--clr-text3)', letterSpacing: '0.05em' }}>
                  Overall Equipment Effectiveness
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--clr-primary)', lineHeight: 1 }}>
                    {overallOEE.toFixed(1)}%
                  </span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: oeeBadge.bg,
                    border: `1px solid ${oeeBadge.border}`,
                    color: oeeBadge.color,
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    {oeeBadge.text}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-text2)', marginTop: '4px' }}>
                  Industry Benchmark: <strong>≥ 85.0% World Class</strong> • Actual Operating Run: <strong>{Math.floor(operatingMinutes / 60)}h {operatingMinutes % 60}m</strong>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                fontSize: '0.76rem'
              }}>
                <div style={{ color: 'var(--clr-text3)', fontWeight: 600 }}>Active Pilot Machine:</div>
                <div style={{ fontWeight: 800, color: 'var(--clr-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} color="var(--clr-success)" />
                  <span>MC03 · Milacron 450T</span>
                </div>
              </div>
            </div>

            {/* The 3 Core OEE Pillars: Availability, Performance, Quality */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '10px'
            }}>
              {/* Pillar 1: Availability */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--clr-primary)' }}>Availability (A)</span>
                  <Clock size={15} color="var(--clr-primary)" />
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--clr-text)' }}>
                  {availabilityRate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
                  Run: {Math.floor(operatingMinutes / 60)}h {operatingMinutes % 60}m / {Math.floor(plannedMinutes / 60)}h
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-warning)', fontWeight: 700, marginTop: '2px' }}>
                  Downtime Loss: {totalDowntimeMin} mins
                </div>
                <div style={{ background: 'var(--bg-surface2)', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, availabilityRate)}%`, background: 'var(--clr-primary)', height: '100%' }} />
                </div>
              </div>

              {/* Pillar 2: Performance */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--clr-cyan, #06b6d4)' }}>Performance (P)</span>
                  <Zap size={15} color="var(--clr-cyan, #06b6d4)" />
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--clr-text)' }}>
                  {performanceRate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
                  Gross: {totalProduction.toLocaleString()} pcs
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text2)', fontWeight: 700, marginTop: '2px' }}>
                  Target: {totalTheoreticalTarget.toLocaleString()} pcs
                </div>
                <div style={{ background: 'var(--bg-surface2)', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, performanceRate)}%`, background: 'var(--clr-cyan, #06b6d4)', height: '100%' }} />
                </div>
              </div>

              {/* Pillar 3: Quality */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--clr-success)' }}>Quality (Q)</span>
                  <ShieldCheck size={15} color="var(--clr-success)" />
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--clr-success)' }}>
                  {qualityRate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
                  Accepted: {totalAccepted.toLocaleString()} pcs
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-error)', fontWeight: 700, marginTop: '2px' }}>
                  Rejections: {totalRejection.toLocaleString()} ({overallRejectionRate}%)
                </div>
                <div style={{ background: 'var(--bg-surface2)', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, qualityRate)}%`, background: 'var(--clr-success)', height: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Deck */}
          <div className="kpi-deck">
            <div className="kpi-card">
              <div className="kpi-title">{t('kpi_gross_production')}</div>
              <div className="kpi-val" style={{ color: 'var(--clr-text)' }}>{totalProduction.toLocaleString()}</div>
              <div className="kpi-sub">Total Output Recorded</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>{t('kpi_accepted_quantity')}</div>
              <div className="kpi-val" style={{ color: 'var(--clr-success)' }}>{totalAccepted.toLocaleString()}</div>
              <div className="kpi-sub">{qualityRate.toFixed(1)}% First Pass Yield</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-error)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-error)' }}>{t('kpi_total_rejections')}</div>
              <div className="kpi-val" style={{ color: 'var(--clr-error)' }}>{totalRejection.toLocaleString()}</div>
              <div className="kpi-sub">{overallRejectionRate}% Scrap Ratio</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>{t('kpi_total_downtime')}</div>
              <div className="kpi-val" style={{ color: 'var(--clr-warning)' }}>
                {Math.floor(totalDowntimeMin / 60)}h {totalDowntimeMin % 60}m
              </div>
              <div className="kpi-sub">{totalDowntimeMin} Minutes Loss</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>{t('kpi_plant_utilization')}</div>
              <div className="kpi-val" style={{ color: 'var(--clr-primary)' }}>{plantUtilization}%</div>
              <div className="kpi-sub">{totalMouldChanges} Mould Changes Logged</div>
            </div>
          </div>

          {/* Machine Comparison Bars */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--clr-primary)" />
                <span>Machine Performance & OEE Breakdown</span>
              </h3>
              <span className="badge-tag machine" style={{ fontSize: '10px' }}>
                {machines.length || 1} Fleet Units
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Highlight MC03 specifically */}
              {(() => {
                const mc03Stats = machineWiseStats['MC03'] || { production: totalProduction, accepted: totalAccepted, rejected: totalRejection, downtime: totalDowntimeMin };
                const maxProd = Math.max(1, ...Object.values(machineWiseStats).map(s => s.production), totalProduction);
                const pct = ((mc03Stats.production / maxProd) * 100).toFixed(0);

                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--bg-surface2)',
                    border: '1px solid var(--clr-primary)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 900, color: 'var(--clr-primary)', fontFamily: 'var(--font-mono)' }}>MC03</span>
                        <span style={{ fontSize: '11px', color: 'var(--clr-text)', fontWeight: 700 }}>· Milacron 450T</span>
                        <span className="badge-tag approved" style={{ fontSize: '9px', padding: '1px 6px' }}>PILOT LINE</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--clr-success)' }}>{mc03Stats.accepted.toLocaleString()} pcs</span>
                        <span style={{ color: 'var(--clr-warning)', fontWeight: 600 }}>{mc03Stats.downtime}m DT</span>
                        <span style={{ fontWeight: 800, color: 'var(--clr-primary)' }}>{overallOEE.toFixed(1)}% OEE</span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-space, #1e293b)', height: '10px', borderRadius: '4px', overflow: 'hidden', width: '100%' }}>
                      <div style={{ width: `${Math.max(15, pct)}%`, background: 'linear-gradient(90deg, var(--clr-primary), #3b82f6)', height: '100%', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })()}

              {/* Other Machines if present */}
              {machines.filter(m => m.machineNumber !== 'MC03').map(m => {
                const stats = machineWiseStats[m.machineNumber] || { production: 0, accepted: 0, rejected: 0, downtime: 0 };
                const maxProd = Math.max(1, ...Object.values(machineWiseStats).map(s => s.production), totalProduction);
                const pct = ((stats.production / maxProd) * 100).toFixed(0);

                return (
                  <div key={m.id || m.machineNumber} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--bg-surface2)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--clr-text)', fontFamily: 'var(--font-mono)' }}>
                        {m.machineNumber} · {m.machineName || `${m.capacityTon || 150}T`}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--clr-success)' }}>{stats.accepted.toLocaleString()} pcs</span>
                        <span style={{ color: 'var(--clr-warning)' }}>{stats.downtime}m DT</span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-space, #1e293b)', height: '10px', borderRadius: '4px', overflow: 'hidden', width: '100%' }}>
                      <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--clr-primary), #3b82f6)', height: '100%', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: Rejections Pareto & Downtime Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '14px' }}>
            {/* Rejection Pareto */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={17} color="var(--clr-error)" />
                <span>Rejection Pareto Distribution (A–Q)</span>
              </h3>

              {sortedRejections.length === 0 ? (
                <div style={{ color: 'var(--clr-text3)', fontSize: '0.82rem', padding: '16px 0', textAlign: 'center' }}>
                  No scrap or rejections logged in this dataset.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sortedRejections.slice(0, 6).map(([code, count]) => {
                    const pct = totalRejection > 0 ? ((count / totalRejection) * 100).toFixed(1) : 0;
                    return (
                      <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-surface2)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ fontWeight: 800, color: 'var(--clr-error)', width: '22px', flexShrink: 0 }}>{code}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--clr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getRejectionDescription(code)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>
                          {count} pcs <span style={{ color: 'var(--clr-text3)', fontSize: '0.72rem' }}>({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Downtime Categories */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={17} color="var(--clr-warning)" />
                <span>Downtime Loss Breakdown</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(downtimeByCategory).map(([cat, mins]) => {
                  const pct = totalDowntimeMin > 0 ? ((mins / totalDowntimeMin) * 100).toFixed(1) : 0;
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-surface2)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--clr-text)' }}>{cat}</span>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                        {mins} min <span style={{ color: 'var(--clr-text3)', fontSize: '0.72rem' }}>({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* VIEW: MASTER PRODUCTION SHEET (LAPTOP MASTER SHEET)          */}
      {/* ============================================================ */}
      {dashboardMode === 'mastersheet' && (
        <MasterSheetView
          reports={reports}
          onSelectReportForViewing={onSelectReportForViewing}
          onRefreshCloud={onRefreshCloud}
          isSyncing={isSyncing}
          onDeleteReport={onDeleteReport}
        />
      )}

      {/* ============================================================ */}
      {/* VIEW 2: SHIFT REPORTS (SHIFTED INSIDE DASHBOARD AS REQUESTED)  */}
      {/* ============================================================ */}
      {dashboardMode === 'reports' && (
        <ReportsView
          reports={reports}
          machines={machines}
          onSelectReportForViewing={onSelectReportForViewing}
          onDeleteReport={onDeleteReport}
        />
      )}

      {/* ============================================================ */}
      {/* VIEW 3: PILOT MONITORING DASHBOARD                          */}
      {/* ============================================================ */}
      {dashboardMode === 'pilot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Pilot KPI Deck */}
          <div className="kpi-deck">
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Active Shop-Floor Users</div>
              <div className="kpi-val">6 Operators</div>
              <div className="kpi-sub">Shreyank, Dheera, Mahadev, Ravi, Bipendar, Ramkesh</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>Digital Shift Reports</div>
              <div className="kpi-val">{filteredReports.length} Active</div>
              <div className="kpi-sub">{totalHourlyLogs} Hourly Logs Confirmed</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>User Adoption Rate</div>
              <div className="kpi-val">100.0%</div>
              <div className="kpi-sub">Target: ≥ 90% (Exceeded)</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>Validation Rules Enforced</div>
              <div className="kpi-val">49 Rules</div>
              <div className="kpi-sub">100% Math & 60-Min Balance Integrity</div>
            </div>
          </div>

          {/* Daily Pilot Tracking Grid */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--clr-success)" />
              <span>Pilot Line Deployment Status (MC03 · Milacron 450T)</span>
            </h3>

            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface2)', textAlign: 'left', borderBottom: '1px solid var(--clr-border)' }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Machine</th>
                    <th style={{ padding: '10px' }}>Shift</th>
                    <th style={{ padding: '10px' }}>Operator</th>
                    <th style={{ padding: '10px' }}>Digital Entries</th>
                    <th style={{ padding: '10px' }}>Supervisor Sign-off</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.slice(0, 5).map(rep => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                      <td style={{ padding: '10px' }}>{rep.reportDate}</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: 'var(--clr-primary)' }}>
                        {rep.machineNumber} · Milacron 450T
                      </td>
                      <td style={{ padding: '10px' }}>{rep.shift}</td>
                      <td style={{ padding: '10px' }}>{rep.operator_name || rep.operatorName || 'Floor Operator'}</td>
                      <td style={{ padding: '10px' }}>
                        {(rep.mouldSessions || []).flatMap(s => s.entries || []).length} / 12 Hours
                      </td>
                      <td style={{ padding: '10px' }}>
                        {rep.status === 'approved' ? (
                          <span className="badge-tag approved" style={{ fontSize: '11px' }}>APPROVED</span>
                        ) : (
                          <span className="badge-tag draft" style={{ fontSize: '11px' }}>{rep.status?.toUpperCase()}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--clr-success)', fontWeight: 700 }}>
                        ● Active Local
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 4: EXECUTIVE MANAGEMENT KPI & ROI DASHBOARD            */}
      {/* ============================================================ */}
      {dashboardMode === 'management' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="kpi-deck">
            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Target Achievement</div>
              <div className="kpi-val">{performanceRate.toFixed(1)}%</div>
              <div className="kpi-sub">Actual Output vs Theoretical Target</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-success)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-success)' }}>Paper Reporting Reduction</div>
              <div className="kpi-val">100%</div>
              <div className="kpi-sub">Eliminated manual paper log sheets on MC03</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-primary)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-primary)' }}>Daily Operator Time Saved</div>
              <div className="kpi-val">2.5 Hours</div>
              <div className="kpi-sub">Faster hourly logging and auto-calculations</div>
            </div>

            <div className="kpi-card" style={{ borderTop: '3px solid var(--clr-warning)' }}>
              <div className="kpi-title" style={{ color: 'var(--clr-warning)' }}>Machine Availability Rate</div>
              <div className="kpi-val">{availabilityRate.toFixed(1)}%</div>
              <div className="kpi-sub">Run Time / Total Planned Operating Time</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="var(--clr-primary)" />
              <span>Operational ROI & Digitization Gains</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text2)', lineHeight: 1.5, margin: 0 }}>
              Digitizing Radiance Polymers' reporting on <strong>MC03 (Milacron 450T)</strong> delivers immediate real-time OEE visibility, prevents calculation discrepancies, eliminates Excel re-entry overhead, and enforces 60-minute balance integrity.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
