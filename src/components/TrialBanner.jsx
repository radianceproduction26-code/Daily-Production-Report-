// Radiance Polymers - Dedicated Trial Mode Sticky Banner (Phase 8 MC03 Live Trial)
// Displays prominently throughout the application on all views:
// MC03 LIVE TRIAL | Current Part | Current Operator | Current Supervisor | Current Shift | Trial Day Counter (e.g. DAY 1 OF 21)
import React from 'react';
import { Radio, Calendar, User, ShieldCheck, Cog, ArrowRight } from 'lucide-react';

export default function TrialBanner({
  activeReport,
  currentDay = 1,
  totalDays = 21,
  onNavigateToTrial
}) {
  const currentSession = activeReport?.mouldSessions?.find(s => s.status === 'active') || activeReport?.mouldSessions?.[0] || {};
  const machineNumber = activeReport?.machineNumber || 'MC03';
  const partNumber = currentSession.partNumber || currentSession.partCode || 'F53200000A';
  const operatorName = activeReport?.operator_name || activeReport?.operatorName || currentSession.operator_name || currentSession.operatorName || 'Ramesh';
  const supervisorName = activeReport?.supervisorName || 'Mr. Lokesh';
  const currentShift = activeReport?.shift || 'Shift A';

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #064e3b 0%, #047857 50%, #065f46 100%)',
        borderBottom: '2px solid #10b981',
        color: '#ffffff',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        zIndex: 99,
        fontSize: '0.85rem'
      }}
    >
      {/* Left: Broadcast Title & Day Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={18} color="#a7f3d0" className="pulse" />
          <strong style={{ fontSize: '1.05rem', letterSpacing: '0.5px', color: '#ffffff' }}>
            {machineNumber} LIVE TRIAL
          </strong>
        </div>

        <span
          style={{
            background: '#ffffff',
            color: '#065f46',
            padding: '3px 10px',
            borderRadius: '14px',
            fontSize: '0.75rem',
            fontWeight: 900,
            letterSpacing: '0.5px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
          }}
        >
          DAY {currentDay} OF {totalDays}
        </span>
      </div>

      {/* Middle: Live Shift Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#a7f3d0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Part / Tool:</span>
          <strong style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{partNumber}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#a7f3d0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Operator:</span>
          <strong style={{ color: '#ffffff' }}>{operatorName}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#a7f3d0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Supervisor:</span>
          <strong style={{ color: '#ffffff' }}>{supervisorName}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#a7f3d0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Shift:</span>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 800
          }}>
            {currentShift}
          </span>
        </div>
      </div>

      {/* Right: Quick Action to Trial Command Center */}
      {onNavigateToTrial && (
        <button
          type="button"
          onClick={onNavigateToTrial}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <span>Trial Center</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
