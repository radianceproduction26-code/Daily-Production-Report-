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

  const desktopNavItems = [
    { id: 'console', icon: Factory, label: 'Shifts' },
    { id: 'mastersheet', icon: FileSpreadsheet, label: 'Master Sheet' },
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'part-master', icon: Layers, label: 'Part Master' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const mobileNavItems = [
    { id: 'console', icon: Factory, label: 'Shifts' },
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'mastersheet', icon: FileSpreadsheet, label: 'Master Sheet' },
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

        {/* Desktop navigation pills (visible on >= 641px screens like laptop) */}
        <div className="nav-pills hide-on-mobile">
          {desktopNavItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-pill-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id !== 'console' && !isSupervisorUnlocked && (
                <Lock size={12} style={{ marginLeft: '4px', opacity: 0.65 }} />
              )}
            </button>
          ))}
        </div>

        {/* Top bar right: Language toggle + Supervisor button */}
        <div className="topbar-actions">

          {/* If Supervisor is unlocked, show Lock button to lock back to Operator mode */}
          {isSupervisorUnlocked && onLockSupervisor && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onLockSupervisor}
              title="Supervisor mode active. Click to lock back to Operator Shifts mode."
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

          {/* Supervisor button with clear Male Person Icon */}
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
            {/* Male Person Icon */}
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

      {/* ── BOTTOM NAVIGATION BAR (mobile only — hidden ≥641px via CSS) ── */}
      <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
        {mobileNavItems.slice(0, 2).map(item => (
          <button
            key={item.id}
            type="button"
            className={`bnav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
          >
            <item.icon size={22} />
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              {item.label}
              {item.id !== 'console' && !isSupervisorUnlocked && (
                <Lock size={10} style={{ opacity: 0.65 }} />
              )}
            </span>
          </button>
        ))}

        {/* Centre FAB — New Shift */}
        <div className="bnav-fab">
          {(currentUser?.role === 'operator' || currentUser?.role === 'supervisor' || currentUser?.role === 'admin') ? (
            <button
              type="button"
              className="bnav-fab-btn"
              onClick={onOpenNewShiftModal}
              aria-label="New Shift"
            >
              <Plus size={24} />
            </button>
          ) : (
            <button
              type="button"
              className="bnav-fab-btn"
              onClick={() => setActiveTab('dashboard')}
              aria-label="Dashboard"
              style={{ background: 'var(--text3)' }}
            >
              <BarChart3 size={22} />
            </button>
          )}
          <span className="bnav-fab-label">New Shift</span>
        </div>

        {mobileNavItems.slice(2, 4).map(item => (
          <button
            key={item.id}
            type="button"
            className={`bnav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
          >
            <item.icon size={22} />
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              {item.label}
              {item.id !== 'console' && !isSupervisorUnlocked && (
                <Lock size={10} style={{ opacity: 0.65 }} />
              )}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}
