// Radiance Polymers - Material Consumption Tracking Modal
import React, { useState } from 'react';
import {
  PackageCheck,
  X,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { validateMaterialConsumption } from '../services/validationEngine';
import { useI18n } from '../i18n/I18nContext';

export default function MaterialModal({
  isOpen,
  onClose,
  activeSession,
  materialsList = [],
  onSaveMaterials
}) {
  const { t, language } = useI18n();
  if (!isOpen || !activeSession) return null;

  // Initial materials slots (Material 1 & Material 2)
  const [mat1, setMat1] = useState(
    activeSession.materials?.find(m => m.slot === 1) || {
      slot: 1,
      materialId: materialsList[0]?.id || '',
      materialCode: materialsList[0]?.materialCode || '',
      materialName: materialsList[0]?.materialName || '',
      lotNumber: 'LOT-' + new Date().getFullYear() + '-01',
      openingStockKg: 200,
      usedQuantityKg: 50,
      balanceQuantityKg: 150
    }
  );

  const [mat2, setMat2] = useState(
    activeSession.materials?.find(m => m.slot === 2) || {
      slot: 2,
      materialId: '',
      materialCode: '',
      materialName: '',
      lotNumber: '',
      openingStockKg: 0,
      usedQuantityKg: 0,
      balanceQuantityKg: 0
    }
  );

  // Compute total session production
  const totalProduction = (activeSession.entries || []).reduce(
    (sum, e) => sum + (Number(e.productionQty) || 0),
    0
  );

  const totalUsedKg = (Number(mat1.usedQuantityKg) || 0) + (Number(mat2.usedQuantityKg) || 0);

  // Validation 7 Check
  const materialValidation = validateMaterialConsumption({
    actualTotalProduction: totalProduction,
    partWeightGrams: activeSession.partWeightGrams,
    runnerWeightGrams: activeSession.runnerWeightGrams,
    totalMaterialUsedKg: totalUsedKg,
    tolerancePercent: 5.0,
    lang: language
  });

  const updateMaterial1 = (field, value) => {
    setMat1(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'materialId') {
        const found = materialsList.find(m => m.id === value);
        if (found) {
          updated.materialCode = found.materialCode;
          updated.materialName = found.materialName;
        }
      }
      if (field === 'openingStockKg' || field === 'usedQuantityKg') {
        const opening = Number(field === 'openingStockKg' ? value : prev.openingStockKg) || 0;
        const used = Number(field === 'usedQuantityKg' ? value : prev.usedQuantityKg) || 0;
        updated.balanceQuantityKg = Math.max(0, opening - used);
      }
      return updated;
    });
  };

  const updateMaterial2 = (field, value) => {
    setMat2(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'materialId') {
        const found = materialsList.find(m => m.id === value);
        if (found) {
          updated.materialCode = found.materialCode;
          updated.materialName = found.materialName;
        }
      }
      if (field === 'openingStockKg' || field === 'usedQuantityKg') {
        const opening = Number(field === 'openingStockKg' ? value : prev.openingStockKg) || 0;
        const used = Number(field === 'usedQuantityKg' ? value : prev.usedQuantityKg) || 0;
        updated.balanceQuantityKg = Math.max(0, opening - used);
      }
      return updated;
    });
  };

  const handleSave = () => {
    onSaveMaterials([mat1, mat2]);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '960px' }}>
        <div className="modal-header">
          <h2>
            <Scale size={22} color="var(--cyan-primary)" />
            <span>{t('material_tracking_title')} - {t('session_num', { num: activeSession.sessionSequence })}</span>
          </h2>
          <button type="button" className="close-icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Validation 7 Warning if triggered */}
          {materialValidation.warnings.map((w, i) => (
            <div key={i} className="validation-banner warning">
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>{w}</strong>
              </div>
            </div>
          ))}

          {/* Theoretical vs Actual Comparison Header */}
          <div style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-medium)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('kpi_gross_production')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {totalProduction.toLocaleString()} pcs
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('part_runner_wt')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {(activeSession.partWeightGrams + activeSession.runnerWeightGrams).toFixed(1)} g
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)', textTransform: 'uppercase' }}>{t('mat_theoretical_req')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
                {materialValidation.expectedUsageKg.toFixed(2)} kg
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: materialValidation.isAbnormal ? '#f59e0b' : '#34d399', textTransform: 'uppercase' }}>
                {t('mat_actual_consumed')}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: materialValidation.isAbnormal ? '#f59e0b' : '#34d399' }}>
                {totalUsedKg.toFixed(2)} kg
              </div>
            </div>
          </div>

          {/* 2-Column Grid for Material 1 and Material 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* MATERIAL 1 CARD */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-lg)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-medium)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--cyan-primary)' }}>
                  {t('material_1_title')}
                </span>
                <span className="badge-tag machine">Required</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t('mat_select_label')}</label>
                <select
                  className="touch-select"
                  value={mat1.materialId}
                  onChange={(e) => updateMaterial1('materialId', e.target.value)}
                >
                  {materialsList.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.materialCode}] {m.materialName} ({m.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('mat_lot_label')}</label>
                <input
                  type="text"
                  className="touch-input"
                  value={mat1.lotNumber}
                  onChange={(e) => updateMaterial1('lotNumber', e.target.value)}
                  placeholder="e.g. LOT-PP-2026-09"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">{t('mat_opening_label')}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="touch-input"
                    value={mat1.openingStockKg}
                    onChange={(e) => updateMaterial1('openingStockKg', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('mat_used_label')}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="touch-input"
                    style={{ borderColor: 'var(--cyan-primary)' }}
                    value={mat1.usedQuantityKg}
                    onChange={(e) => updateMaterial1('usedQuantityKg', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>{t('mat_balance_label')}</span>
                  <span style={{ color: 'var(--emerald-success)', fontSize: '0.75rem' }}>{t('auto_calculated_note')}</span>
                </label>
                <input
                  type="text"
                  className="touch-input"
                  style={{ color: 'var(--emerald-success)', fontWeight: 800, background: 'rgba(16, 185, 129, 0.08)' }}
                  value={`${Number(mat1.balanceQuantityKg).toFixed(2)} kg`}
                  readOnly
                />
              </div>
            </div>

            {/* MATERIAL 2 CARD (Purge / Masterbatch / Additive) */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-medium)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--amber-primary)' }}>
                  {t('material_2_title')}
                </span>
                <span className="badge-tag shift">Optional</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t('mat_select_label')} 2</label>
                <select
                  className="touch-select"
                  value={mat2.materialId}
                  onChange={(e) => updateMaterial2('materialId', e.target.value)}
                >
                  <option value="">-- None / Not Applicable --</option>
                  {materialsList.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.materialCode}] {m.materialName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('mat_lot_label')}</label>
                <input
                  type="text"
                  className="touch-input"
                  value={mat2.lotNumber}
                  onChange={(e) => updateMaterial2('lotNumber', e.target.value)}
                  placeholder="e.g. MB-BLACK-04"
                  disabled={!mat2.materialId}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">{t('mat_opening_label')}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="touch-input"
                    value={mat2.openingStockKg}
                    onChange={(e) => updateMaterial2('openingStockKg', e.target.value)}
                    disabled={!mat2.materialId}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('mat_used_label')}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="touch-input"
                    value={mat2.usedQuantityKg}
                    onChange={(e) => updateMaterial2('usedQuantityKg', e.target.value)}
                    disabled={!mat2.materialId}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>{t('mat_balance_label')}</span>
                  <span style={{ color: 'var(--emerald-success)', fontSize: '0.75rem' }}>{t('auto_calculated_note')}</span>
                </label>
                <input
                  type="text"
                  className="touch-input"
                  style={{ color: 'var(--emerald-success)', fontWeight: 800, background: 'rgba(16, 185, 129, 0.08)' }}
                  value={`${Number(mat2.balanceQuantityKg || 0).toFixed(2)} kg`}
                  readOnly
                />
              </div>
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="action-btn outline" onClick={onClose}>
            {t('btn_cancel')}
          </button>
          <button type="button" className="action-btn primary" onClick={handleSave}>
            <CheckCircle2 size={18} />
            <span>{t('btn_save_materials')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
