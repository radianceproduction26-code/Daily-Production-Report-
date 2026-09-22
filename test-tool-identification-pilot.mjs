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

import { INITIAL_PARTS, INITIAL_MACHINE_PART_MAPPINGS, INITIAL_MACHINES, SUPERVISORS } from './src/data/seedData.js';
import { createNewShiftReport, executeMouldChange, createDemoShiftReport } from './src/services/storageService.js';
import { calculateTheoreticalHourlyTarget, validateCounters, validateHourlyEntry } from './src/services/validationEngine.js';

console.log('================================================================');
console.log('🧪 RADIANCE POLYMERS - MC03 PRODUCTION TOOL IDENTIFICATION TEST');
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

// TEST 1: Verify Part Master contains operational attributes (Cycle Time, Cavity Count)
console.log('--- TEST 1: Part Master as Operational Master ---');
const part1 = INITIAL_PARTS.find(p => p.partNumber === 'F53200000A');
const part2 = INITIAL_PARTS.find(p => p.partNumber === '5036677');
const part3 = INITIAL_PARTS.find(p => p.partNumber === '5012394');

assert(part1 && part1.standardCycleTimeSeconds === 20.0 && part1.cavityCount === 2, 'Part F53200000A has cycle 20s and 2 cavities');
assert(part2 && part2.standardCycleTimeSeconds === 15.0 && part2.cavityCount === 4, 'Part 5036677 has cycle 15s and 4 cavities');
assert(part3 && part3.standardCycleTimeSeconds === 25.0 && part3.cavityCount === 2, 'Part 5012394 has cycle 25s and 2 cavities');

// TEST 2: Calculate Theoretical Hourly Targets
console.log('\n--- TEST 2: Theoretical Hourly Target Rates ---');
const target1 = calculateTheoreticalHourlyTarget(part1.standardCycleTimeSeconds, part1.cavityCount);
const target2 = calculateTheoreticalHourlyTarget(part2.standardCycleTimeSeconds, part2.cavityCount);
const target3 = calculateTheoreticalHourlyTarget(part3.standardCycleTimeSeconds, part3.cavityCount);

assert(target1 === 360, `Target for F53200000A is 360 pcs/hr (calculated: ${target1})`);
assert(target2 === 960, `Target for 5036677 is 960 pcs/hr (calculated: ${target2})`);
assert(target3 === 288, `Target for 5012394 is 288 pcs/hr (calculated: ${target3})`);

// TEST 3: MC03 Direct Mapping
console.log('\n--- TEST 3: MC03 Machine to Part/Tool Direct Mapping ---');
const mc03Mappings = INITIAL_MACHINE_PART_MAPPINGS.filter(m => m.machineCode === 'MC03');
assert(mc03Mappings.length === 3, 'MC03 mapped to exactly 3 parts');
const mappedParts = mc03Mappings.map(m => m.partCode);
assert(mappedParts.includes('F53200000A') && mappedParts.includes('5036677') && mappedParts.includes('5012394'), 'MC03 mapped directly to F53200000A, 5036677, 5012394 without separate mould numbers');

// TEST 4: Supervisor Master for Pilot Signoff
console.log('\n--- TEST 4: Supervisor Master Configuration ---');
const supervisorNames = SUPERVISORS.map(s => s.fullName || s.name);
assert(supervisorNames.includes('Mr. Lokesh'), 'Supervisor Mr. Lokesh is available in master');
assert(supervisorNames.includes('Mr. Akshay'), 'Supervisor Mr. Akshay is available in master');

// TEST 5: Create Shift Report with Part as Operational Master
console.log('\n--- TEST 5: Create Shift Report (Direct Part/Tool Init) ---');
const mc03Machine = INITIAL_MACHINES.find(m => m.machineNumber === 'MC03');
const shiftReport = createNewShiftReport({
  reportDate: '2026-09-17',
  shift: 'Shift 1',
  machine: mc03Machine,
  operator: { id: 'u-op-01', fullName: 'Ramesh Kumar' },
  part: part1,
  startCounter: 10000
});

assert(shiftReport.machineNumber === 'MC03', 'Shift report is for machine MC03');
assert(shiftReport.mouldSessions && shiftReport.mouldSessions.length === 1, 'Initial session 1 created');
const firstSession = shiftReport.mouldSessions[0];
assert(firstSession.partNumber === 'F53200000A', 'Session 1 partNumber is F53200000A');
assert(firstSession.mouldNumber === 'F53200000A', 'Session 1 mouldNumber matches Part Number (Tool Identifier)');
assert(firstSession.standardCycleTimeSeconds === 20.0, 'Session 1 inherited standardCycleTimeSeconds from Part Master');
assert(firstSession.cavityCount === 2, 'Session 1 inherited cavityCount from Part Master');
assert(firstSession.theoreticalHourlyTarget === 360, 'Session 1 calculated theoreticalHourlyTarget = 360 pcs/hr');
assert(firstSession.status === 'active', 'Session 1 is active');

// TEST 6: Execute Part Change / Tool Change Workflow
console.log('\n--- TEST 6: Execute Part Change / Tool Change Workflow ---');
const { updatedReport } = executeMouldChange({
  reportId: shiftReport.id,
  currentSessionId: firstSession.id,
  endCounter: 11800,
  endReason: 'Tool Change from F53200000A to 5036677',
  newPart: part2
});

assert(updatedReport.mouldSessions.length === 2, 'Session 2 created after Part/Tool change');
const s1 = updatedReport.mouldSessions[0];
const s2 = updatedReport.mouldSessions[1];
assert(s1.endCounter === 11800 && s1.status === 'closed', 'Session 1 properly closed and locked at end counter 11800');
assert(s2.sessionSequence === 2 && s2.status === 'active', 'Session 2 active');
assert(s2.partNumber === '5036677' && s2.mouldNumber === '5036677', 'Session 2 tool identifier set to new Part Number 5036677');
assert(s2.standardCycleTimeSeconds === 15.0 && s2.cavityCount === 4, 'Session 2 inherited cycle time (15s) and cavities (4)');
assert(s2.theoreticalHourlyTarget === 960, 'Session 2 theoretical target is 960 pcs/hr');
assert(s2.startCounter === 11800, 'Session 2 startCounter automatically equals Session 1 endCounter (11800)');

// TEST 7: Demo Shift Report Target and Reconciliation
console.log('\n--- TEST 7: Demo Shift Report Tool Reconciliation ---');
const demoReport = createDemoShiftReport();
assert(demoReport.machineNumber === 'MC03', 'Demo report machine is MC03');
assert(demoReport.mouldSessions.length === 2, 'Demo report contains 2 sessions for MC03 trial');
assert(demoReport.mouldSessions[0].partNumber === 'F53200000A', 'Demo Session 1 tool is F53200000A');
assert(demoReport.mouldSessions[0].mouldNumber === 'F53200000A', 'Demo Session 1 mouldNumber is F53200000A');
assert(demoReport.mouldSessions[0].theoreticalHourlyTarget === 360, 'Demo Session 1 target is 360 pcs/hr');
assert(demoReport.mouldSessions[1].partNumber === '5036677', 'Demo Session 2 tool is 5036677');
assert(demoReport.mouldSessions[1].mouldNumber === '5036677', 'Demo Session 2 mouldNumber is 5036677');
assert(demoReport.mouldSessions[1].theoreticalHourlyTarget === 960, 'Demo Session 2 target is 960 pcs/hr');

console.log('\n================================================================');
console.log(`RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All Production Tool Identification tests passed successfully!');
}
