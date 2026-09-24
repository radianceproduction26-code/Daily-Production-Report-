// Radiance Polymers - Clean Mobile Header
import React from 'react';
import {
  Factory,
  FileSpreadsheet,
  Settings,
  Layers,
  Plus,
  Globe,
  BarChart3,
  User,
  Lock,
  Unlock
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import Logo from './Logo';

export default function Header({
  activeTab,
  setActiveTab,
  currentUser,
  onSwitchUser,
  usersList = [],
  activeReport,
  onOpenNewShiftModal,
  onOpenSetupWizard,
  isSupervisorUnlocked = false,
  onLockSupervisor
}) {
  const { toggleLanguage } = useI18n();

  const navItems = [
    { id: 'console', icon: Factory, label: 'Shifts' },
    { id: 'mastersheet', icon: FileSpreadsheet, label: 'Master Sheet' },
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'part-master', icon: Layers, label: 'Part Master' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <>
      {/* ── TOP APP BAR ── */}
      <header className="app-header">

        {/* Company Name / Logo (prominently sized) */}
        <div className="brand-section">
          <Logo height={44} variant="default" style={{ height: '44px', maxHeight: '48px' }} />
        </div>

        {/* Navigation pills — Always visible across desktop, tablet, and mobile */}
        <div className="nav-pills">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-pill-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Top bar right: Language toggle + Supervisor button */}
        <div className="topbar-actions">

          {/* If Supervisor is unlocked, show Lock button */}
          {isSupervisorUnlocked && onLockSupervisor && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onLockSupervisor}
              title="Supervisor mode active"
              style={{
                height: '34px',
                padding: '0 10px',
                gap: '4px',
                borderColor: 'var(--clr-error)',
                color: 'var(--clr-error)',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: 'var(--r-full)'
              }}
            >
              <Lock size={13} />
              <span>Lock</span>
            </button>
          )}

          {/* Language toggle */}
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={toggleLanguage}
            title="Switch Language"
            style={{ fontSize: '0.6rem', fontWeight: 800, gap: 0, flexDirection: 'column', width: '32px', height: '32px', minWidth: '32px' }}
          >
            <Globe size={15} />
          </button>

          {/* Supervisor button with Male Person Icon */}
          <div
            className="role-pill-selector"
            title="Active Supervisor"
            style={{
              height: '34px',
              padding: '0 8px 0 10px',
              gap: '6px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--clr-primary-lt)',
              border: '1px solid #93c5fd',
              borderRadius: 'var(--r-full)'
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--clr-primary)"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, display: 'block' }}
              aria-label="Male Supervisor Icon"
            >
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
            </svg>
            <select
              className="role-select-native"
              value={currentUser?.id}
              onChange={(e) => {
                const selected = usersList.find(u => u.id === e.target.value);
                if (selected) onSwitchUser(selected);
              }}
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--clr-primary)',
                maxWidth: '96px',
                cursor: 'pointer'
              }}
            >
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ── BOTTOM NAVIGATION BAR (mobile only) ── */}
      <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`bnav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
          >
            <item.icon size={20} />
            <span style={{ fontSize: '9px', fontWeight: activeTab === item.id ? 800 : 600 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
