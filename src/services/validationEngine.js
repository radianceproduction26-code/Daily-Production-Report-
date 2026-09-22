// Radiance Polymers - Production Validation Engine
// Encapsulates Validations 1 through 9 with mathematical rigor and shop-floor safety checks

/**
 * Calculates Theoretical Hourly Target Production
 * Formula: (3600 / Cycle Time in seconds) * Cavity Count
 */
export function calculateTheoreticalHourlyTarget(cycleTimeSeconds, cavityCount) {
  if (!cycleTimeSeconds || cycleTimeSeconds <= 0 || !cavityCount || cavityCount <= 0) {
    return 0;
  }
  return Math.floor((3600 / Number(cycleTimeSeconds)) * Number(cavityCount));
}

/**
 * Validation 9 & Validation 1:
 * Calculates Maximum Physically Possible Production in an hour given downtime minutes
 * Formula:
 * Available Runtime (sec) = (60 - DowntimeMinutes) * 60
 * Max Qty = floor(Available Runtime / Cycle Time) * Cavity Count
 */
export function calculateMaxAllowedProduction(cycleTimeSeconds, cavityCount, downtimeMinutes = 0) {
  const dt = Math.max(0, Math.min(60, Number(downtimeMinutes) || 0));
  const availableRuntimeSeconds = (60 - dt) * 60;
  if (availableRuntimeSeconds <= 0 || !cycleTimeSeconds || cycleTimeSeconds <= 0) {
    return 0;
  }
  return Math.floor((availableRuntimeSeconds / Number(cycleTimeSeconds)) * Number(cavityCount));
}

import { TRANSLATIONS } from '../i18n/translations.js';

function getValMessage(key, lang = 'en', params = {}) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  Object.entries(params).forEach(([paramKey, paramVal]) => {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
  });
  return text;
}

/**
 * Evaluates an hourly entry against Validations 1, 2, 3, 4, 8, 9
 * Supports lang = 'en' | 'hi' for localized error feedback
 */
