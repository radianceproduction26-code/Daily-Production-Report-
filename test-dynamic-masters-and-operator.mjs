// Mock localStorage for Node.js test environment
if (typeof localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

import { INITIAL_PARTS, INITIAL_MACHINES, SUPERVISORS, USERS } from './src/data/seedData.js';
import {
  initializeStorage,
  createNewShiftReport,
  executeMouldChange,
  getRejectionCodes,
  getDowntimeCodes,
  generateNextRejectionCode,
  generateNextDowntimeCode,
  addDynamicRejectionCode,
  addDynamicDowntimeCode
} from './src/services/storageService.js';
import { getAuditLogs } from './src/services/auditService.js';
import { exportShiftReportToExcel } from './src/services/exportService.js';

console.log('================================================================');
console.log('🧪 RADIANCE POLYMERS - OPERATOR CAPTURE & DYNAMIC MASTERS TEST');
console.log('================================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

// 0. Initialize Storage
initializeStorage();

// TEST 1: Operator Free Text Capture in Shift Creation
console.log('--- TEST 1: Operator Name Capture & Traceability ---');
const mc03 = INITIAL_MACHINES.find(m => m.machineNumber === 'MC03');
const part1 = INITIAL_PARTS.find(p => p.partNumber === 'F53200000A');
const part2 = INITIAL_PARTS.find(p => p.partNumber === '5036677');

const supervisorUser = {
  id: 'sup-lokesh',
  fullName: 'Mr. Lokesh',
  role: 'supervisor',
  email: 'lokesh@radiancepolymers.com'
};

const operatorUser = {
  id: 'u-op-01',
  fullName: 'Operator (Floor)',
  role: 'operator',
  email: 'operator@radiancepolymers.com'
};

const shiftReport = createNewShiftReport({
  reportDate: '2026-09-17',
  shift: 'Shift 1',
  machine: mc03,
  operator: supervisorUser, // Supervisor filling report
  operator_name: 'Ramesh Kumar', // Free text actual machine operator
  part: part1,
  startCounter: 154200
});

assert(shiftReport.operator_name === 'Ramesh Kumar', 'Shift report stores operator_name = "Ramesh Kumar"');
assert(shiftReport.operatorName === 'Ramesh Kumar', 'Shift report stores operatorName = "Ramesh Kumar"');
assert(shiftReport.mouldSessions[0].operator_name === 'Ramesh Kumar', 'Production session 1 captures operator_name = "Ramesh Kumar"');

// TEST 2: Session Change (Part / Tool Change) Operator Propagation
console.log('\n--- TEST 2: Part / Tool Change Operator Propagation ---');
const { updatedReport, newSession } = executeMouldChange({
  reportId: shiftReport.id,
  currentSessionId: shiftReport.mouldSessions[0].id,
  endCounter: 155000,
  endReason: 'Batch completed',
  newPart: part2,
  operator_name: 'Suresh Patil' // New operator on next session
});

assert(updatedReport.mouldSessions.length === 2, 'Session 2 created');
assert(newSession.operator_name === 'Suresh Patil', 'Session 2 captures updated operator_name = "Suresh Patil"');
assert(newSession.operatorName === 'Suresh Patil', 'Session 2 captures operatorName = "Suresh Patil"');

// TEST 3: Dynamic Rejection Code Generation Algorithm
console.log('\n--- TEST 3: Dynamic Rejection Code Generation Algorithm ---');
const currentRejections = getRejectionCodes();
const nextRej1 = generateNextRejectionCode(currentRejections);
assert(nextRej1 === 'R', `Next code after Q is R (calculated: ${nextRej1})`);

const nextRej2 = generateNextRejectionCode([...currentRejections, { code: 'R', description: 'Warping' }]);
assert(nextRej2 === 'S', `Next code after R is S (calculated: ${nextRej2})`);

// Test A-Z boundary rollover to R01, R02
const fullAlphabetCodes = [];
for (let i = 65; i <= 90; i++) {
  fullAlphabetCodes.push({ code: String.fromCharCode(i), description: 'Defect ' + String.fromCharCode(i) });
}
const rolloverCode1 = generateNextRejectionCode(fullAlphabetCodes);
assert(rolloverCode1 === 'R01', `Rollover code after Z is R01 (calculated: ${rolloverCode1})`);
const rolloverCode2 = generateNextRejectionCode([...fullAlphabetCodes, { code: 'R01', description: 'Defect R01' }]);
assert(rolloverCode2 === 'R02', `Rollover code after R01 is R02 (calculated: ${rolloverCode2})`);

// TEST 4: Add Dynamic Rejection Reason as Supervisor & Role Gating
console.log('\n--- TEST 4: Dynamic Rejection Creation & Role Authorization ---');
// Supervisor creating "Warping"
const createdRejection1 = addDynamicRejectionCode({
  description: 'Warping',
  user: supervisorUser
});
assert(createdRejection1.code === 'R', `Supervisor created rejection code R (got: ${createdRejection1.code})`);
assert(createdRejection1.description === 'Warping', 'Rejection description stored correctly');
assert(createdRejection1.isDynamic === true, 'Flagged as dynamically added code');

// Verify immediate availability in master
const updatedMasterRejections = getRejectionCodes();
const foundR = updatedMasterRejections.find(c => c.code === 'R');
assert(foundR && foundR.description === 'Warping', 'Code R immediately persisted in Rejection Master');

// Supervisor creating "Short Gate"
const createdRejection2 = addDynamicRejectionCode({
  description: 'Short Gate',
  user: supervisorUser
});
assert(createdRejection2.code === 'S', `Next code automatically assigned as S (got: ${createdRejection2.code})`);

// Operator attempt to create rejection code must be blocked
let operatorBlockedRej = false;
try {
  addDynamicRejectionCode({
    description: 'Illegal Defect',
    user: operatorUser
  });
} catch (err) {
  operatorBlockedRej = true;
}
assert(operatorBlockedRej, 'Operator correctly blocked from creating new rejection reasons');

// TEST 5: Dynamic Downtime Code Generation Algorithm
console.log('\n--- TEST 5: Dynamic Downtime Code Generation Algorithm ---');
const currentDowntimes = getDowntimeCodes();
const nextDt1 = generateNextDowntimeCode(currentDowntimes);
assert(nextDt1 === 'DT-603', `Next downtime code after DT-602 is DT-603 (calculated: ${nextDt1})`);

const nextDt2 = generateNextDowntimeCode([...currentDowntimes, { code: 'DT-603', description: 'Hydraulic Oil Leakage' }]);
assert(nextDt2 === 'DT-604', `Next downtime code after DT-603 is DT-604 (calculated: ${nextDt2})`);

// TEST 6: Add Dynamic Downtime Reason as Supervisor & Role Gating
console.log('\n--- TEST 6: Dynamic Downtime Creation & Role Authorization ---');
const createdDt1 = addDynamicDowntimeCode({
  description: 'Hydraulic Oil Leakage',
  category: 'Machine Related',
  user: supervisorUser
});
assert(createdDt1.code === 'DT-603', `Supervisor created downtime code DT-603 (got: ${createdDt1.code})`);
assert(createdDt1.category === 'Machine Related', 'Downtime category recorded');
assert(createdDt1.description === 'Hydraulic Oil Leakage', 'Downtime description recorded');

// Verify immediate availability in master
const updatedMasterDowntimes = getDowntimeCodes();
const foundDt603 = updatedMasterDowntimes.find(d => d.code === 'DT-603');
assert(foundDt603 && foundDt603.description === 'Hydraulic Oil Leakage', 'Code DT-603 immediately persisted in Downtime Master');

// Supervisor creating "Water Flow Sensor Failure"
const createdDt2 = addDynamicDowntimeCode({
  description: 'Water Flow Sensor Failure',
  category: 'Utility Related',
  user: supervisorUser
});
assert(createdDt2.code === 'DT-604', `Next code automatically assigned as DT-604 (got: ${createdDt2.code})`);

// Operator attempt to create downtime code must be blocked
let operatorBlockedDt = false;
try {
  addDynamicDowntimeCode({
    description: 'Illegal Downtime',
    category: 'Other',
    user: operatorUser
  });
} catch (err) {
  operatorBlockedDt = true;
}
assert(operatorBlockedDt, 'Operator correctly blocked from creating new downtime reasons');

// TEST 7: Immutable Audit Trail Logging
console.log('\n--- TEST 7: Audit Trail Verification for Dynamic Masters ---');
const logs = getAuditLogs();
const rejAudit = logs.find(l => l.action === 'CREATE_REJECTION_CODE' && l.recordId === 'R');
assert(rejAudit !== undefined, 'Audit trail logged CREATE_REJECTION_CODE for R');
assert(rejAudit?.user?.name === 'Mr. Lokesh', 'Audit log records User Name: Mr. Lokesh');
assert(rejAudit?.user?.role === 'supervisor', 'Audit log records Role: supervisor');
assert(rejAudit?.reason.includes('Warping'), 'Audit log records Description: Warping');
assert(rejAudit?.timestamp !== undefined, 'Audit log records ISO Timestamp');

const dtAudit = logs.find(l => l.action === 'CREATE_DOWNTIME_CODE' && l.recordId === 'DT-603');
assert(dtAudit !== undefined, 'Audit trail logged CREATE_DOWNTIME_CODE for DT-603');
assert(dtAudit?.user?.name === 'Mr. Lokesh', 'Audit log records User Name: Mr. Lokesh');
assert(dtAudit?.user?.role === 'supervisor', 'Audit log records Role: supervisor');
assert(dtAudit?.reason.includes('Hydraulic Oil Leakage'), 'Audit log records Description: Hydraulic Oil Leakage');

console.log('\n================================================================');
console.log(`RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All Operator Capture & Dynamic Master tests passed successfully!');
}
