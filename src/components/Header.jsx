// ==============================================================================
// RADIANCE POLYMERS - RESPONSIVE SHOP-FLOOR HEADER
// Role-aware navigation (Operator, Supervisor, Admin) with Supabase session controls
// ==============================================================================
import React from 'react';
import {
  Factory,
  FileSpreadsheet,
  Settings,
  Layers,
  Globe,
  BarChart3,
  User,
  LogOut,
  Shield
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import Logo from './Logo';

export default function Header({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout
}) {
  const { toggleLanguage } = useI18n();

  const role = (currentUser?.role || 'operator').toLowerCase();

  // Role-gated navigation items
  const allNavItems = [
    { id: 'console', icon: Factory, label: 'Shifts', minRole: 'operator' },
    { id: 'mastersheet', icon: FileSpreadsheet, label: 'Master Sheet', minRole: 'supervisor' },
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', minRole: 'supervisor' },
    { id: 'part-master', icon: Layers, label: 'Part Master', minRole: 'supervisor' },
    { id: 'settings', icon: Settings, label: 'Settings', minRole: 'admin' }
  ];

  const navItems = allNavItems.filter(item => {
    if (role === 'admin') return true;
    if (role === 'supervisor') return item.minRole !== 'admin';
    return item.minRole === 'operator';
  });

  const userName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || 'Staff Member';
  const displayRole = (currentUser?.role || 'operator').toUpperCase();

  return (
    <>
      {/* ── TOP APP BAR ── */}
      <header className="app-header">
        {/* Company Name / Logo */}
        <div className="brand-section">
          <Logo height={44} variant="default" style={{ height: '44px', maxHeight: '48px' }} />
        </div>

        {/* Navigation pills — Responsive for current role */}
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

        {/* Top bar right: Language + Profile Badge + Logout */}
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          {/* User profile info badge */}
          <div
            className="role-pill-selector"
            title={`Logged in as ${userName} (${displayRole})`}
            style={{
              height: '34px',
              padding: '0 10px',
              gap: '6px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              background: role === 'admin' ? '#fef3c7' : 'var(--clr-primary-lt)',
              border: `1px solid ${role === 'admin' ? '#f59e0b' : '#93c5fd'}`,
              borderRadius: 'var(--r-full)'
            }}
          >
            {role === 'admin' ? (
              <Shield size={14} color="#d97706" />
            ) : (
              <User size={14} color="var(--clr-primary)" />
            )}
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: role === 'admin' ? '#92400e' : 'var(--clr-primary)',
                maxWidth: '120px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {userName}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '4px',
                background: role === 'admin' ? '#f59e0b' : '#2563eb',
                color: '#ffffff'
              }}
            >
              {displayRole}
            </span>
          </div>

          {/* Sign Out Button */}
          {onLogout && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onLogout}
              title="Sign Out of Console"
              style={{
                height: '34px',
                padding: '0 10px',
                gap: '5px',
                borderColor: '#cbd5e1',
                color: '#64748b',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: 'var(--r-full)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          )}
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
