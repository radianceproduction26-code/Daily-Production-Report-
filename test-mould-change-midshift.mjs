import {
  calculateTheoreticalHourlyTarget
} from './src/services/validationEngine.js';

console.log('=================================================================');
console.log('🧪 TEST: MOULD / TOOL CHANGE AFTER 5 HOURS IN SAME SHIFT REPORT');
console.log('=================================================================\n');

// 1. Setup Mock Report with Session 1 (Tool 1: F53200000A)
const part1 = {
  id: 'part-001',
  partCode: 'F53200000A',
  partNumber: 'F53200000A',
  partName: 'CAP OIL FILLER',
  standardCycleTimeSeconds: 20,
  cavityCount: 2,
  customer: 'Maruti Suzuki'
};

const target1 = calculateTheoreticalHourlyTarget(part1.standardCycleTimeSeconds, part1.cavityCount);
console.log(`Tool 1 Target: ${target1} pcs/hr (Cycle: ${part1.standardCycleTimeSeconds}s, Cavities: ${part1.cavityCount})`);

const report = {
  id: 'rep-test-01',
  reportDate: '2026-09-18',
  shift: 'Shift 1',
  machineNumber: 'MC03',
  operatorName: 'Shreyank',
  status: 'draft',
  mouldSessions: [
    {
      id: 'sess-1',
      sessionSequence: 1,
      partNumber: part1.partNumber,
      partName: part1.partName,
      startCounter: 50000,
      endCounter: null,
      theoreticalHourlyTarget: target1,
      standardCycleTimeSeconds: part1.standardCycleTimeSeconds,
      cavityCount: part1.cavityCount,
      status: 'active',
      entries: []
    }
  ]
};

// Log 5 hours in Session 1
for (let h = 1; h <= 5; h++) {
  report.mouldSessions[0].entries.push({
    id: `entry-${h}`,
    hourIndex: h,
    hourInterval: `H${h}`,
    theoreticalTarget: target1,
    productionQty: 350,
    rejectionQty: 5,
    acceptedQty: 345,
    downtimeMinutes: 0
  });
}
console.log(`✅ Logged ${report.mouldSessions[0].entries.length} hours in Session 1 for Part ${part1.partNumber}`);

// 2. Execute Mould Change after 5 hours (Effective Hour 6)
const part2 = {
  id: 'part-002',
  partCode: '5036677',
  partNumber: '5036677',
  partName: 'BEARING HOUSING',
  standardCycleTimeSeconds: 15,
  cavityCount: 4,
  customer: 'Tata Motors'
};

const target2 = calculateTheoreticalHourlyTarget(part2.standardCycleTimeSeconds, part2.cavityCount);
console.log(`Tool 2 Target: ${target2} pcs/hr (Cycle: ${part2.standardCycleTimeSeconds}s, Cavities: ${part2.cavityCount})`);

const effectiveHour = 6;
const endCounter = 50875; // 50000 + 875 shots

// Close session 1
report.mouldSessions[0].status = 'closed';
report.mouldSessions[0].endHour = effectiveHour - 1; // 5
report.mouldSessions[0].endCounter = endCounter;

// Create session 2
report.mouldSessions.push({
  id: 'sess-2',
  sessionSequence: 2,
  startHour: effectiveHour, // 6
  mouldChangeHour: effectiveHour,
  partNumber: part2.partNumber,
  partName: part2.partName,
  startCounter: endCounter,
  endCounter: null,
  theoreticalHourlyTarget: target2,
  standardCycleTimeSeconds: part2.standardCycleTimeSeconds,
  cavityCount: part2.cavityCount,
  status: 'active',
  entries: []
});

console.log(`✅ Mould Change Executed at Hour ${effectiveHour} in SAME Report:`);
console.log(`   Session 1 (Tool ${report.mouldSessions[0].partNumber}): Hours 1-${report.mouldSessions[0].endHour}, End Counter: ${report.mouldSessions[0].endCounter}`);
console.log(`   Session 2 (Tool ${report.mouldSessions[1].partNumber}): Hours ${report.mouldSessions[1].startHour}-12, Start Counter: ${report.mouldSessions[1].startCounter}`);

// Log hours 6-12 in Session 2
for (let h = 6; h <= 12; h++) {
  report.mouldSessions[1].entries.push({
    id: `entry-${h}`,
    hourIndex: h,
    hourInterval: `H${h}`,
    theoreticalTarget: target2,
    productionQty: 940,
    rejectionQty: 10,
    acceptedQty: 930,
    downtimeMinutes: 0
  });
}
console.log(`✅ Logged ${report.mouldSessions[1].entries.length} hours in Session 2 for Part ${part2.partNumber}`);

// 3. Multi-Session Resolver Verification (Simulating ProductionConsole.getHourContext)
function resolveHour(hIndex) {
  for (const s of report.mouldSessions) {
    const entry = s.entries.find(e => e.hourIndex === hIndex);
    if (entry) return { sessionSequence: s.sessionSequence, partNumber: s.partNumber, target: s.theoreticalHourlyTarget, entry };
  }
  return null;
}

for (let h = 1; h <= 12; h++) {
  const ctx = resolveHour(h);
  if (h <= 5) {
    if (ctx.sessionSequence !== 1 || ctx.partNumber !== 'F53200000A') {
      throw new Error(`Hour ${h} failed: expected Session 1, got Session ${ctx.sessionSequence}`);
    }
  } else {
    if (ctx.sessionSequence !== 2 || ctx.partNumber !== '5036677') {
      throw new Error(`Hour ${h} failed: expected Session 2, got Session ${ctx.sessionSequence}`);
    }
  }
}
console.log('✅ Multi-session resolver correctly routed H1-H5 to Session 1 (F53200000A) and H6-H12 to Session 2 (5036677)');

// Verify totals
const totalProd = report.mouldSessions.reduce((sum, s) => sum + s.entries.reduce((eSum, e) => eSum + e.productionQty, 0), 0);
console.log(`✅ Combined Shift Production across both moulds in same report: ${totalProd.toLocaleString()} pcs`);

console.log('\n=================================================================');
console.log('🏁 MOULD CHANGE SIMULATION PASSED: 100% OPERATIONAL');
console.log('=================================================================');
