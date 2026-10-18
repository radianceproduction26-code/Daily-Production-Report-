// ==============================================================================
// RADIANCE POLYMERS - DIGITAL PRODUCTION REPORTING SYSTEM
// Mobile-First Shop-Floor Login Screen with Employee Code & Email Support
// ==============================================================================
import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Factory } from 'lucide-react';
import Logo from './Logo';
import { login } from '../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your Employee Code or Email.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ emailOrCode: identifier, password });
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user, res.profile);
        }
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setErrorMessage('Unable to reach server. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '16px',
        boxSizing: 'border-box',
        color: '#f8fafc'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '12px' }}>
            <Logo height={48} variant="white" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 2px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Digital Production Reporting
          </h1>
          <p style={{ fontSize: '0.80rem', color: '#94a3b8', margin: 0 }}>
            MC03 Pilot & Plant Floor Console
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="login-identifier"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '6px'
              }}
            >
              Employee Code or Email
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="login-identifier"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="e.g. EMP-101 or admin@radiance.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '46px',
                  boxSizing: 'border-box',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '0 12px 0 38px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '6px'
              }}
            >
              Password or PIN
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '46px',
                  boxSizing: 'border-box',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '0 40px 0 38px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              height: '48px',
              marginTop: '8px',
              borderRadius: '10px',
              background: isLoading ? '#3b82f6' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
              transition: 'opacity 0.2s'
            }}
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In to Console</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#64748b',
            fontSize: '0.74rem'
          }}
        >
          <ShieldCheck size={14} color="#3b82f6" />
          <span>Secured by Supabase Row Level Security</span>
        </div>
      </div>
    </div>
  );
}
