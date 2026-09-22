// Radiance Polymers - Machine Counter & Shot Reconciliation Modal
import React, { useState } from 'react';
import {
  Gauge,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { validateCounters } from '../services/validationEngine';
import { useI18n } from '../i18n/I18nContext';

export default function CounterModal({
  isOpen,
  onClose,
  activeSession,
  onSaveCounters,
  tolerancePercent = 3.0
}) {
  const { t, language } = useI18n();
  if (!isOpen || !activeSession) return null;

  const [startCounter, setStartCounter] = useState(String(activeSession.startCounter || 0));
  const [endCounter, setEndCounter] = useState(
    activeSession.endCounter ? String(activeSession.endCounter) : String(Number(activeSession.startCounter || 0) + 1200)
  );

  const totalProd = (activeSession.entries || []).reduce(
    (sum, e) => sum + (Number(e.productionQty) || 0),
    0
  );

  const counterValidation = validateCounters({
    startCounter: Number(startCounter),
    endCounter: Number(endCounter),
    cavityCount: activeSession.cavityCount,
    actualTotalProduction: totalProd,
    tolerancePercent,
    lang: language
  });

  const handleSave = () => {
    if (!counterValidation.isValid) return;
    onSaveCounters({
      startCounter: Number(startCounter),
      endCounter: Number(endCounter)
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>
            <Gauge size={22} color="var(--cyan-primary)" />
            <span>{t('counter_modal_title')} - {t('session_num', { num: activeSession.sessionSequence })}</span>
          </h2>
          <button type="button" className="close-icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Validation 5 Errors */}
          {counterValidation.errors.map((err, i) => (
            <div key={i} className="validation-banner error">
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>{err}</strong>
              </div>
            </div>
          ))}

          {/* Validation 6 Warnings */}
          {counterValidation.warnings.map((warn, i) => (
            <div key={i} className="validation-banner warning">
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>{warn}</div>
            </div>
          ))}

          {/* Counter Inputs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>{t('start_counter')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift / Session Onset</span>
              </label>
              <input
                type="text"
                className="touch-input"
                value={startCounter}
                onChange={(e) => setStartCounter(e.target.value.replace(/\D/g, ''))}
                placeholder="Start Counter"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span style={{ color: 'var(--cyan-primary)' }}>{t('machine_end_counter_label')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>&gt; {t('start_counter')}</span>
              </label>
              <input
                type="text"
                className="touch-input"
                style={{ borderColor: counterValidation.isValid ? 'var(--cyan-primary)' : 'var(--crimson-defect)' }}
                value={endCounter}
                onChange={(e) => setEndCounter(e.target.value.replace(/\D/g, ''))}
                placeholder="End Counter"
              />
            </div>
          </div>

          {/* Shot Calculation & Variance Cards */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-medium)', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('total_shots_counted')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {counterValidation.totalShots.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>End - Start Counter</div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('cavity_count')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeSession.cavityCount}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mould {activeSession.mouldNumber}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--cyan-primary)', textTransform: 'uppercase' }}>{t('expected_output_label')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
                {counterValidation.expectedProduction.toLocaleString()} pcs
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shots × Cavities</div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: counterValidation.variancePercent > tolerancePercent ? '#f59e0b' : '#34d399', textTransform: 'uppercase' }}>
                {t('actual_prod_variance_label')}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: counterValidation.variancePercent > tolerancePercent ? '#f59e0b' : '#34d399' }}>
                {totalProd.toLocaleString()} pcs
              </div>
              <div style={{ fontSize: '0.7rem', color: counterValidation.variancePercent > tolerancePercent ? '#f59e0b' : '#34d399' }}>
                {counterValidation.variancePercent.toFixed(1)}% ({counterValidation.variancePcs > 0 ? '+' : ''}{counterValidation.variancePcs} pcs)
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="action-btn outline" onClick={onClose}>
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            className="action-btn primary"
            onClick={handleSave}
            disabled={!counterValidation.isValid}
          >
            <CheckCircle2 size={18} />
            <span>{t('btn_update_counters')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
