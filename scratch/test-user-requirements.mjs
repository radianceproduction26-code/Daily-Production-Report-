import assert from 'assert';

// Setup mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

import { INITIAL_REJECTION_CODES, INITIAL_DOWNTIME_CODES, SHIFT_A_HOURS_DEFINITIONS, SHIFT_B_HOURS_DEFINITIONS, getShiftHours } from '../src/data/seedData.js';
import { calculateTheoreticalHourlyTarget } from '../src/services/validationEngine.js';
import { createNewShiftReport, getDailyShiftExecutionTracker, clearAllRejectionCodes, clearAllDowntimeCodes, getRejectionCodes, getDowntimeCodes } from '../src/services/storageService.js';

console.log('🧪 Starting 4 User Requirements Verification...');

// 1. Requirement 1: Rejection and downtime reasons removed/empty for fresh upload
assert.strictEqual(INITIAL_REJECTION_CODES.length, 0, 'INITIAL_REJECTION_CODES is empty');
assert.strictEqual(INITIAL_DOWNTIME_CODES.length, 0, 'INITIAL_DOWNTIME_CODES is empty');

clearAllRejectionCodes();
clearAllDowntimeCodes();
assert.strictEqual(getRejectionCodes().length, 0, 'Rejection codes in storage are cleared');
assert.strictEqual(getDowntimeCodes().length, 0, 'Downtime codes in storage are cleared');
console.log('  ✓ 1. Rejection & downtime reasons removed, empty for fresh upload');

// 2. Requirement 2: Dual cycle time (Standard locked, Actual editable)
const testPart = {
  id: 'part-01',
  partNumber: 'F53200000A',
  partName: 'Front Bezel Enclosure',
  standardCycleTimeSeconds: 20,
  actualCycleTimeSeconds: 22.5,
  cavityCount: 2
};

// Target with standard (20s): (3600 / 20) * 2 = 360 pcs/hr
const stdTarget = calculateTheoreticalHourlyTarget(testPart.standardCycleTimeSeconds, testPart.cavityCount);
assert.strictEqual(stdTarget, 360, 'Standard target is 360 pcs/hr');

// Target with actual (22.5s): (3600 / 22.5) * 2 = 320 pcs/hr
const actualTarget = calculateTheoreticalHourlyTarget(testPart.actualCycleTimeSeconds, testPart.cavityCount);
assert.strictEqual(actualTarget, 320, 'Actual target is 320 pcs/hr');

// Shift creation preserves both
const report = createNewShiftReport({
  reportDate: '2026-09-22',
  shift: 'Shift A',
  machine: { id: 'mc-03', machineNumber: 'MC03' },
  operatorName: 'Shreyank',
  part: testPart,
  startCounter: 154200
});

assert.strictEqual(report.mouldSessions[0].standardCycleTimeSeconds, 20, 'Locked standard cycle time preserved as 20s');
assert.strictEqual(report.mouldSessions[0].actualCycleTimeSeconds, 22.5, 'Actual cycle time captured as 22.5s');
assert.strictEqual(report.mouldSessions[0].theoreticalHourlyTarget, 320, 'Theoretical target based on actual cycle time is 320 pcs/hr');
console.log('  ✓ 2. Dual cycle time: Standard locked (20s) and Actual editable (22.5s) verified');

// 3. Requirement 3: Strictly 2 shifts (Shift A and Shift B)
assert.strictEqual(SHIFT_A_HOURS_DEFINITIONS.length, 12, 'Shift A has 12 hours');
assert.strictEqual(SHIFT_A_HOURS_DEFINITIONS[0].label, '08:00 - 09:00', 'Shift A starts at 08:00');
assert.strictEqual(SHIFT_A_HOURS_DEFINITIONS[11].label, '19:00 - 20:00', 'Shift A ends at 20:00');

assert.strictEqual(SHIFT_B_HOURS_DEFINITIONS.length, 12, 'Shift B has 12 hours');
assert.strictEqual(SHIFT_B_HOURS_DEFINITIONS[0].label, '20:00 - 21:00', 'Shift B starts at 20:00');
assert.strictEqual(SHIFT_B_HOURS_DEFINITIONS[11].label, '07:00 - 08:00', 'Shift B ends at 08:00');

const hoursA = getShiftHours('Shift A');
const hoursB = getShiftHours('Shift B');
assert.strictEqual(hoursA[0].label, '08:00 - 09:00');
assert.strictEqual(hoursB[0].label, '20:00 - 21:00');

const tracker = getDailyShiftExecutionTracker('2026-09-22');
assert.strictEqual(tracker.totalShiftsPlanned, 2, 'Only 2 shifts planned');
assert.strictEqual(tracker.shifts.length, 2, 'Tracker has only 2 shifts');
assert.strictEqual(tracker.shifts[0].code, 'Shift A', 'First shift is Shift A');
assert.strictEqual(tracker.shifts[1].code, 'Shift B', 'Second shift is Shift B');
console.log('  ✓ 3. Strictly 2 shifts (Shift A & Shift B) verified');

// 4. Requirement 4: Shift B start time resolution in report
const reportB = createNewShiftReport({
  reportDate: '2026-09-22',
  shift: 'Shift B',
  machine: { id: 'mc-03', machineNumber: 'MC03' },
  operatorName: 'Dheera',
  part: testPart,
  startCounter: 160000
});
assert.strictEqual(reportB.shift, 'Shift B', 'Report shift is Shift B');
assert.strictEqual(reportB.mouldSessions[0].startTime, '20:00', 'Shift B startTime is 20:00');
console.log('  ✓ 4. Shift B night start time resolution verified');

console.log('\n🎉 ALL 4 USER REQUIREMENTS VERIFIED SUCCESSFULLY!');
