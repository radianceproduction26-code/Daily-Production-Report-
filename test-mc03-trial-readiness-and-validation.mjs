// Radiance Polymers - Version 1 Freeze & MC03 Live Trial Validation Test
import {
  validateMachineMaster,
  validatePartMaster,
  validateUserMaster,
  calculateTrialReadinessScore,
  getTrialFeedback,
  saveTrialFeedback,
  getTrialIssues,
  addTrialIssue,
  updateTrialIssueStatus,
  generateNextRejectionCode,
  generateNextDowntimeCode
} from './src/services/storageService.js';
import {
  INITIAL_MACHINES,
  INITIAL_PARTS,
  SUPERVISORS,
  INITIAL_REJECTION_CODES,
  INITIAL_DOWNTIME_CODES
} from './src/data/seedData.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

console.log('=== TEST SUITE: VERSION 1 FREEZE & MC03 PILOT READINESS ===\n');

// Mock localStorage for Node environment if needed
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// 1. Master Data Import Validation - Machine Master
console.log('1. Testing Machine Master Import Validation:');
const validMachinesResult = validateMachineMaster(INITIAL_MACHINES);
assert(validMachinesResult.isValid === true, 'Standard INITIAL_MACHINES (MC01..MC14) passes validation');
assert(validMachinesResult.errors.length === 0, 'No errors in standardized fleet MC01..MC14');

const invalidMachinesTest = [
  { machineNumber: 'MC01', makeModel: 'Engel 150T', capacityTon: 150 },
  { machineNumber: 'MC01', makeModel: 'Duplicate Engel', capacityTon: 150 }, // Duplicate
  { machineNumber: 'IMM05', makeModel: 'Invalid Format', capacityTon: 250 }, // Invalid format
  { machineNumber: 'MC03', makeModel: '', capacityTon: 250 }, // Missing make
  { machineNumber: 'MC04', makeModel: 'Milacron', capacityTon: 0 } // Invalid tonnage
];
const invalidMachinesResult = validateMachineMaster(invalidMachinesTest);
assert(invalidMachinesResult.isValid === false, 'Invalid machines detected correctly');
assert(invalidMachinesResult.errors.some(e => e.includes('Duplicate Machine Code')), 'Detects duplicate machine code');
assert(invalidMachinesResult.errors.some(e => e.includes('Invalid Machine Format')), 'Detects non-MCxx machine code format');
assert(invalidMachinesResult.errors.some(e => e.includes('Missing Machine Make')), 'Detects missing machine make/model');
assert(invalidMachinesResult.errors.some(e => e.includes('Missing or invalid Tonnage')), 'Detects zero or missing tonnage');

// 2. Master Data Import Validation - Part Master
console.log('\n2. Testing Part Master Import Validation:');
const validPartsResult = validatePartMaster(INITIAL_PARTS);
assert(validPartsResult.isValid === true, 'Standard INITIAL_PARTS passes validation');
assert(validPartsResult.errors.length === 0, 'No errors in active part masters');

const invalidPartsTest = [
  { partNumber: 'P1', partName: 'Part 1', rawMaterialGrade: 'PP', partWeightGrams: 50, runnerWeightGrams: 5, standardCycleTimeSeconds: 20, cavityCount: 2 },
  { partNumber: 'P1', partName: 'Part Dup', rawMaterialGrade: 'PP', partWeightGrams: 50, runnerWeightGrams: 5, standardCycleTimeSeconds: 20, cavityCount: 2 }, // Duplicate
  { partNumber: 'P2', partName: '', rawMaterialGrade: 'PP', partWeightGrams: 50, runnerWeightGrams: 5, standardCycleTimeSeconds: 20, cavityCount: 2 }, // Missing Name
  { partNumber: 'P3', partName: 'Part 3', rawMaterialGrade: '', partWeightGrams: 50, runnerWeightGrams: 5, standardCycleTimeSeconds: 20, cavityCount: 2 }, // Missing Material
  { partNumber: 'P4', partName: 'Part 4', rawMaterialGrade: 'PP', partWeightGrams: 0, runnerWeightGrams: 5, standardCycleTimeSeconds: 20, cavityCount: 2 }, // Missing Weight
  { partNumber: 'P5', partName: 'Part 5', rawMaterialGrade: 'PP', partWeightGrams: 50, runnerWeightGrams: 5, standardCycleTimeSeconds: 0, cavityCount: 2 }, // Missing Cycle Time
  { partNumber: 'P6', partName: 'Part 6', rawMaterialGrade: 'PP', partWeightGrams: 50, runnerWeightGrams: 5, standardCycleTimeSeconds: 20, cavityCount: 0 } // Missing Cavity
];
const invalidPartsResult = validatePartMaster(invalidPartsTest);
assert(invalidPartsResult.isValid === false, 'Detects invalid parts correctly');
assert(invalidPartsResult.errors.some(e => e.includes('Duplicate Part Number')), 'Detects duplicate part numbers');
assert(invalidPartsResult.errors.some(e => e.includes('Missing Part Name')), 'Detects missing part name');
assert(invalidPartsResult.errors.some(e => e.includes('Missing Raw Material Grade')), 'Detects missing material grade');
assert(invalidPartsResult.errors.some(e => e.includes('Missing or invalid Part Weight')), 'Detects invalid part weight');
assert(invalidPartsResult.errors.some(e => e.includes('Missing or invalid Cycle Time')), 'Detects invalid cycle time');
assert(invalidPartsResult.errors.some(e => e.includes('Missing or invalid Cavity Count')), 'Detects invalid cavity count');

