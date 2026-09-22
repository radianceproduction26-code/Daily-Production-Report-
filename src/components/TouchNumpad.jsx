// Radiance Polymers - Virtual Touch Numpad Component
import React from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function TouchNumpad({ value = '', onChange, onEnter, maxDigits = 6, allowDecimal = false }) {
  const { t } = useI18n();

  const handleDigit = (digit) => {
    const currentStr = String(value || '');
    if (currentStr.length >= maxDigits) return;
    if (digit === '.' && !allowDecimal) return;
    if (digit === '.' && currentStr.includes('.')) return;

    if (currentStr === '0' && digit !== '.') {
      onChange(digit);
    } else {
      onChange(currentStr + digit);
    }
  };

  const handleBackspace = () => {
    const currentStr = String(value || '');
    if (currentStr.length <= 1) {
      onChange('0');
    } else {
      onChange(currentStr.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('0');
  };

  return (
    <div className="numpad-container">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <button
          key={digit}
          type="button"
          className="numpad-btn"
          onClick={() => handleDigit(digit)}
        >
          {digit}
        </button>
      ))}

      <button
        type="button"
        className="numpad-btn action"
        onClick={handleClear}
      >
        {t('btn_clear')}
      </button>

      <button
        type="button"
        className="numpad-btn"
        onClick={() => handleDigit('0')}
      >
        0
      </button>

      <button
        type="button"
        className="numpad-btn action"
        onClick={handleBackspace}
        title="Backspace"
      >
        <Delete size={22} />
      </button>

      {allowDecimal && (
        <button
          type="button"
          className="numpad-btn"
          onClick={() => handleDigit('.')}
        >
          .
        </button>
      )}

      {onEnter && (
        <button
          type="button"
          className="numpad-btn action"
          style={{ gridColumn: allowDecimal ? 'span 2' : 'span 3', background: 'var(--cyan-primary)', color: '#042f2e', fontWeight: 800 }}
          onClick={onEnter}
        >
          <CornerDownLeft size={20} style={{ marginRight: '6px' }} />
          {t('btn_done')}
        </button>
      )}
    </div>
  );
}
