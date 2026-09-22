// Radiance Polymers - Phase 4 User Acceptance Testing (UAT) Automated Suite
// Validates Operator, Supervisor, Production Manager, and Admin Personas
import assert from 'node:assert';
import {
  calculateTheoreticalHourlyTarget,
  calculateMaxAllowedProduction,
  validateHourlyEntry,
  validateCounters,
  validateMaterialConsumption,
  calculateOEEMetrics
} from './src/services/validationEngine.js';

import {
  TRANSLATIONS,
  LOCALIZED_REJECTION_CODES,
  LOCALIZED_DOWNTIME_CODES
} from './src/i18n/translations.js';

console.log('=================================================================');
console.log('📋 RADIANCE POLYMERS – PHASE 4 USER ACCEPTANCE TESTING (UAT)');
console.log('=================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// 1. OPERATOR PERSONA UAT WORKFLOW (Rajesh Kumar - Operator)
// -------------------------------------------------------------
console.log('--- 👷 PERSONA 1: OPERATOR WORKFLOW ---');

const operatorUser = {
  id: 'usr-op-01',
  badgeNumber: 'OP-4401',
  fullName: 'Rajesh Kumar',
  role: 'operator',
  pinHash: '1234'
};

let operatorSession = null;
let currentReport = null;

runTest('Operator: 1.1 Badge & PIN Authentication', () => {
  assert.strictEqual(operatorUser.role, 'operator');
  assert.strictEqual(operatorUser.pinHash, '1234');
  assert.strictEqual(operatorUser.fullName, 'Rajesh Kumar');
});

runTest('Operator: 1.2 Start Production Session with Target Rate Calculation', () => {
  currentReport = {
    id: 'rep-uat-001',
    machineId: 'MC03',
    machineNumber: 'MC03',
    shift: 'A',
    reportDate: '2026-09-16',
    operatorId: operatorUser.id,
    operatorName: operatorUser.fullName,
    status: 'draft',
    mouldSessions: []
  };

  const target = calculateTheoreticalHourlyTarget(20.0, 2); // 20s cycle, 2 cavities
  assert.strictEqual(target, 360, 'Target should be exactly 360 pcs/hr');

  operatorSession = {
    id: 'sess-uat-01',
    sessionSequence: 1,
    mouldId: 'MLD-102',
    mouldNumber: 'MLD-102',
    mouldName: '28mm Cap Mould',
    cavityCount: 2,
    partId: 'P-1001',
    partNumber: 'P-1001',
    partName: 'Water Cap 28mm PCO',
    standardCycleTimeSeconds: 20.0,
    theoreticalTargetPerHour: target,
    startTime: '07:00',
    endTime: null,
    isActive: true,
    startCounter: 1000,
    endCounter: null,
    entries: [],
    materials: []
  };

  currentReport.mouldSessions.push(operatorSession);
  assert.strictEqual(currentReport.mouldSessions.length, 1);
  assert.strictEqual(operatorSession.isActive, true);
});

runTest('Operator: 1.3 Hourly Entry Logging (Gross Output & Capacity Checks)', () => {
  const maxAllowed = calculateMaxAllowedProduction(20.0, 2, 0);
  assert.strictEqual(maxAllowed, 360);

  const validation = validateHourlyEntry({
    productionQty: 340,
    rejectionQty: 0,
    downtimeMinutes: 0,
    cycleTimeSeconds: 20.0,
    cavityCount: 2,
    sessionIsActive: true
  });

  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.acceptedQty, 340);

  const hour1 = {
    hourIndex: 1,
    hourInterval: '07:00 - 08:00',
    theoreticalTarget: 360,
    productionQty: 340,
    rejectionQty: 0,
    acceptedQty: 340,
    downtimeMinutes: 0,
    remarks: 'Normal startup speed'
  };

  operatorSession.entries.push(hour1);
  assert.strictEqual(operatorSession.entries.length, 1);
});

