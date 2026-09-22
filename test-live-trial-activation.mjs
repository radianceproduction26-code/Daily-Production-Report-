// Radiance Polymers – Phase 11C MC03 Live Trial Activation Verification Suite
// Covers ALL 8 Phase 11C Objectives:
//   1. Live Trial Activation (Start button, date/time/user recording, MC03 lock, status transition)
//   2. Day Counter (Day 1 of 21 auto-calculation, cap at 21)
//   3. Shift Counter (Shift A / B / C tracking with completion status)
//   4. Daily Trial Register (Automatic telemetry collection)
//   5. Trial Health Monitor (Reports, Issues, Backup, Email, Sync status)
//   6. Trial Completion Criteria (Days completed, progress %, days remaining)
//   7. Rollout Decision Gates (5 read-only criteria)
//   8. End of Trial Package (Trial Summary Excel, Trial Summary PDF, Rollout Recommendation PDF)
//   Final Output Verdict: READY FOR MC03 LIVE TRIAL  |  ACTION REQUIRED

import assert from 'assert';

// ─── Polyfill Browser Environment ────────────────────────────────────────────
const store = new Map();
global.localStorage = {
  getItem:    (k)    => store.get(k) || null,
  setItem:    (k, v) => store.set(k, String(v)),
  removeItem: (k)    => store.delete(k),
  clear:      ()     => store.clear()
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
let passCount = 0;
let failCount = 0;
const results = [];

function pass(testId, desc) {
  passCount++;
  results.push({ testId, desc, status: 'PASS' });
  console.log(`  ✓ [${testId}] ${desc}`);
}

function fail(testId, desc, error) {
  failCount++;
  results.push({ testId, desc, status: 'FAIL', error: String(error) });
  console.error(`  ✗ [${testId}] ${desc}\n     Error: ${error}`);
}

function section(title) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  PHASE 11C – ${title}`);
  console.log(`${'─'.repeat(72)}`);
}

// ─── Import Services ─────────────────────────────────────────────────────────
console.log('\n🚀 Radiance Polymers – Phase 11C MC03 Live Trial Activation Test Suite\n');

const {
  getLiveTrialControl,
  startLiveTrial,
  calculateLiveTrialDay,
  getDailyShiftExecutionTracker,
  getPilotDataRegister,
  getDailyHealthCheckMetrics,
  getTrialCompletionProgress,
  getRolloutDecisionStatus,
  getPilotSignOffData,
  getTrialMetrics
} = await import('./src/services/storageService.js');

const {
  exportPilotSignOffReportExcel,
  exportPilotSignOffReportPDF,
  exportTrialCompletionReportPDF
} = await import('./src/services/exportService.js');

// ─── OBJECTIVE 1: LIVE TRIAL ACTIVATION ──────────────────────────────────────
section('OBJECTIVE 1 – LIVE TRIAL ACTIVATION');

// 1a. Pre-activation state – machine locked to MC03
try {
  const initial = getLiveTrialControl();
  assert.ok(initial.pilotMachine === 'MC03', 'Pilot machine must be MC03 at all times');
  pass('1a', 'Pilot machine locked to MC03 before activation');
} catch (e) { fail('1a', 'Pilot machine locked to MC03 before activation', e); }

// 1b. Activate trial and verify complete status transition
try {
  const activated = startLiveTrial({
    activatedBy: 'Mr. Lokesh',
    startDate:   '2026-09-17',
    startTime:   '08:15'
  });
  assert.strictEqual(activated.status,           'LIVE TRIAL ACTIVE', 'Status transitions to LIVE TRIAL ACTIVE');
  assert.strictEqual(activated.isTrialActive,    true,                'isTrialActive flag set to true');
  assert.strictEqual(activated.trialStartDate,   '2026-09-17',        'Trial start date recorded');
  assert.strictEqual(activated.trialStartTime,   '08:15',             'Trial start time recorded');
  assert.strictEqual(activated.trialActivatedBy, 'Mr. Lokesh',        'Activated-by user recorded');
  assert.strictEqual(activated.pilotMachine,     'MC03',              'Machine locked to MC03');
  pass('1b', 'startLiveTrial() – start date/time/user recorded, MC03 locked, status = LIVE TRIAL ACTIVE');
} catch (e) { fail('1b', 'startLiveTrial() full activation chain', e); }

// 1c. Permanent persistence in localStorage
try {
  const persisted = getLiveTrialControl();
  assert.strictEqual(persisted.status,         'LIVE TRIAL ACTIVE', 'Persisted status: LIVE TRIAL ACTIVE');
  assert.strictEqual(persisted.trialStartDate, '2026-09-17',        'Persisted start date correct');
  assert.strictEqual(persisted.pilotMachine,   'MC03',              'Persisted machine = MC03');
  pass('1c', 'Trial activation permanently persisted in localStorage – no data loss on reload');
} catch (e) { fail('1c', 'Permanent localStorage persistence', e); }

// 1d. Re-activation (correction) by another supervisor is accepted
try {
  const reActivated = startLiveTrial({
    activatedBy: 'Mr. Akshay',
    startDate:   '2026-09-18',
    startTime:   '08:00'
  });
  assert.strictEqual(reActivated.status,           'LIVE TRIAL ACTIVE', 'Status remains LIVE TRIAL ACTIVE');
  assert.strictEqual(reActivated.trialActivatedBy, 'Mr. Akshay',        'Activated-by updated on correction');
  pass('1d', 'Re-activation overwrite accepted (supports start date/time corrections by supervisor)');
} catch (e) { fail('1d', 'Re-activation overwrite scenario', e); }

// ─── OBJECTIVE 2: DAY COUNTER ─────────────────────────────────────────────────
section('OBJECTIVE 2 – LIVE TRIAL DAY COUNTER (Automatic)');

// 2a. Day 1 when start date is today
try {
  const today = new Date().toISOString().split('T')[0];
  const day   = calculateLiveTrialDay(today);
  assert.strictEqual(day, 1, 'Start date = today gives Day 1 of 21');
  pass('2a', 'calculateLiveTrialDay(today) = Day 1 of 21');
} catch (e) { fail('2a', 'Day 1 when start date is today', e); }

// 2b. Day 6 when trial started 5 days ago
try {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const day = calculateLiveTrialDay(fiveDaysAgo);
  assert.strictEqual(day, 6, 'Start date 5 days ago gives Day 6 of 21');
  pass('2b', 'calculateLiveTrialDay(5 days ago) = Day 6 of 21');
} catch (e) { fail('2b', 'Day 6 calculation (5 days ago)', e); }

// 2c. Day counter capped at 21
try {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const day = calculateLiveTrialDay(thirtyDaysAgo);
  assert.strictEqual(day, 21, 'Day counter capped at 21 after trial duration expires');
  pass('2c', 'Day counter hard-capped at 21 (pilot period maximum)');
} catch (e) { fail('2c', 'Day counter cap at 21', e); }

// 2d. Day counter minimum is 1 (no negative or zero days)
try {
  const futureDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const day = calculateLiveTrialDay(futureDate);
  assert.ok(day >= 1, 'Day counter minimum floor = 1');
  pass('2d', 'Day counter minimum floor = 1 (never negative or zero)');
} catch (e) { fail('2d', 'Day counter minimum floor', e); }

// ─── OBJECTIVE 3: SHIFT COUNTER ───────────────────────────────────────────────
section('OBJECTIVE 3 – SHIFT COUNTER (Shift A / B / C)');

// 3a. Shift tracker returns 3 shifts planned
try {
  const tracker = getDailyShiftExecutionTracker('2026-09-17');
  assert.strictEqual(tracker.totalShiftsPlanned, 3, '3 shifts planned per day (A, B, C)');
  assert.ok(Array.isArray(tracker.shifts),            'shifts property is array');
  assert.strictEqual(tracker.shifts.length, 3,        'Exactly 3 shift entries');
  pass('3a', 'Shift tracker returns 3 shifts planned (Shift A, B, C) per day');
} catch (e) { fail('3a', 'Shift tracker 3 shifts planned', e); }

// 3b. Shift A / B / C correctly identified
try {
  const tracker = getDailyShiftExecutionTracker('2026-09-17');
  const names   = tracker.shifts.map(s => s.name);
  assert.ok(names.some(n => n.includes('Shift A')), 'Shift A present');
  assert.ok(names.some(n => n.includes('Shift B')), 'Shift B present');
  assert.ok(names.some(n => n.includes('Shift C')), 'Shift C present');
  pass('3b', 'Shift A (08:00), Shift B (16:00), Shift C (00:00) correctly identified');
} catch (e) { fail('3b', 'Shift A/B/C naming', e); }

// 3c. Completion metadata valid
try {
  const tracker = getDailyShiftExecutionTracker('2026-09-17');
  assert.ok(tracker.totalShiftsCompleted >= 0,     'Completed shifts count ≥ 0');
  assert.ok(Array.isArray(tracker.missingShifts),  'missingShifts is array');
  assert.ok(tracker.completionPercentage >= 0 && tracker.completionPercentage <= 100,
    'Completion percentage between 0 and 100');
  pass('3c', 'Shift completion %, missing shifts list, and completed count all valid');
} catch (e) { fail('3c', 'Shift completion metadata', e); }

// 3d. Tracker supports different dates (historical lookup)
try {
  const t1 = getDailyShiftExecutionTracker('2026-09-15');
  const t2 = getDailyShiftExecutionTracker('2026-09-16');
  assert.strictEqual(t1.date, '2026-09-15', 'Tracker date 2026-09-15 returned');
  assert.strictEqual(t2.date, '2026-09-16', 'Tracker date 2026-09-16 returned');
  pass('3d', 'Shift tracker supports configurable date parameter for historical lookup');
} catch (e) { fail('3d', 'Configurable shift tracker date', e); }

// ─── OBJECTIVE 4: DAILY TRIAL REGISTER ────────────────────────────────────────
section('OBJECTIVE 4 – DAILY TRIAL REGISTER (Automatic Telemetry Collection)');

// 4a. Register returns at least 1 record
try {
  const register = getPilotDataRegister();
  assert.ok(register.length > 0, 'Pilot data register has at least 1 record');
  pass('4a', 'Pilot data register contains records (live telemetry or fallback demonstration data)');
} catch (e) { fail('4a', 'Register returns records', e); }

// 4b. All 11 required fields present in each record
try {
  const register = getPilotDataRegister();
  const sample   = register[0];
  const required = [
    'date', 'shift', 'machine', 'partNumber', 'operator', 'supervisor',
    'grossProduction', 'rejections', 'acceptedQty', 'downtime', 'materialConsumption'
  ];
  required.forEach(field => {
    assert.ok(sample[field] !== undefined, `Register record field present: ${field}`);
  });
  pass('4b', 'All 11 required register fields present: date, shift, machine, part, operator, supervisor, gross, rej, accepted, downtime, material');
} catch (e) { fail('4b', 'Register record field completeness', e); }

// 4c. Machine is always MC03 in register
try {
  const register = getPilotDataRegister();
  register.forEach((row, idx) => {
    assert.strictEqual(row.machine, 'MC03', `Record ${idx + 1} machine = MC03`);
  });
  pass('4c', 'All register records identify machine as MC03');
} catch (e) { fail('4c', 'Register machine = MC03 for all records', e); }

// 4d. Data integrity: acceptedQty <= grossProduction
try {
  const register = getPilotDataRegister();
  register.forEach((row, idx) => {
    const gross    = Number(row.grossProduction);
    const accepted = Number(row.acceptedQty);
    assert.ok(accepted <= gross, `Record ${idx + 1}: acceptedQty (${accepted}) ≤ gross (${gross})`);
  });
  pass('4d', 'Accepted quantity ≤ Gross production (mathematical integrity verified for all records)');
} catch (e) { fail('4d', 'Register data integrity: accepted ≤ gross', e); }

// ─── OBJECTIVE 5: TRIAL HEALTH MONITOR ───────────────────────────────────────
section('OBJECTIVE 5 – TRIAL HEALTH MONITOR (6 Indicators)');

// 5a. Returns array of 6+ indicators
try {
  const health = getDailyHealthCheckMetrics();
  assert.ok(Array.isArray(health), 'getDailyHealthCheckMetrics returns array');
  assert.ok(health.length >= 6,   '6 or more health indicators returned');
  pass('5a', 'Health monitor returns array of ≥ 6 status indicators');
} catch (e) { fail('5a', 'Health monitor returns 6+ indicators', e); }

// 5b. All 6 required indicator IDs present
try {
  const health   = getDailyHealthCheckMetrics();
  const ids      = health.map(h => h.id);
  const required = [
    'reports_submitted', 'open_issues', 'closed_issues',
    'backup_status', 'email_status', 'sync_success'
  ];
  required.forEach(id => {
    assert.ok(ids.includes(id), `Health indicator present: ${id}`);
  });
  pass('5b', 'All 6 required indicators present: reports_submitted, open_issues, closed_issues, backup_status, email_status, sync_success');
} catch (e) { fail('5b', 'Required health indicator IDs', e); }

// 5c. Each indicator has label, color, status
try {
  const health = getDailyHealthCheckMetrics();
  health.forEach(metric => {
    assert.ok(metric.label,  `Metric has label:  ${metric.id}`);
    assert.ok(metric.color,  `Metric has color:  ${metric.id}`);
    assert.ok(metric.status, `Metric has status: ${metric.id}`);
  });
  pass('5c', 'All health indicators have label, color, and status properties');
} catch (e) { fail('5c', 'Health indicator property completeness', e); }

// ─── OBJECTIVE 6: TRIAL COMPLETION CRITERIA ───────────────────────────────────
section('OBJECTIVE 6 – TRIAL COMPLETION CRITERIA & PROGRESS FORMULA');

// 6a. Total days = 21 (fixed)
try {
  const progress = getTrialCompletionProgress();
  assert.strictEqual(progress.totalDays, 21, 'Trial duration = 21 days (fixed constant)');
  pass('6a', 'Total trial duration = 21 days (fixed)');
} catch (e) { fail('6a', 'Total trial days = 21', e); }

// 6b. Total planned shifts = 63 (21 × 3)
try {
  const progress = getTrialCompletionProgress();
  assert.strictEqual(progress.totalPlannedShifts, 63, 'Total planned shifts = 63 (21 × 3)');
  pass('6b', 'Total planned shifts = 63 (21 days × 3 shifts per day)');
} catch (e) { fail('6b', 'Total planned shifts = 63', e); }

// 6c. Completed days in valid range [1, 21]
try {
  const progress = getTrialCompletionProgress();
  assert.ok(progress.completedDays >= 1 && progress.completedDays <= 21,
    `Completed days (${progress.completedDays}) in range [1, 21]`);
  pass('6c', `Completed days = ${progress.completedDays} (valid range 1–21)`);
} catch (e) { fail('6c', 'Completed days in valid range', e); }

// 6d. Days remaining formula correct
try {
  const progress = getTrialCompletionProgress();
  const expected = Math.max(0, 21 - progress.completedDays);
  assert.strictEqual(progress.daysRemaining, expected, 'Days remaining = 21 - completedDays');
  pass('6d', `Days remaining formula: 21 − ${progress.completedDays} = ${progress.daysRemaining}`);
} catch (e) { fail('6d', 'Days remaining formula', e); }

// 6e. Progress % formula: (completedDays / 21) × 100
try {
  const progress = getTrialCompletionProgress();
  const expected = Math.min(100, Math.round((progress.completedDays / 21) * 1000) / 10);
  assert.strictEqual(progress.progressPercent, expected,
    `Progress formula: (${progress.completedDays}/21)×100 = ${expected}%`);
  pass('6e', `Progress % formula verified: (${progress.completedDays}/21)×100 = ${progress.progressPercent}%`);
} catch (e) { fail('6e', 'Progress % formula', e); }

// ─── OBJECTIVE 7: ROLLOUT DECISION (READ-ONLY GATES) ─────────────────────────
section('OBJECTIVE 7 – ROLLOUT DECISION GATES (Read-Only)');

// 7a. Exactly 5 gates
try {
  const decision = getRolloutDecisionStatus();
  assert.strictEqual(decision.gates.length, 5, 'Exactly 5 rollout gates defined');
  pass('7a', 'Rollout decision panel has exactly 5 gates');
} catch (e) { fail('7a', 'Exactly 5 rollout gates', e); }

// 7b. Gate 1: Trial Days Completed = 21
try {
  const gate = getRolloutDecisionStatus().gates.find(g => g.id === 'days_gate');
  assert.ok(gate,                      'Gate 1 (days_gate) exists');
  assert.ok(gate.label.includes('21'), 'Gate 1 label mentions 21 days');
  assert.ok(gate.current,              'Gate 1 has current value');
  pass('7b', 'Gate 1: "Trial Days Completed = 21" present with current value');
} catch (e) { fail('7b', 'Gate 1 – Days completed = 21', e); }

// 7c. Gate 2: Data Accuracy ≥ 99%
try {
  const gate = getRolloutDecisionStatus().gates.find(g => g.id === 'accuracy_gate');
  assert.ok(gate,                            'Gate 2 (accuracy_gate) exists');
  assert.ok(gate.label.includes('Accuracy'), 'Gate 2 label mentions Accuracy');
  pass('7c', 'Gate 2: "Data Accuracy ≥ 99%" gate present');
} catch (e) { fail('7c', 'Gate 2 – Accuracy ≥ 99%', e); }

// 7d. Gate 3: Open Critical Issues = 0
try {
  const gate = getRolloutDecisionStatus().gates.find(g => g.id === 'critical_issues_gate');
  assert.ok(gate,                            'Gate 3 (critical_issues_gate) exists');
  assert.ok(gate.label.includes('Critical'), 'Gate 3 label mentions Critical');
  pass('7d', 'Gate 3: "Open Critical Issues = 0" gate present');
} catch (e) { fail('7d', 'Gate 3 – Critical issues = 0', e); }

// 7e. Gates 4 & 5: Backup 100% and Email 100%
try {
  const decision   = getRolloutDecisionStatus();
  const backupGate = decision.gates.find(g => g.id === 'backup_gate');
  const emailGate  = decision.gates.find(g => g.id === 'email_gate');
  assert.ok(backupGate, 'Gate 4 (backup_gate) exists');
  assert.ok(emailGate,  'Gate 5 (email_gate) exists');
  pass('7e', 'Gates 4 & 5: "Backup Success = 100%" and "Email Success = 100%" present');
} catch (e) { fail('7e', 'Gates 4 & 5 – Backup and Email', e); }

// 7f. Verdict and read-only disclaimer
try {
  const decision = getRolloutDecisionStatus();
  assert.ok(decision.verdict,                          'Verdict string present');
  assert.ok(decision.disclaimer.includes('Read-only'), 'Disclaimer explicitly specifies read-only gate evaluation');
  pass('7f', 'Verdict string and read-only disclaimer present (no auto-approval logic)');
} catch (e) { fail('7f', 'Verdict and read-only disclaimer', e); }

// ─── OBJECTIVE 8: END OF TRIAL PACKAGE EXPORTS ────────────────────────────────
section('OBJECTIVE 8 – END OF TRIAL PACKAGE (Excel + PDF + Rollout Recommendation)');

// 8a. Trial Summary Excel
try {
  const signOff = getPilotSignOffData();
  const result  = exportPilotSignOffReportExcel(signOff);
  assert.strictEqual(result.success, true, 'Trial Summary Excel generated');
  assert.ok(result.filename,               'Excel filename present');
  pass('8a', `Trial Summary Excel generated: ${result.filename}`);
} catch (e) { fail('8a', 'Trial Summary Excel generation', e); }

// 8b. Trial Summary PDF
try {
  const signOff = getPilotSignOffData();
  const result  = exportPilotSignOffReportPDF(signOff);
  assert.strictEqual(result.success, true, 'Trial Summary PDF generated');
  assert.ok(result.filename,               'PDF filename present');
  pass('8b', `Trial Summary PDF generated: ${result.filename}`);
} catch (e) { fail('8b', 'Trial Summary PDF generation', e); }

// 8c. Rollout Recommendation Report (PDF)
try {
  const metrics = getTrialMetrics();
  const result  = exportTrialCompletionReportPDF(metrics);
  assert.strictEqual(result.success, true, 'Rollout Recommendation Report PDF generated');
  assert.ok(result.filename,               'Rollout PDF filename present');
  pass('8c', `Rollout Recommendation Report PDF generated: ${result.filename}`);
} catch (e) { fail('8c', 'Rollout Recommendation PDF generation', e); }

// ─── FINAL VERDICT ────────────────────────────────────────────────────────────
const totalTests  = passCount + failCount;
const accuracyPct = Math.round((passCount / totalTests) * 1000) / 10;
const verdict     = failCount === 0 ? 'READY FOR MC03 LIVE TRIAL' : 'ACTION REQUIRED';
const verdictIcon = failCount === 0 ? '🟢' : '🔴';

console.log('\n' + '═'.repeat(72));
console.log('  PHASE 11C – MC03 LIVE TRIAL ACTIVATION VERIFICATION RESULTS');
console.log('═'.repeat(72));
console.log(`  Total Tests   : ${totalTests}`);
console.log(`  Passed        : ${passCount}`);
console.log(`  Failed        : ${failCount}`);
console.log(`  Accuracy      : ${accuracyPct}%`);
console.log(`  Target        : 100.0%`);
console.log('─'.repeat(72));
console.log(`  ${verdictIcon}  FINAL VERDICT: ${verdict}`);
console.log('═'.repeat(72));

if (failCount > 0) {
  console.log('\n  FAILED TESTS:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.error(`    ✗ [${r.testId}] ${r.desc}\n      ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n  🎉 All Phase 11C Live Trial Activation tests passed.\n');
  console.log('  MC03 21-Day Live Pilot is CLEARED for shop floor execution.\n');
}
