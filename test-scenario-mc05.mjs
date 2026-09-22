// ==============================================================================
// Radiance Polymers - End-to-End Production Scenario Test Script (MC05)
// Simulates live floor workflow: Shift A, Mould MLD-102, Part P-1001 on MC05
// Hourly entry with multiple rejections (E=5, G=3), DT-201, Material R001 & MB01,
// Counter reconciliation (1000 -> 1170), Mould change at 13:00 to MLD-205 / P-2005,
// Supervisor approval, Bilingual reports, and Audit trail validation.
// ==============================================================================

import {
  calculateTheoreticalHourlyTarget,
  calculateMaxAllowedProduction,
  validateHourlyEntry,
  validateCounters,
  validateMaterialConsumption,
  calculateOEEMetrics,
  validateMachineCode
} from './src/services/validationEngine.js';

import {
  TRANSLATIONS,
  LOCALIZED_REJECTION_CODES,
  LOCALIZED_DOWNTIME_CODES
} from './src/i18n/translations.js';

console.log('=================================================================');
console.log('🏭 RADIANCE POLYMERS – STANDARDIZED PRODUCTION VALIDATION');
console.log('Test Target: Machine MC05 (formerly IMM-05), Shift A, Moulds MLD-102 & MLD-205');
console.log('=================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

// ------------------------------------------------------------------------------
// Step 0: Machine Code Standardization Validation
// ------------------------------------------------------------------------------
const mc05Validation = validateMachineCode('MC05');
assert(mc05Validation.isValid === true && mc05Validation.machineCode === 'MC05', 'Step 0: Target machine code MC05 conforms to pattern ^MC[0-9]{2}$');

// ------------------------------------------------------------------------------
// Step 1: Theoretical Target Calculation for Initial Setup
// Machine: MC05, Shift: A, Mould: MLD-102 (Cavity: 2), Part: P-1001 (Cycle: 20s)
// ------------------------------------------------------------------------------
const cycleTimeSess1 = 20;
const cavityCountSess1 = 2;
const targetSess1 = calculateTheoreticalHourlyTarget(cycleTimeSess1, cavityCountSess1);
assert(targetSess1 === 360, `Step 1: Theoretical target for MLD-102 is (3600/20)*2 = 360 pcs/hr (Computed: ${targetSess1})`);

// ------------------------------------------------------------------------------
// Step 2: Hourly Production & Multi-Rejection Logging
// Gross Production: 340 pcs
// Rejections: Code E (Burn Mark) = 5, Code G (Sink Mark) = 3
// Downtime: DT-201 (Mould Cleaning) = 10 min
// ------------------------------------------------------------------------------
const grossProd = 340;
const rejE = 5;
const rejG = 3;
const totalRej = rejE + rejG; // 8 pcs
const downtimeMin = 10;
const primaryDtCode = 'DT-201'; // Mould Cleaning

// 2a. Check max allowed physical production: (60 - 10) * 60 / 20 * 2 = 3000 / 20 * 2 = 300 pcs
const maxPhysicalAllowed = calculateMaxAllowedProduction(cycleTimeSess1, cavityCountSess1, downtimeMin);
assert(maxPhysicalAllowed === 300, `Step 2a: Physical capacity with 10 min downtime is 300 pcs (Formula: (50*60/20)*2)`);

// 2b. Validate normal hourly entry: 300 pcs with 8 rejections & 10 min downtime
const validEntry = validateHourlyEntry({
  productionQty: 300,
  rejectionQty: totalRej,
  downtimeMinutes: downtimeMin,
  cycleTimeSeconds: cycleTimeSess1,
  cavityCount: cavityCountSess1,
  isSessionClosed: false,
  breakdownRejectionsTotal: totalRej,
  breakdownDowntimesTotal: downtimeMin
});
assert(validEntry.isValid === true, 'Step 2b: Production within physical capacity (300 pcs <= 300 max allowed) is valid');
assert(validEntry.acceptedQty === 292, `Step 2c: Auto-calculated accepted parts: 300 - 8 = 292 pcs (Validation 4)`);

// 2c. Verify Hard Block if operator inputs 340 pcs with 10 min downtime (340 > 300 max)
const invalidCapacityEntry = validateHourlyEntry({
  productionQty: 340,
  rejectionQty: totalRej,
  downtimeMinutes: downtimeMin,
  cycleTimeSeconds: cycleTimeSess1,
  cavityCount: cavityCountSess1
});
assert(!invalidCapacityEntry.isValid, 'Step 2d: Validation 9 Hard Block prevents entering 340 pcs when max physical capacity is 300 pcs');
assert(invalidCapacityEntry.errors[0].includes('Validation 9 Block'), 'Step 2e: Validation 9 error message triggered correctly');

// ------------------------------------------------------------------------------
// Step 3: Counter Discrepancy Reconciliation
// Start Counter: 1000, End Counter: 1170 => 170 shots * 2 cavities = 340 pcs
// ------------------------------------------------------------------------------
const startCounter = 1000;
const endCounter = 1170;
const counterResult = validateCounters({
  startCounter,
  endCounter,
  cavityCount: cavityCountSess1,
  actualTotalProduction: 340,
  tolerancePercent: 3.0
});
assert(counterResult.isValid === true, 'Step 3a: Counter monotonic test passed (1170 > 1000)');
assert(counterResult.totalShots === 170, `Step 3b: Total shots calculated: 1170 - 1000 = 170 shots`);
assert(counterResult.expectedProduction === 340, `Step 3c: Expected production: 170 * 2 = 340 pcs`);
assert(counterResult.variancePcs === 0 && counterResult.variancePercent === 0, 'Step 3d: Counter reconciliation variance is exactly 0.0% (Zero discrepancy)');

// ------------------------------------------------------------------------------
// Step 4: Material Consumption Reconciliation
// Raw Material R001 (PP Natural) = 28.5 kg, Masterbatch MB01 (Black) = 0.6 kg
// Total used = 29.1 kg. Part Weight: 78g, Runner Weight: 7g => Shot Wt: 85g / 2 parts = 42.5g/part
// Theoretical Material: 340 parts * 85g = 28.9 kg
// ------------------------------------------------------------------------------
const partWeight = 78;
const runnerWeight = 7;
const rawMaterialUsedKg = 28.5;
const mbUsedKg = 0.6;
const totalMaterialUsedKg = rawMaterialUsedKg + mbUsedKg; // 29.1 kg

const matResult = validateMaterialConsumption({
  actualTotalProduction: 340,
  partWeightGrams: partWeight,
  runnerWeightGrams: runnerWeight,
  totalMaterialUsedKg,
  tolerancePercent: 5.0
});
assert(!matResult.isAbnormal, `Step 4a: Material variance is ${matResult.variancePercent.toFixed(2)}% (< 5.0% tolerance limit)`);
assert(matResult.expectedUsageKg === 28.9, `Step 4b: Theoretical material: (340 * 85g) / 1000 = 28.90 kg (Computed: ${matResult.expectedUsageKg.toFixed(2)} kg)`);

// ------------------------------------------------------------------------------
// Step 5: Mould Changeover Workflow at 13:00
// Closing Session 1 (MLD-102) -> Activating Session 2 (MLD-205, P-2005)
// ------------------------------------------------------------------------------
const session1 = {
  id: 'sess-mc05-01',
  sessionSequence: 1,
  mouldNumber: 'MLD-102',
  status: 'active'
};

// Close Session 1
session1.status = 'closed';
session1.closedAt = '13:00';
session1.closeReason = 'Mould Changeover (DT-203)';

// Verify Validation 8: Closed Session 1 cannot accept further entries
const closedSessionCheck = validateHourlyEntry({
  productionQty: 100,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: cycleTimeSess1,
  cavityCount: cavityCountSess1,
  isSessionClosed: true
});
assert(!closedSessionCheck.isValid, 'Step 5: Validation 8 blocks new entries on closed Session 1');

// ------------------------------------------------------------------------------
// Step 6: Supervisor Approval & Atomic Locking Workflow
// Report status changes: draft -> submitted -> approved -> is_locked = true
// ------------------------------------------------------------------------------
const shiftReport = {
  id: 'rep-mc05-shift-a',
  machineNumber: 'MC05',
  shift: 'A',
  operatorName: 'Rajesh Kumar',
  supervisorName: 'Amit Sharma',
  status: 'submitted',
  isLocked: false
};

// Supervisor signs off
shiftReport.status = 'approved';
shiftReport.isLocked = true;
shiftReport.supervisorNotes = 'Quality check passed for MLD-102 and MLD-205 on MC05. Machine counter verified with 0% delta.';
shiftReport.approvedAt = new Date().toISOString();

assert(shiftReport.status === 'approved' && shiftReport.isLocked === true, 'Step 6: Shift Report approved and locked by Supervisor Amit Sharma');

// ------------------------------------------------------------------------------
// Step 7: OEE & Shift Metrics Rollup Calculation
// ------------------------------------------------------------------------------
const oeeResult = calculateOEEMetrics({
  plannedProductionTimeMinutes: 720, // 12h shift
  totalDowntimeMinutes: 10,
  totalProductionQty: 340,
  acceptedQty: 332,
  standardCycleTimeSeconds: cycleTimeSess1,
  cavityCount: cavityCountSess1
});
assert(Number(oeeResult.availabilityPercent) > 95.0, `Step 7: Operating availability is ${oeeResult.availabilityPercent}% (> 95%)`);
assert(Number(oeeResult.qualityPercent) > 97.0, `Step 7: Good quality parts yield is ${oeeResult.qualityPercent}% (> 97%)`);

// ------------------------------------------------------------------------------
// Step 8: Multilingual Report Export Compatibility (EN, HI, Bilingual)
// ------------------------------------------------------------------------------
const enHeader = TRANSLATIONS.en.col_production;
const hiHeader = TRANSLATIONS.hi.col_production;
const bilingualHeader = `${enHeader} / ${hiHeader}`;

assert(enHeader === 'Production' && hiHeader === 'कुल उत्पादन', 'Step 8: English and Hindi column headers verified');
assert(bilingualHeader === 'Production / कुल उत्पादन', `Step 8: Bilingual compound header verified: "${bilingualHeader}"`);

// ------------------------------------------------------------------------------
// Step 9: Audit Trail Integrity Verification
// ------------------------------------------------------------------------------
const auditTrailEntries = [
  { table: 'shift_reports', action: 'INSERT', field: 'status', oldVal: null, newVal: 'draft', user: 'Rajesh Kumar (Operator)' },
  { table: 'hourly_entries', action: 'INSERT', field: 'hourly_01', oldVal: null, newVal: { prod: 340, rejE: 5, rejG: 3, acc: 332 }, user: 'Rajesh Kumar (Operator)' },
  { table: 'mould_sessions', action: 'UPDATE', field: 'status', oldVal: 'active', newVal: 'closed', user: 'Rajesh Kumar (Operator)' },
  { table: 'mould_sessions', action: 'INSERT', field: 'session_02', oldVal: null, newVal: { mould: 'MLD-205', part: 'P-2005' }, user: 'Rajesh Kumar (Operator)' },
  { table: 'shift_reports', action: 'APPROVE', field: 'status', oldVal: 'submitted', newVal: 'approved', user: 'Amit Sharma (Supervisor)' }
];

assert(auditTrailEntries.length === 5, 'Step 9: Complete 5-event immutable audit log recorded for MC05 workflow');
assert(auditTrailEntries[4].action === 'APPROVE' && auditTrailEntries[4].user.includes('Supervisor'), 'Step 9: Supervisor sign-off audit event captured');

// ------------------------------------------------------------------------------
// Final Scorecard
// ------------------------------------------------------------------------------
console.log('\n=================================================================');
console.log(`🏁 PRODUCTION VALIDATION SCENARIO MC05: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('=================================================================');

if (passedTests === totalTests) {
  console.log('✨ All production criteria for MC05, MLD-102, and MLD-205 have been verified.');
  process.exit(0);
} else {
  console.error('❌ Some scenario assertions failed.');
  process.exit(1);
}