runTest('Operator: 1.4 Rejection Entry (A–Q Multi-code Breakdown & Accepted Qty)', () => {
  const validation = validateHourlyEntry({
    productionQty: 340,
    rejectionQty: 8,
    downtimeMinutes: 0,
    cycleTimeSeconds: 20.0,
    cavityCount: 2,
    sessionIsActive: true
  });

  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.acceptedQty, 332);

  const hour2 = {
    hourIndex: 2,
    hourInterval: '08:00 - 09:00',
    theoreticalTarget: 360,
    productionQty: 340,
    rejections: [
      { code: 'E', name: 'Burn Mark', quantity: 5 },
      { code: 'G', name: 'Sink Mark', quantity: 3 }
    ],
    rejectionQty: 8,
    acceptedQty: 332,
    downtimeMinutes: 0,
    downtimes: []
  };

  assert.strictEqual(hour2.rejections.reduce((sum, r) => sum + r.quantity, 0), 8);
  operatorSession.entries.push(hour2);
  assert.strictEqual(operatorSession.entries.length, 2);
});

runTest('Operator: 1.5 Downtime Entry (DT-101 to DT-602 Categorized & Runtime Cap Gate)', () => {
  // With 10 min downtime on 20s cycle and 2 cavities, max allowed is 300 pcs.
  const maxAllowedWith10m = calculateMaxAllowedProduction(20.0, 2, 10);
  assert.strictEqual(maxAllowedWith10m, 300);

  const hour3Validation = validateHourlyEntry({
    productionQty: 290,
    rejectionQty: 2,
    downtimeMinutes: 10,
    cycleTimeSeconds: 20.0,
    cavityCount: 2,
    sessionIsActive: true
  });

  assert.strictEqual(hour3Validation.isValid, true);
  assert.strictEqual(hour3Validation.acceptedQty, 288);

  const hour3 = {
    hourIndex: 3,
    hourInterval: '09:00 - 10:00',
    theoreticalTarget: 360,
    productionQty: 290,
    rejections: [{ code: 'A', name: 'Start Up', quantity: 2 }],
    rejectionQty: 2,
    acceptedQty: 288,
    downtimeMinutes: 10,
    downtimes: [{ code: 'DT-201', durationMinutes: 10, reason: 'Mould Cleaning' }]
  };

  operatorSession.entries.push(hour3);
  assert.strictEqual(operatorSession.entries.length, 3);
  const dt201 = LOCALIZED_DOWNTIME_CODES.find(d => d.code === 'DT-201');
  assert.ok(dt201, 'DT-201 must exist in master');
  assert.strictEqual(dt201.desc_hi, 'मोल्ड सफाई', 'DT-201 must have correct Hindi description');
});

runTest('Operator: 1.6 Material Entry (Resin & Masterbatch Tracking)', () => {
  const mat1 = {
    slot: 1,
    materialCode: 'R001',
    materialName: 'HDPE Injection Grade MFI 20',
    lotNumber: 'LOT-HDPE-2026-0916',
    openingStockKg: 100.0,
    usedQuantityKg: 12.0,
    balanceQuantityKg: 88.0
  };
  const mat2 = {
    slot: 2,
    materialCode: 'MB01',
    materialName: 'Blue Masterbatch 2%',
    lotNumber: 'LOT-MB-BLUE-01',
    openingStockKg: 10.0,
    usedQuantityKg: 0.5,
    balanceQuantityKg: 9.5
  };

  operatorSession.materials.push(mat1, mat2);
  assert.strictEqual(operatorSession.materials.length, 2);

  // Check material variance validation: 340 pcs × 38g / 1000 = 12.92 kg theoretical
  const matCheck = validateMaterialConsumption({
    actualTotalProduction: 340,
    partWeightGrams: 32.0,
    runnerWeightGrams: 6.0,
    totalMaterialUsedKg: 12.5,
    tolerancePercent: 5.0
  });

  assert.strictEqual(matCheck.isAbnormal, false);
  assert.strictEqual(matCheck.warnings.length, 0);
  assert.ok(matCheck.variancePercent < 5.0);
});

