// Radiance Polymers - Settings & System Tools View
import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Activity,
  History,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  HardDrive,
  Cpu,
  Globe,
  FileCheck,
  HelpCircle,
  Sparkles,
  X
} from 'lucide-react';
import { initializeStorage, getSystemSettings, saveSystemSettings, clearOperationalData, clearAllProductionEntries } from '../services/storageService';
import TrialGoLiveDashboard from './TrialGoLiveDashboard';
import SystemHealthDashboard from './SystemHealthDashboard';
import AuditLogViewer from './AuditLogViewer';
import DashboardView from './DashboardView';

export default function SettingsView({
  machines = [],
  moulds = [],
  parts = [],
  usersList = [],
  reports = [],
  settings = {},
  onUpdateSettings,
  onOpenSetupWizard,
  onOpenMockValidation,
  currentUser,
  rejectionCodes = [],
  downtimeCodes = []
}) {
  const [activeAdvancedTool, setActiveAdvancedTool] = useState(null); // 'trial', 'health', 'audit', 'analytics', or null
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to clear operational data? This will clear Parts, Machines, Mappings, and Production Data while preserving Rejection, Downtime, Operator, and Supervisor Masters.')) {
      clearOperationalData();
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const handleClearProductionEntries = () => {
    if (window.confirm('Clear all production entries & shift reports? This will reset the shift ledger to zero while keeping all Part Masters and Machine configurations intact.')) {
      clearAllProductionEntries();
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)', maxWidth: '1400px', margin: '0 auto', paddingBottom: '32px' }}>
      
      {/* System Settings & Device Info Card */}
      <div className="card" style={{ padding: 'var(--gap-md)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={24} color="var(--clr-primary)" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
                System Configuration
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: '2px 0 0 0' }}>
                MC03 Pilot Machine • Production Console
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            {onOpenSetupWizard && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onOpenSetupWizard}
                style={{ flex: 1, minHeight: '44px' }}
              >
                <Sparkles size={15} color="var(--clr-primary)" />
                <span>Setup Wizard</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClearProductionEntries}
              style={{ flex: 1, minHeight: '44px', color: 'var(--clr-orange, #f59e0b)', borderColor: 'var(--clr-orange, #f59e0b)' }}
            >
              <RotateCcw size={15} />
              <span>Clear Production Entries</span>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetData}
              style={{ flex: 1, minHeight: '44px', color: 'var(--clr-error)', borderColor: 'var(--clr-error)' }}
            >
              <RotateCcw size={15} />
              <span>{resetSuccess ? 'Reinitialized!' : 'Reset Demo Seed'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          <div style={{ padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--clr-text3)', fontSize: '10px', fontWeight: 700 }}>
              <Cpu size={14} color="var(--clr-primary)" />
              <span>PILOT MACHINE</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--clr-text)' }}>
              MC03 (450T)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
              Milacron 450T
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--clr-text3)', fontSize: '10px', fontWeight: 700 }}>
              <FileCheck size={14} color="var(--clr-success)" />
              <span>SUPERVISORS</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--clr-text)' }}>
              Lokesh / Akshay
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
              Floor Leads
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--clr-text3)', fontSize: '10px', fontWeight: 700 }}>
              <HardDrive size={14} color="var(--clr-orange)" />
              <span>STORAGE</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--clr-text)' }}>
              Offline First
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
              LocalStorage
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--clr-text3)', fontSize: '10px', fontWeight: 700 }}>
              <Shield size={14} color="var(--clr-primary)" />
              <span>VERSION</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--clr-text)' }}>
              v1.0.1
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', marginTop: '2px' }}>
              Android Mobile
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Diagnostics Tools Section */}
      <div className="card" style={{ padding: 'var(--gap-md)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--clr-primary)" />
            <span>Diagnostics & Tools</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: '2px 0 0 0' }}>
            Decoupled diagnostic and historical monitoring tools
          </p>
        </div>

        {/* Diagnostic Selectors (Mobile 2x2 Grid, Desktop 4-col) */}
        <div className="diagnostic-selectors-grid">
          <button
            type="button"
            className={`btn ${activeAdvancedTool === 'trial' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveAdvancedTool(activeAdvancedTool === 'trial' ? null : 'trial')}
            style={{
              minHeight: '48px',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: activeAdvancedTool === 'trial' ? '0 0 0 2px var(--clr-primary)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              <span>Pilot Check</span>
            </div>
            {activeAdvancedTool === 'trial' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            type="button"
            className={`btn ${activeAdvancedTool === 'health' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveAdvancedTool(activeAdvancedTool === 'health' ? null : 'health')}
            style={{
              minHeight: '48px',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: activeAdvancedTool === 'health' ? '0 0 0 2px var(--clr-primary)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} />
              <span>Health</span>
            </div>
            {activeAdvancedTool === 'health' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            type="button"
            className={`btn ${activeAdvancedTool === 'audit' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveAdvancedTool(activeAdvancedTool === 'audit' ? null : 'audit')}
            style={{
              minHeight: '48px',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: activeAdvancedTool === 'audit' ? '0 0 0 2px var(--clr-primary)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={16} />
              <span>Audit Log</span>
            </div>
            {activeAdvancedTool === 'audit' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            type="button"
            className={`btn ${activeAdvancedTool === 'analytics' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveAdvancedTool(activeAdvancedTool === 'analytics' ? null : 'analytics')}
            style={{
              minHeight: '48px',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: activeAdvancedTool === 'analytics' ? '0 0 0 2px var(--clr-primary)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={16} />
              <span>Analytics</span>
            </div>
            {activeAdvancedTool === 'analytics' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Dynamic Tool Mount Surface with Mobile Top Control Bar */}
        {activeAdvancedTool && (
          <div className="diagnostic-tool-mount">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--bg-surface2)',
              borderRadius: '8px',
              border: '1px solid var(--clr-border)',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-tag approved" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Active Tool
                </span>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--clr-text)' }}>
                  {activeAdvancedTool === 'trial' && 'Pilot Check (Trial Go-Live)'}
                  {activeAdvancedTool === 'health' && 'System Health & Cloud Sync'}
                  {activeAdvancedTool === 'audit' && 'Shop Floor Audit Trail'}
                  {activeAdvancedTool === 'analytics' && 'Analytics & OEE Dashboard'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdvancedTool(null)}
                className="btn btn-outline btn-sm"
                style={{ height: '34px', minHeight: '34px', padding: '0 10px', fontSize: '11px', gap: '4px' }}
              >
                <X size={14} />
                <span>Close</span>
              </button>
            </div>

            {activeAdvancedTool === 'trial' && (
              <TrialGoLiveDashboard
                machines={machines}
                moulds={moulds}
                parts={parts}
                usersList={usersList}
                reports={reports}
                systemSettings={settings}
                onOpenSetupWizard={onOpenSetupWizard}
                onOpenMockValidation={onOpenMockValidation}
                onUpdateSettings={onUpdateSettings}
              />
            )}

            {activeAdvancedTool === 'health' && (
              <SystemHealthDashboard />
            )}

            {activeAdvancedTool === 'audit' && (
              <AuditLogViewer />
            )}

            {activeAdvancedTool === 'analytics' && (
              <DashboardView
                reports={reports}
                machines={machines}
                rejectionCodes={rejectionCodes}
                downtimeCodes={downtimeCodes}
              />
            )}
          </div>
        )}
      </div>

    </div>
  );
}
