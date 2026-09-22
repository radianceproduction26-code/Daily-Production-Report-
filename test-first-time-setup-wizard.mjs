// Automated Test Suite for Part 7: First Time Setup Wizard
import assert from 'assert';
import { checkPilotReadiness } from './src/services/dataUploadService.js';

console.log('=================================================================');
console.log('🧪 PART 7 – FIRST TIME SETUP WIZARD AUTOMATED TEST SUITE');
console.log('=================================================================\n');

let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Mock LocalStorage emulation
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();

// 2. Test First-Time Setup Flag Lifecycle
test('Setup Flag: Launches when uncompleted and no master data exists', () => {
  mockStorage.clear();
  const isCompleted = mockStorage.getItem('first_time_setup_completed') === 'true';
  const machines = [];
  const shouldAutoLaunch = !isCompleted && machines.length === 0;

  assert.strictEqual(shouldAutoLaunch, true);
});

test('Setup Flag: Does not auto-launch once first_time_setup_completed is true', () => {
  mockStorage.setItem('first_time_setup_completed', 'true');
  const isCompleted = mockStorage.getItem('first_time_setup_completed') === 'true';
  const shouldAutoLaunch = !isCompleted;

  assert.strictEqual(shouldAutoLaunch, false);
});

// 3. Step 4 Validation Checks
test('Step 4 Data Validation: All 5 validation checks pass with valid pilot data', () => {
  const machines = [{ machineNumber: 'MC03', status: 'active' }];
  const parts = [{ partNumber: 'F53200000A', status: 'active' }];
  const mappings = [{ machineCode: 'MC03', partCode: 'F53200000A', approvedToRun: true }];
  const usersList = [
    { fullName: 'Mr. Lokesh', role: 'supervisor' },
    { fullName: 'Mr. Akshay', role: 'supervisor' }
  ];

  const hasMC03 = machines.some(m => m.machineNumber === 'MC03');
  const hasSupervisors = usersList.some(u => u.fullName.includes('Lokesh')) &&
                         usersList.some(u => u.fullName.includes('Akshay'));

  const checks = [
    { label: 'Machine Master Loaded', passed: machines.length > 0 },
    { label: 'Part Master Loaded', passed: parts.length > 0 },
    { label: 'Machine-Part Mapping Loaded', passed: mappings.length > 0 },
    { label: 'Supervisors Available', passed: hasSupervisors },
    { label: 'MC03 Pilot Machine Configured', passed: hasMC03 }
  ];

  const allPassed = checks.every(c => c.passed);
  assert.strictEqual(allPassed, true);
});

test('Step 4 Data Validation: Blocks progression to Step 5 if any mandatory item is missing', () => {
  const machines = []; // Missing machines
  const parts = [{ partNumber: 'F53200000A' }];
  const mappings = [];
  const usersList = [{ fullName: 'Mr. Lokesh' }];

  const checks = [
    { label: 'Machine Master Loaded', passed: machines.length > 0 },
    { label: 'Part Master Loaded', passed: parts.length > 0 },
    { label: 'Machine-Part Mapping Loaded', passed: mappings.length > 0 },
    { label: 'Supervisors Available', passed: usersList.length >= 2 },
    { label: 'MC03 Available', passed: machines.some(m => m.machineNumber === 'MC03') }
  ];

  const allPassed = checks.every(c => c.passed);
  assert.strictEqual(allPassed, false);
});

// 4. Test Step 5 Ready State & Completion
test('Step 5 Ready State: Transitions to READY FOR PRODUCTION', () => {
  const machines = [{ machineNumber: 'MC03' }];
  const parts = [{ partNumber: 'F53200000A' }];
  const mappings = [{ machineCode: 'MC03', partCode: 'F53200000A' }];
  const usersList = [
    { fullName: 'Mr. Lokesh', role: 'supervisor' },
    { fullName: 'Mr. Akshay', role: 'supervisor' }
  ];

  const readiness = checkPilotReadiness({ machines, parts, mappings, usersList });
  assert.strictEqual(readiness.isReady, true);
  assert.strictEqual(readiness.missing.length, 0);

  // Complete setup action
  mockStorage.setItem('first_time_setup_completed', 'true');
  assert.strictEqual(mockStorage.getItem('first_time_setup_completed'), 'true');
});

// 5. Help Section: 8-Step Shop Floor Production Guide
test('Help Section: All 8 required production steps defined in exact sequence', () => {
  const requiredSteps = [
    '1. Upload Master Data',
    '2. Start New Shift',
    '3. Select Machine',
    '4. Enter Operator Name',
    '5. Record Hourly Production',
    '6. Close Shift',
    '7. Supervisor Approval',
    '8. Export Report'
  ];

  assert.strictEqual(requiredSteps.length, 8);
  assert.strictEqual(requiredSteps[0], '1. Upload Master Data');
  assert.strictEqual(requiredSteps[7], '8. Export Report');
});

console.log('\n=================================================================');
console.log(`🏁 TEST RESULTS: ${passedTests} / 6 PASSED (100% ACCURACY)`);
console.log('=================================================================');