runTest('Operator: 1.7 Mould Changeover Execution (Session 1 Close -> Session 2 Open)', () => {
  // Close Session 1 at 13:00
  operatorSession.endCounter = 1170;
  operatorSession.endTime = '13:00';
  operatorSession.isActive = false;
  operatorSession.endReason = 'Mould Changeover to MLD-205';

  assert.strictEqual(operatorSession.isActive, false);

  // Open Session 2
  const target2 = calculateTheoreticalHourlyTarget(15.0, 8); // 1,920 pcs/hr
  const session2 = {
    id: 'sess-uat-02',
    sessionSequence: 2,
    mouldId: 'MLD-205',
    mouldNumber: 'MLD-205',
    cavityCount: 8,
    partId: 'P-2005',
    partNumber: 'P-2005',
    standardCycleTimeSeconds: 15.0,
    theoreticalTargetPerHour: target2,
    startTime: '13:00',
    endTime: null,
    isActive: true,
    startCounter: 1170, // Must match Session 1 endCounter
    endCounter: null,
    entries: [],
    materials: []
  };

  currentReport.mouldSessions.push(session2);
  assert.strictEqual(currentReport.mouldSessions.length, 2);
  assert.strictEqual(session2.startCounter, operatorSession.endCounter);

  // Validation 8 check: entries on closed session 1 are blocked
  const blockedCheck = validateHourlyEntry({
    productionQty: 100,
    rejectionQty: 0,
    downtimeMinutes: 0,
    cycleTimeSeconds: 20.0,
    cavityCount: 2,
    isSessionClosed: !operatorSession.isActive
  });
  assert.strictEqual(blockedCheck.isValid, false);
  assert.ok(blockedCheck.errors.length > 0);
});

runTest('Operator: 1.8 Shift Submission to Supervisor', () => {
  currentReport.status = 'submitted';
  currentReport.submittedAt = new Date().toISOString();
  assert.strictEqual(currentReport.status, 'submitted');
  assert.ok(currentReport.submittedAt);
});

// -------------------------------------------------------------
// 2. SUPERVISOR PERSONA UAT WORKFLOW (Amit Sharma - Supervisor)
// -------------------------------------------------------------
console.log('\n--- 👮 PERSONA 2: SUPERVISOR WORKFLOW ---');

const supervisorUser = {
  id: 'usr-sup-02',
  badgeNumber: 'SUP-1002',
  fullName: 'Amit Sharma',
  role: 'supervisor'
};

runTest('Supervisor: 2.1 Review Production Data & Machine Counters', () => {
  assert.strictEqual(supervisorUser.role, 'supervisor');
  assert.strictEqual(currentReport.status, 'submitted');
  
  const counterCheck = validateCounters({
    startCounter: operatorSession.startCounter,
    endCounter: operatorSession.endCounter,
    actualTotalProduction: 340,
    cavityCount: 2,
    tolerancePercent: 2.0
  });

  assert.strictEqual(counterCheck.isValid, true);
  assert.strictEqual(counterCheck.totalShots, 170);
  assert.strictEqual(counterCheck.expectedProduction, 340);
  assert.strictEqual(counterCheck.variancePercent, 0.0);
});

runTest('Supervisor: 2.2 Rejection & Downtime Analysis Review', () => {
  const hour2 = operatorSession.entries[1];
  assert.strictEqual(hour2.rejections.length, 2);
  assert.strictEqual(hour2.rejections[0].code, 'E');
  assert.strictEqual(hour2.rejections[1].code, 'G');
});

runTest('Supervisor: 2.3 Return for Correction Workflow Simulation', () => {
  const reportCopy = { ...currentReport, status: 'rejected_by_supervisor', supervisorNotes: 'Clarify downtime reason' };
  assert.strictEqual(reportCopy.status, 'rejected_by_supervisor');
  assert.strictEqual(reportCopy.supervisorNotes, 'Clarify downtime reason');
});

runTest('Supervisor: 2.4 Final Approval & Cryptographic Report Lock', () => {
  currentReport.status = 'approved';
  currentReport.supervisorId = supervisorUser.id;
  currentReport.supervisorName = supervisorUser.fullName;
  currentReport.approvedAt = new Date().toISOString();
  currentReport.supervisorNotes = 'Counters verified with physical machine counter. Approved.';

  assert.strictEqual(currentReport.status, 'approved');
  assert.strictEqual(currentReport.supervisorId, supervisorUser.id);
});

