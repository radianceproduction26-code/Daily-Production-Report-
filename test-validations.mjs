// Automated Verification Test Script for Radiance Polymers Validation Engine
import {
  calculateTheoreticalHourlyTarget,
  calculateMaxAllowedProduction,
  validateHourlyEntry,
  validateCounters,
  validateMaterialConsumption,
  calculateOEEMetrics,
  validateMachineCode,
  MACHINE_CODE_REGEX
} from './src/services/validationEngine.js';

console.log('=================================================================');
console.log('🧪 RADIANCE POLYMERS - VALIDATION ENGINE AUTOMATED TEST SUITE');
console.log('=================================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, testName) {
  testsTotal++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

// 1. Theoretical Target Calculation
// Formula: (3600 / Cycle Time) * Cavity Count
// Example from prompt: Cycle Time = 20s, Cavity = 2 => Target = 360 pcs/hr
const target1 = calculateTheoreticalHourlyTarget(20, 2);
assert(target1 === 360, 'Target Calculation: Cycle 20s, Cavity 2 => 360 pcs/hr');

// Example 2: Cycle Time = 18s, Cavity = 4 => (3600 / 18) * 4 = 800 pcs/hr
const target2 = calculateTheoreticalHourlyTarget(18, 4);
assert(target2 === 800, 'Target Calculation: Cycle 18s, Cavity 4 => 800 pcs/hr');

// 2. Validation 1 & 9: Cycle-Time based physical capacity limit
// 60 min runtime, 20s cycle, 2 cavities => 360 max allowed
const maxNoDt = calculateMaxAllowedProduction(20, 2, 0);
assert(maxNoDt === 360, 'V9 Max Capacity: 0 min downtime => 360 pcs allowed');

// 30 min downtime => available runtime = 30 min = 1800s. floor(1800/20) * 2 = 180 pcs max
const maxWithDt = calculateMaxAllowedProduction(20, 2, 30);
assert(maxWithDt === 180, 'V9 Max Capacity: 30 min downtime => 180 pcs allowed');

// 3. Validation 9 Hard Block: Operator enters 400 pcs when max is 360
const v9Block = validateHourlyEntry({
  productionQty: 400,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2
});
assert(!v9Block.isValid, 'V9 Hard Block: 400 pcs exceeds 360 max capacity => blocked');
assert(v9Block.errors.some(e => e.includes('Validation 9')), 'V9 error message triggered');

// 4. Validation 2: Rejection Quantity cannot exceed Production Quantity
const v2Block = validateHourlyEntry({
  productionQty: 100,
  rejectionQty: 120,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2
});
assert(!v2Block.isValid, 'V2 Hard Block: 120 rejections > 100 production => blocked');

// 5. Validation 3: Downtime cannot exceed available time (60 min)
const v3Block = validateHourlyEntry({
  productionQty: 100,
  rejectionQty: 5,
  downtimeMinutes: 75,
  cycleTimeSeconds: 20,
  cavityCount: 2
});
assert(!v3Block.isValid, 'V3 Hard Block: 75 min downtime > 60 min => blocked');

// 6. Validation 4: Accepted Quantity auto-calculated (Accepted = Prod - Rej)
const v4Check = validateHourlyEntry({
  productionQty: 250,
  rejectionQty: 14,
  downtimeMinutes: 10,
  cycleTimeSeconds: 20,
  cavityCount: 2
});
assert(v4Check.acceptedQty === 236, 'V4 Auto-Calculated Accepted Qty: 250 - 14 = 236 pcs');

// 7. Validation 5: Machine End Counter must be greater than Start Counter
const v5Fail = validateCounters({
  startCounter: 50000,
  endCounter: 49900,
  cavityCount: 2,
  actualTotalProduction: 200
});
assert(!v5Fail.isValid, 'V5 Hard Block: End Counter (49900) <= Start Counter (50000) => blocked');

const v5Pass = validateCounters({
  startCounter: 50000,
  endCounter: 50500,
  cavityCount: 2,
  actualTotalProduction: 1000,
  tolerancePercent: 3.0
});
assert(v5Pass.isValid, 'V5 Monotonic Counter: 50500 > 50000 => valid');
assert(v5Pass.totalShots === 500, 'V5 Total Shots: 50500 - 50000 = 500 shots');
assert(v5Pass.expectedProduction === 1000, 'V6 Expected Production: 500 shots * 2 cav = 1000 pcs');
assert(v5Pass.variancePercent === 0, 'V6 Zero Variance: actual 1000 vs expected 1000');

// 8. Validation 6: Shot Tolerance Warning
const v6Warn = validateCounters({
  startCounter: 50000,
  endCounter: 50500,
  cavityCount: 2,
  actualTotalProduction: 900, // 10% discrepancy
  tolerancePercent: 3.0
});
assert(v6Warn.warnings.length > 0, 'V6 Warning Triggered: 10% discrepancy flagged');

// 9. Validation 7: Material Consumption Validation
// 1000 pcs produced, part wt 110g, runner wt 24g => shot wt 134g => expected 134 kg
const v7Normal = validateMaterialConsumption({
  actualTotalProduction: 1000,
  partWeightGrams: 110,
  runnerWeightGrams: 24,
  totalMaterialUsedKg: 135,
  tolerancePercent: 5.0
});
assert(!v7Normal.isAbnormal, 'V7 Normal Material: 135 kg used vs 134 kg expected (< 5% delta)');

const v7Abnormal = validateMaterialConsumption({
  actualTotalProduction: 1000,
  partWeightGrams: 110,
  runnerWeightGrams: 24,
  totalMaterialUsedKg: 160, // 19.4% variance
  tolerancePercent: 5.0
});
assert(v7Abnormal.isAbnormal, 'V7 Abnormal Material: 160 kg used vs 134 kg expected (> 5% delta)');

// 10. Validation 8: Closed session cannot receive new production entries
const v8Block = validateHourlyEntry({
  productionQty: 200,
  rejectionQty: 5,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  isSessionClosed: true
});
assert(!v8Block.isValid, 'V8 Hard Block: Closed session cannot receive entries');

// 11. OEE Metric Math Check
const oee = calculateOEEMetrics({
  plannedProductionTimeMinutes: 480,
  totalDowntimeMinutes: 48, // Availability = (480-48)/480 = 90%
  totalProductionQty: 1000,
  acceptedQty: 950,        // Quality = 950/1000 = 95%
  standardCycleTimeSeconds: 20,
  cavityCount: 2
});
assert(Number(oee.availabilityPercent) === 90.0, 'OEE Availability: 432 / 480 = 90%');
assert(Number(oee.qualityPercent) === 95.0, 'OEE Quality: 950 / 1000 = 95%');

// 12. Multilingual (i18n) Engine Validation
import { TRANSLATIONS, LOCALIZED_REJECTION_CODES, LOCALIZED_DOWNTIME_CODES } from './src/i18n/translations.js';

// Test English Validation Error Text
const enVal = validateHourlyEntry({
  productionQty: 500,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  lang: 'en'
});
assert(enVal.errors[0].includes('Validation 9 Block: Entered production (500 pcs) exceeds physical capacity limit (360 pcs)'), 'i18n: English validation error emitted correctly');

// Test Hindi Validation Error Text
const hiVal = validateHourlyEntry({
  productionQty: 500,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  lang: 'hi'
});
assert(hiVal.errors[0].includes('सत्यापन 9 अवरोध') && hiVal.errors[0].includes('भौतिक क्षमता सीमा (360 pcs)'), 'i18n: Hindi validation error emitted correctly');

// Test A-Q Localized Rejections (Total 17 codes)
assert(LOCALIZED_REJECTION_CODES.length === 17, 'i18n: All 17 A–Q Rejection codes defined');
const codeA = LOCALIZED_REJECTION_CODES.find(r => r.code === 'A');
assert(codeA.desc_en === 'Start Up' && codeA.desc_hi.includes('स्टार्ट अप'), 'i18n: Code A localized in English & Hindi (Start Up)');
const codeB = LOCALIZED_REJECTION_CODES.find(r => r.code === 'B');
assert(codeB.desc_en === 'Set Up' && codeB.desc_hi.includes('सेट अप'), 'i18n: Code B localized in English & Hindi (Set Up)');

// Test Machine Code Standardization Validation (MC01 - MC99)
const validMachineCodes = ['MC01', 'MC05', 'MC10', 'MC14', 'MC25'];
validMachineCodes.forEach(code => {
  const res = validateMachineCode(code, 'en');
  assert(res.isValid === true && res.machineCode === code, `Machine Code Valid: ${code} passes regex ^MC[0-9]{2}$`);
});

const invalidMachineCodes = ['MC1', 'MC-01', 'Machine01', 'IMM05', 'IMM-05', 'Machine 5', 'MC001', 'mc1', ''];
invalidMachineCodes.forEach(code => {
  const res = validateMachineCode(code, 'en');
  assert(res.isValid === false && res.errors.length > 0, `Machine Code Invalid Rejected: "${code}" correctly rejected`);
});

// Test localized error messages for machine code validation
const enMachineErr = validateMachineCode('IMM-05', 'en');
assert(enMachineErr.errors[0].includes('Invalid machine code "IMM-05"') && enMachineErr.errors[0].includes('MC01 to MC99'), 'Machine Code: English error message verified');

const hiMachineErr = validateMachineCode('IMM-05', 'hi');
assert(hiMachineErr.errors[0].includes('अमान्य मशीन कोड "IMM-05"') && hiMachineErr.errors[0].includes('MC01 से MC99'), 'Machine Code: Hindi error message verified');

// ── 60-Minute Hourly Balance Check (with 5-min buffer) ──
// 1. Exact 60-min match (360 pcs at 20s cycle, 2 cav = 60 min, 0 min downtime)
const tbExact = validateHourlyEntry({
  productionQty: 360,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true,
  bufferMinutes: 5
});
assert(tbExact.isValid === true && tbExact.totalAccountedMinutes === 60 && tbExact.isTimeBalanced === true, '60-Min Balance: Exact 60m production (360 pcs) + 0m DT => VALID');

// 2. Mixed Production and Downtime (180 pcs = 30m prod + 30m downtime = 60m)
const tbMixed = validateHourlyEntry({
  productionQty: 180,
  rejectionQty: 5,
  downtimeMinutes: 30,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true,
  bufferMinutes: 5
});
assert(tbMixed.isValid === true && tbMixed.totalAccountedMinutes === 60 && tbMixed.isTimeBalanced === true, '60-Min Balance: 30m prod (180 pcs) + 30m DT => VALID');

// 3. 5-Min Buffer Lower Bound: 330 pcs = 55m prod + 0m DT = 55m (within 55-65m window)
const tbBufferLower = validateHourlyEntry({
  productionQty: 330,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true,
  bufferMinutes: 5
});
assert(tbBufferLower.isValid === true && tbBufferLower.totalAccountedMinutes === 55 && tbBufferLower.isTimeBalanced === true, '60-Min Balance: 55m prod (330 pcs) + 0m DT => VALID (5-min buffer)');

// 4. Unaccounted Time Failure: 150 pcs = 25m prod + 0m DT = 25m (< 55m) => BLOCKED
const tbFailUnaccounted = validateHourlyEntry({
  productionQty: 150,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true,
  bufferMinutes: 5
});
assert(tbFailUnaccounted.isValid === false && tbFailUnaccounted.totalAccountedMinutes === 25 && tbFailUnaccounted.errors.some(e => e.includes('60 minutes')), '60-Min Balance Block: 25m prod + 0m DT => BLOCKED (35m missing)');

// 5. Insufficient Downtime: 200 pcs = 33.3m prod + 10m DT = 43.3m (< 55m) => BLOCKED
const tbFailPartial = validateHourlyEntry({
  productionQty: 200,
  rejectionQty: 2,
  downtimeMinutes: 10,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true,
  bufferMinutes: 5
});
assert(tbFailPartial.isValid === false && tbFailPartial.isTimeBalanced === false, '60-Min Balance Block: 33.3m prod + 10m DT = 43.3m (< 55m) => BLOCKED');

// 6. Full Downtime Hour: 0 pcs + 60m DT => VALID
const tbFullDowntime = validateHourlyEntry({
  productionQty: 0,
  rejectionQty: 0,
  downtimeMinutes: 60,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true,
  bufferMinutes: 5
});
assert(tbFullDowntime.isValid === true && tbFullDowntime.totalAccountedMinutes === 60 && tbFullDowntime.isTimeBalanced === true, '60-Min Balance: 0 pcs + 60m DT => VALID');

// 7. Multi-Reason Breakdown Summation Integrity Checks
const tbBreakdownMatch = validateHourlyEntry({
  productionQty: 300,
  rejectionQty: 10,
  downtimeMinutes: 10,
  breakdownRejectionsTotal: 10,
  breakdownDowntimesTotal: 10,
  cycleTimeSeconds: 20,
  cavityCount: 2,
  enforceTimeBalance: true
});
assert(tbBreakdownMatch.isValid === true, 'Multi-Reason Breakdown: Matching sum of rejection and downtime => VALID');

const tbBreakdownMismatch = validateHourlyEntry({
  productionQty: 300,
  rejectionQty: 10,
  downtimeMinutes: 10,
  breakdownRejectionsTotal: 8, // mismatch
  cycleTimeSeconds: 20,
  cavityCount: 2
});
assert(tbBreakdownMismatch.isValid === false && tbBreakdownMismatch.errors.some(e => e.includes('Breakdown sum')), 'Multi-Reason Breakdown: Mismatched rejection breakdown => BLOCKED');


console.log('\n=================================================================');
console.log(`🏁 TEST RESULTS: ${testsPassed} / ${testsTotal} PASSED`);
console.log('=================================================================');

if (testsPassed === testsTotal) {
  process.exit(0);
} else {
  process.exit(1);
}
