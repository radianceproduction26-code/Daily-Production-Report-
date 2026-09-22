// Radiance Polymers - Supervisor PIN Access Modal
// Secures Master Sheet, Dashboard, Part Master, and Settings tabs with PIN '2026'
import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';

const CORRECT_PIN = '2026';

export default function PasswordAuthModal({
  isOpen,
  onClose,
  onSuccess,
  targetTabName = 'this section'
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setShake(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const verifyPin = (candidatePin) => {
    if (candidatePin === CORRECT_PIN) {
      setError('');
      onSuccess();
    } else {
      setShake(true);
      setError('Incorrect PIN. Please enter supervisor password.');
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (pin.length === 0) {
      setError('Please enter PIN');
      return;
    }
    verifyPin(pin);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onClose();
    } else if (/^[0-9]$/.test(e.key) && pin.length < 4) {
      const newPin = pin + e.key;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    } else if (e.key === 'Backspace') {
      handleBackspace();
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--clr-border)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          transform: shake ? 'translateX(-8px)' : 'none',
          transition: 'transform 0.08s ease'
        }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header with lock icon */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--clr-primary)'
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--clr-text)' }}>Supervisor Access</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)' }}>PIN Required</div>
            </div>
          </div>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={onClose}
            style={{ width: '32px', height: '32px', minWidth: '32px' }}
            title="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Subtitle instructions */}
        <div style={{ fontSize: '0.82rem', color: 'var(--clr-text2)', textAlign: 'center', lineHeight: 1.4 }}>
          Operators only have access to <strong>Shifts</strong>. Enter password to view <strong>{targetTabName}</strong>.
        </div>

        {/* PIN Indicators */}
        <div style={{ display: 'flex', gap: '12px', margin: '4px 0' }}>
          {[0, 1, 2, 3].map(i => {
            const isFilled = pin.length > i;
            return (
              <div
                key={i}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid var(--clr-primary)',
                  background: isFilled ? 'var(--clr-primary)' : 'transparent',
                  transition: 'all 0.15s ease',
                  boxShadow: isFilled ? '0 0 8px var(--clr-primary)' : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Hidden input to capture physical keyboard on mobile/desktop */}
        <input
          ref={inputRef}
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            if (val.length === 4) verifyPin(val);
          }}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: '1px',
            height: '1px'
          }}
        />

        {/* Error message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--clr-error)',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric On-Screen Keypad */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            width: '100%',
            maxWidth: '240px'
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(String(num))}
              style={{
                height: '46px',
                borderRadius: '10px',
                background: 'var(--bg-surface2)',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-text)',
                fontSize: '1.2rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            style={{
              height: '46px',
              borderRadius: '10px',
              background: 'var(--bg-surface2)',
              border: '1px solid var(--clr-border)',
              color: 'var(--clr-text3)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            CLR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              height: '46px',
              borderRadius: '10px',
              background: 'var(--bg-surface2)',
              border: '1px solid var(--clr-border)',
              color: 'var(--clr-text)',
              fontSize: '1.2rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: '46px',
              borderRadius: '10px',
              background: 'var(--bg-surface2)',
              border: '1px solid var(--clr-border)',
              color: 'var(--clr-text3)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⌫
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', width: '100%', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Back to Shifts
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