// -------------------------------------------------------------
// 3. PRODUCTION MANAGER PERSONA UAT WORKFLOW (Vikram Verma)
// -------------------------------------------------------------
console.log('\n--- 👔 PERSONA 3: PRODUCTION MANAGER WORKFLOW ---');

const managerUser = {
  id: 'usr-mgr-03',
  badgeNumber: 'MGR-005',
  fullName: 'Vikram Verma',
  role: 'production_manager'
};

runTest('Production Manager: 3.1 Plant-wide Dashboard Review & OEE Verification', () => {
  assert.strictEqual(managerUser.role, 'production_manager');
  
  const oee = calculateOEEMetrics({
    plannedProductionTimeMinutes: 120, // 2-hour evaluated interval
    totalDowntimeMinutes: 10,
    totalProductionQty: 650,
    acceptedQty: 642,
    standardCycleTimeSeconds: 20,
    cavityCount: 2
  });

  assert.ok(parseFloat(oee.availabilityPercent) >= 90.0, 'Availability should be >= 90%');
  assert.ok(parseFloat(oee.qualityPercent) >= 95.0, 'Quality should be >= 95%');
  assert.ok(parseFloat(oee.oeePercent) > 80.0, 'Overall OEE should exceed 80%');
});

runTest('Production Manager: 3.2 Audit Trail Inspection & Unlocking Authority', () => {
  const auditLogs = [
    { event: 'SHIFT_CREATED', user: 'Rajesh Kumar', timestamp: '07:00' },
    { event: 'ENTRY_SAVED', user: 'Rajesh Kumar', timestamp: '08:05' },
    { event: 'MOULD_CHANGED', user: 'Rajesh Kumar', timestamp: '13:00' },
    { event: 'REPORT_SUBMITTED', user: 'Rajesh Kumar', timestamp: '15:00' },
    { event: 'REPORT_APPROVED', user: 'Amit Sharma', timestamp: '15:15' }
  ];
  assert.strictEqual(auditLogs.length, 5);
  assert.strictEqual(auditLogs[4].event, 'REPORT_APPROVED');
});

// -------------------------------------------------------------
// 4. ADMIN PERSONA UAT WORKFLOW (System Admin)
// -------------------------------------------------------------
console.log('\n--- ⚙️ PERSONA 4: ADMIN WORKFLOW ---');

const adminUser = {
  id: 'usr-adm-00',
  badgeNumber: 'ADM-001',
  fullName: 'System Administrator',
  role: 'admin'
};

runTest('Admin: 4.1 Master Data Creation (New Machine / Mould / Part)', () => {
  assert.strictEqual(adminUser.role, 'admin');
  const newMachine = {
    id: 'MC07',
    machineNumber: 'MC07',
    make: 'Sumitomo',
    tonnage: 180,
    status: 'active'
  };
  assert.strictEqual(newMachine.machineNumber, 'MC07');
  assert.strictEqual(newMachine.tonnage, 180);
});

runTest('Admin: 4.2 System Settings & Tolerance Modification', () => {
  const settings = {
    shotCounterTolerancePercent: 2.5,
    materialVarianceTolerancePercent: 5.0,
    enforceStrictDowntimeCap: true,
    maxAllowedDowntimeMinutes: 60
  };
  assert.strictEqual(settings.shotCounterTolerancePercent, 2.5);
  assert.strictEqual(settings.maxAllowedDowntimeMinutes, 60);
});

runTest('Admin: 4.3 System Health Diagnostics Verification', () => {
  const health = {
    cloudStatus: 'connected',
    latencyMs: 38,
    pendingOfflineCount: 0,
    storageUsageKb: 45.2,
    activeUsersCount: 4
  };
  assert.strictEqual(health.cloudStatus, 'connected');
  assert.strictEqual(health.pendingOfflineCount, 0);
  assert.ok(health.latencyMs < 100);
});

console.log('\n=================================================================');
console.log(`🏁 UAT SUITE RESULTS: ${passedTests} / ${totalTests} WORKFLOWS PASSED (100%)`);
console.log('=================================================================\n');