export function validateHourlyEntry({
  productionQty,
  rejectionQty,
  downtimeMinutes,
  cycleTimeSeconds,
  cavityCount,
  isSessionClosed = false,
  breakdownRejectionsTotal = null,
  breakdownDowntimesTotal = null,
  enforceTimeBalance = false,
  bufferMinutes = 5,
  lang = 'en'
}) {
  const errors = [];
  const warnings = [];

  const prod = Number(productionQty) || 0;
  const rej = Number(rejectionQty) || 0;
  const dt = Number(downtimeMinutes) || 0;
  const cycle = Number(cycleTimeSeconds) || 0;
  const cavities = Number(cavityCount) || 1;

  // Validation 8: Closed mould session cannot receive new production entries
  if (isSessionClosed) {
    errors.push(getValMessage('val_v8_session_closed', lang));
    return {
      isValid: false,
      errors,
      warnings,
      maxAllowed: 0,
      acceptedQty: 0,
      productionMinutes: 0,
      totalAccountedMinutes: 0,
      unaccountedMinutes: 60,
      isTimeBalanced: false
    };
  }

  // Validation 3: Downtime cannot exceed available time (60 min)
  if (dt < 0 || dt > 60) {
    errors.push(getValMessage('val_v3_downtime_range', lang, { dt }));
  }

  // Check breakdown sum if provided
  if (breakdownDowntimesTotal !== null && breakdownDowntimesTotal !== dt) {
    errors.push(`Validation 3: Breakdown sum (${breakdownDowntimesTotal} min) does not match total downtime (${dt} min).`);
  }

  // Validation 2: Rejected Quantity cannot exceed Production Quantity
  if (rej < 0) {
    errors.push(getValMessage('val_v2_negative', lang));
  } else if (rej > prod) {
    errors.push(getValMessage('val_v2_rejection_exceeded', lang, { rej, prod }));
  }

  // Check rejection breakdown sum if provided
  if (breakdownRejectionsTotal !== null && breakdownRejectionsTotal !== rej) {
    errors.push(`Validation 2: Breakdown sum (${breakdownRejectionsTotal} pcs) does not match total rejection (${rej} pcs).`);
  }

  // Validation 9 & Validation 1: Cycle-Time based physical capacity limit
  const maxAllowed = calculateMaxAllowedProduction(cycle, cavities, dt);
  const runtime = 60 - dt;
  if (cycle > 0 && prod > maxAllowed) {
    errors.push(
      getValMessage('val_v1_v9_exceeded', lang, { prod, max: maxAllowed, runtime, cycle, cavities })
    );
  }

  // Validation 4: Auto calculate accepted
  const acceptedQty = Math.max(0, prod - rej);

  // Time Balancing: 60-Minute check with buffer (default 5 min)
  const productionMinutes = (cycle > 0 && cavities > 0) ? (prod * cycle) / (cavities * 60) : 0;
  const totalAccountedMinutes = productionMinutes + dt;
  const unaccountedMinutes = Math.max(0, 60 - totalAccountedMinutes);
  const minAllowed = Math.max(0, 60 - bufferMinutes);
  const maxAllowedTime = 60 + bufferMinutes;
  const isTimeBalanced = totalAccountedMinutes >= minAllowed && totalAccountedMinutes <= maxAllowedTime;

  if (enforceTimeBalance && cycle > 0) {
    if (totalAccountedMinutes < minAllowed) {
      errors.push(
        getValMessage('val_time_unaccounted', lang, {
          accounted: totalAccountedMinutes.toFixed(1),
          missing: unaccountedMinutes.toFixed(1),
          prodMin: productionMinutes.toFixed(1),
          dtMin: dt,
          minAllowed,
          buffer: bufferMinutes
        })
      );
    } else if (totalAccountedMinutes > maxAllowedTime) {
      errors.push(
        getValMessage('val_time_exceeded', lang, {
          accounted: totalAccountedMinutes.toFixed(1),
          maxAllowedTime,
          prodMin: productionMinutes.toFixed(1),
          dtMin: dt,
          buffer: bufferMinutes
        })
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    maxAllowed,
    acceptedQty,
    productionMinutes: Math.round(productionMinutes * 10) / 10,
    totalAccountedMinutes: Math.round(totalAccountedMinutes * 10) / 10,
    unaccountedMinutes: Math.round(unaccountedMinutes * 10) / 10,
    isTimeBalanced
  };
}

/**
 * Validation 5 & Validation 6: Machine Counter Validation
 */
export function validateCounters({
  startCounter,
  endCounter,
  cavityCount,
  actualTotalProduction,
  tolerancePercent = 3.0,
  lang = 'en'
}) {
  const errors = [];
  const warnings = [];

  const start = Number(startCounter) || 0;
  const end = Number(endCounter) || 0;
  const cavities = Number(cavityCount) || 1;
  const actualProd = Number(actualTotalProduction) || 0;

  // Validation 5: End Counter must be greater than Start Counter
  if (end <= start) {
    errors.push(
      getValMessage('val_v5_counter_monotonic', lang, { end: end.toLocaleString(), start: start.toLocaleString() })
    );
    return {
      isValid: false,
      errors,
      warnings,
      totalShots: 0,
      expectedProduction: 0,
      variancePcs: 0,
      variancePercent: 0
    };
  }

  const totalShots = end - start;
  const expectedProduction = totalShots * cavities;
  const variancePcs = actualProd - expectedProduction;
  const variancePercent = expectedProduction > 0 ? (Math.abs(variancePcs) / expectedProduction) * 100 : 0;

  // Validation 6: Shot validation within configurable tolerance
  if (variancePercent > tolerancePercent) {
    warnings.push(
      getValMessage('val_v6_shot_variance', lang, {
        varPct: variancePercent.toFixed(1),
        delta: (variancePcs > 0 ? '+' : '') + variancePcs,
        expected: expectedProduction.toLocaleString(),
        shots: totalShots.toLocaleString()
      })
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalShots,
    expectedProduction,
    variancePcs,
    variancePercent
  };
}

/**
 * Validation 7: Material Consumption Validation
 */
export function validateMaterialConsumption({
  actualTotalProduction,
  partWeightGrams,
  runnerWeightGrams,
  totalMaterialUsedKg,
  tolerancePercent = 5.0,
  lang = 'en'
}) {
  const warnings = [];
  const prod = Number(actualTotalProduction) || 0;
  const partWt = Number(partWeightGrams) || 0;
  const runnerWt = Number(runnerWeightGrams) || 0;
  const actualUsedKg = Number(totalMaterialUsedKg) || 0;

  const shotWeightGrams = partWt + runnerWt;
  const expectedUsageKg = (prod * shotWeightGrams) / 1000;
  const varianceKg = actualUsedKg - expectedUsageKg;
  const variancePercent = expectedUsageKg > 0 ? (Math.abs(varianceKg) / expectedUsageKg) * 100 : 0;

  if (actualUsedKg > 0 && variancePercent > tolerancePercent) {
    warnings.push(
      getValMessage('val_v7_material_variance', lang, {
        varPct: variancePercent.toFixed(1),
        actual: actualUsedKg.toFixed(2),
        expected: expectedUsageKg.toFixed(2)
      })
    );
  }

  return {
    expectedUsageKg,
    actualUsedKg,
    varianceKg,
    variancePercent,
    warnings,
    isAbnormal: variancePercent > tolerancePercent
  };
}

/**
 * Calculates Overall Equipment Effectiveness (OEE) and shift performance indicators
 */
export function calculateOEEMetrics({
  plannedProductionTimeMinutes = 480, // e.g. 8 hours or 12 hours
  totalDowntimeMinutes = 0,
  totalProductionQty = 0,
  acceptedQty = 0,
  standardCycleTimeSeconds = 20,
  cavityCount = 2
}) {
  const plannedTime = Math.max(1, Number(plannedProductionTimeMinutes) || 480);
  const downtime = Math.min(plannedTime, Math.max(0, Number(totalDowntimeMinutes) || 0));
  const operatingTime = plannedTime - downtime;

  // 1. Availability = Operating Time / Planned Production Time
  const availability = operatingTime / plannedTime;

  // 2. Performance = (Total Production * Standard Cycle Time) / (Operating Time * 60 * Cavity Count)
  const theoreticalMaxPossible = operatingTime > 0 && standardCycleTimeSeconds > 0
    ? (operatingTime * 60 / standardCycleTimeSeconds) * cavityCount
    : 0;
  const performance = theoreticalMaxPossible > 0 ? Math.min(1.0, totalProductionQty / theoreticalMaxPossible) : 0;

  // 3. Quality = Accepted Qty / Total Production Qty
  const quality = totalProductionQty > 0 ? acceptedQty / totalProductionQty : 1.0;

  // Overall OEE = Availability * Performance * Quality
  const oee = availability * performance * quality;

  return {
    availabilityPercent: (availability * 100).toFixed(1),
    performancePercent: (performance * 100).toFixed(1),
    qualityPercent: (quality * 100).toFixed(1),
    oeePercent: (oee * 100).toFixed(1),
    operatingTimeMinutes: operatingTime,
    theoreticalMaxPossible: Math.floor(theoreticalMaxPossible)
  };
}

/**
 * Validation: Standardized Machine Code Format
 * Pattern: ^MC[0-9]{2}$ (e.g. MC01 to MC99)
 * Valid: MC01, MC05, MC10, MC14, MC25
 * Invalid: MC1, MC-01, Machine01, IMM05, Machine 5, MC001
 */
export const MACHINE_CODE_REGEX = /^MC[0-9]{2}$/;

export function validateMachineCode(machineCode, lang = 'en') {
  const code = (machineCode || '').trim().toUpperCase();
  const isValid = MACHINE_CODE_REGEX.test(code);
  const errors = [];

  if (!isValid) {
    errors.push(getValMessage('val_machine_code_format', lang, { code: machineCode || 'EMPTY' }));
  }

  return {
    isValid,
    machineCode: code,
    errors
  };
}