// 3. User Master Validation (Supervisors Mr. Lokesh and Mr. Akshay)
console.log('\n3. Testing User Master Validation:');
const validUsersResult = validateUserMaster([], SUPERVISORS);
assert(validUsersResult.isValid === true, 'SUPERVISORS list containing Mr. Lokesh and Mr. Akshay is valid');
assert(validUsersResult.hasPilotSupervisors === true, 'Pilot supervisors flag is true');

const missingSupervisorTest = [{ fullName: 'Mr. Random Supervisor', role: 'supervisor' }];
const missingSupervisorResult = validateUserMaster([], missingSupervisorTest);
assert(missingSupervisorResult.isValid === false, 'Flags missing pilot supervisors');
assert(missingSupervisorResult.errors.some(e => e.includes('Mr. Lokesh')), 'Specifically requires Mr. Lokesh');
assert(missingSupervisorResult.errors.some(e => e.includes('Mr. Akshay')), 'Specifically requires Mr. Akshay');

// 4. Trial Readiness Score
console.log('\n4. Testing Trial Readiness Score:');
localStorage.setItem('rp_master_machines_v1', JSON.stringify(INITIAL_MACHINES));
localStorage.setItem('rp_master_parts_v1', JSON.stringify(INITIAL_PARTS));
localStorage.setItem('rp_supervisors_v1', JSON.stringify(SUPERVISORS));
localStorage.setItem('rp_system_settings_v1', JSON.stringify({ autoEmailRecipients: ['plant@radiance.com'] }));

const readiness = calculateTrialReadinessScore();
assert(readiness.score >= 95, `Readiness score is ${readiness.score}% (Expected >= 95%)`);
assert(readiness.status === 'READY', `Readiness status is ${readiness.status} (Expected READY)`);
assert(readiness.pillars.length === 8, 'Includes all 8 operational pillars');
assert(readiness.pillars.every(p => p.passed === true), 'All 8 pillars passed with default seed data');

// 5. Trial Feedback Capture & Permanent Persistence
console.log('\n5. Testing Trial Shift Feedback Capture:');
const sampleFeedback = {
  operatorName: 'Ramesh',
  supervisorName: 'Mr. Lokesh',
  date: '2026-09-17',
  shift: 'Shift A',
  category: 'Validation',
  comments: 'Validation 3 successfully prevented operator from entering excessive output during downtime.',
  suggestedImprovements: 'Provide audible beep alert on tablet when validation error fires.'
};
const savedFeedback = saveTrialFeedback(sampleFeedback);
assert(savedFeedback.id.startsWith('fb-'), 'Generates permanent unique feedback ID');
const feedbackList = getTrialFeedback();
assert(feedbackList.length > 0, 'Feedback list retrieved from storage');
assert(feedbackList[0].operatorName === 'Ramesh', 'Operator name stored correctly');
assert(feedbackList[0].supervisorName === 'Mr. Lokesh', 'Supervisor name stored correctly');
assert(feedbackList[0].category === 'Validation', 'Category stored correctly');

// 6. Trial Issue Register Management
console.log('\n6. Testing Trial Issue Register:');
const initialIssues = getTrialIssues();
assert(initialIssues.length >= 2, 'Default trial issues pre-loaded for pilot traceability');

const newIssue = addTrialIssue({
  date: '2026-09-17',
  machine: 'MC03',
  issueDescription: 'Oil mark defect observed during start-up cycle on MC03',
  priority: 'High',
  assignedTo: 'Mr. Lokesh'
});
assert(newIssue.id.toLowerCase().startsWith('iss-'), 'New issue generated with unique ID');
assert(newIssue.status === 'Open', 'New issue defaults to Open status');

const updatedIssue = updateTrialIssueStatus(newIssue.id, 'In Progress');
assert(updatedIssue.status === 'In Progress', 'Issue status transitions to In Progress');

const closedIssue = updateTrialIssueStatus(newIssue.id, 'Closed');
assert(closedIssue.status === 'Closed', 'Issue status transitions to Closed');

// 7. Dynamic Masters & Sequence Consistency
console.log('\n7. Testing Dynamic Masters Consistency:');
const nextRej = generateNextRejectionCode(INITIAL_REJECTION_CODES);
assert(nextRej === 'R', `Next rejection code is ${nextRej} (Expected R after A..Q)`);

const nextDt = generateNextDowntimeCode(INITIAL_DOWNTIME_CODES);
assert(nextDt === 'DT-603', `Next downtime code is ${nextDt} (Expected DT-603 after DT-602)`);

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL MC03 LIVE TRIAL & VALIDATION ENGINE TESTS PASSED PERFECTLY!');
}
