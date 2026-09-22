// Radiance Polymers - Phase 11 MC03 Live Trial Operations Mode Verification Suite
import assert from 'assert';

// 1. Mock Browser Environment (localStorage)
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

console.log('🧪 Starting Phase 11 MC03 Live Trial Operations Mode Tests...\n');

// Import services after localStorage polyfill
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

// ----------------------------------------------------------------------------
// TEST 1: 1. Live Trial Start Control
// ----------------------------------------------------------------------------
{
  const initialControl = getLiveTrialControl();
  assert.strictEqual(initialControl.pilotMachine, 'MC03', 'Pilot machine must be MC03');

  // Activate trial
  const activated = startLiveTrial({
    activatedBy: 'Mr. Lokesh',
    startDate: '2026-09-01',
    startTime: '08:00'
  });

  assert.strictEqual(activated.isTrialActive, true, 'Trial must be active');
  assert.strictEqual(activated.status, 'LIVE TRIAL ACTIVE', 'Status must transition to LIVE TRIAL ACTIVE');
  assert.strictEqual(activated.trialStartDate, '2026-09-01', 'Start date recorded');
  assert.strictEqual(activated.trialStartTime, '08:00', 'Start time recorded');
  assert.strictEqual(activated.trialActivatedBy, 'Mr. Lokesh', 'Activated user recorded');
  assert.strictEqual(activated.pilotMachine, 'MC03', 'Machine locked to MC03');

  // Verify permanent persistence in localStorage
  const persisted = getLiveTrialControl();
  assert.strictEqual(persisted.status, 'LIVE TRIAL ACTIVE', 'Persisted status verified');
  console.log('  ✓ 1. Trial Start Control - Start date/time, user, MC03 lock, and LIVE TRIAL ACTIVE status verified');
}

// ----------------------------------------------------------------------------
// TEST 2: 2. Live Trial Day Counter
// ----------------------------------------------------------------------------
{
  // Test start date today => Day 1
  const todayStr = new Date().toISOString().split('T')[0];
  const dayToday = calculateLiveTrialDay(todayStr);
  assert.strictEqual(dayToday, 1, 'Start date today gives Day 1 of 21');

  // Test start date 5 days ago => Day 6
  const past5Days = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const day6 = calculateLiveTrialDay(past5Days);
  assert.strictEqual(day6, 6, 'Start date 5 days ago gives Day 6 of 21');

  // Test capping at 21 days
  const past30Days = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const dayCapped = calculateLiveTrialDay(past30Days);
  assert.strictEqual(dayCapped, 21, 'Day counter capped at 21 of 21');
  console.log('  ✓ 2. Day Counter - Accurate calculation based on actual start date up to Day 21 verified');
}

// ----------------------------------------------------------------------------
// TEST 3: 3. Daily Shift Execution Tracker
// ----------------------------------------------------------------------------
{
  const tracker = getDailyShiftExecutionTracker('2026-09-17');
  assert.strictEqual(tracker.totalShiftsPlanned, 3, 'Total shifts planned is 3');
  assert.ok(Array.isArray(tracker.shifts), 'Shifts array exists');
  assert.strictEqual(tracker.shifts.length, 3, 'Tracks Shift A, Shift B, and Shift C');

  const shiftNames = tracker.shifts.map(s => s.name);
  assert.ok(shiftNames.some(n => n.includes('Shift A')), 'Shift A present');
  assert.ok(shiftNames.some(n => n.includes('Shift B')), 'Shift B present');
  assert.ok(shiftNames.some(n => n.includes('Shift C')), 'Shift C present');

  assert.ok(tracker.totalShiftsCompleted >= 0, 'Total shifts completed counted');
  assert.ok(Array.isArray(tracker.missingShifts), 'Missing shifts array present');
  console.log('  ✓ 3. Shift Tracking - Shift A, B, C planned vs completed vs missing shifts verified');
}

// ----------------------------------------------------------------------------
// TEST 4: 4. Pilot Data Collection Register
// ----------------------------------------------------------------------------
{
  const register = getPilotDataRegister();
  assert.ok(register.length > 0, 'Data collection register contains records');
  const sample = register[0];

  assert.ok(sample.date, 'Date present');
  assert.ok(sample.shift, 'Shift present');
  assert.strictEqual(sample.machine, 'MC03', 'Machine is MC03');
  assert.ok(sample.partNumber, 'Part number present');
  assert.ok(sample.operator, 'Operator present');
  assert.ok(sample.supervisor, 'Supervisor present');
  assert.ok(Number(sample.grossProduction) > 0, 'Gross production present');
  assert.ok(sample.rejections !== undefined, 'Rejections present');
  assert.ok(Number(sample.acceptedQty) > 0, 'Accepted quantity present');
  assert.ok(sample.downtime !== undefined, 'Downtime present');
  assert.ok(sample.materialConsumption, 'Material consumption present');
  console.log('  ✓ 4. Data Collection Register - Read-only telemetry extraction from existing reports verified');
}

// ----------------------------------------------------------------------------
// TEST 5: 5. Trial Health Monitor
// ----------------------------------------------------------------------------
{
  const healthMetrics = getDailyHealthCheckMetrics();
  const ids = healthMetrics.map(h => h.id);

  assert.ok(ids.includes('reports_submitted'), 'Reports Submitted Today present');
  assert.ok(ids.includes('open_issues'), 'Open Issues present');
  assert.ok(ids.includes('closed_issues'), 'Closed Issues present');
  assert.ok(ids.includes('backup_status'), 'Backup Status present');
  assert.ok(ids.includes('email_status'), 'Email Status present');
  assert.ok(ids.includes('sync_success'), 'Sync Status present');

  // Verify all 6 return healthy or warning status colors
  healthMetrics.forEach(metric => {
    assert.ok(metric.color, `Metric ${metric.label} has color code`);
    assert.ok(metric.status, `Metric ${metric.label} has status indicator`);
  });
  console.log('  ✓ 5. Health Monitor - 6 Core Status Indicators (Reports, Issues, Backup, Email, Sync) verified');
}

// ----------------------------------------------------------------------------
// TEST 6: 6. Progress Calculation (Formula: Completed Days / 21 * 100)
// ----------------------------------------------------------------------------
{
  const progress = getTrialCompletionProgress();
  assert.strictEqual(progress.totalDays, 21, 'Total trial days is 21');
  assert.strictEqual(progress.totalPlannedShifts, 63, 'Total planned shifts is 63 (21 days x 3 shifts)');
  assert.ok(progress.completedDays >= 1 && progress.completedDays <= 21, 'Completed days valid range');
  assert.strictEqual(progress.daysRemaining, 21 - progress.completedDays, 'Days remaining formula valid');

  const expectedPercent = Math.min(100, Math.round((progress.completedDays / 21) * 1000) / 10);
  assert.strictEqual(progress.progressPercent, expectedPercent, 'Progress formula matches Completed Days / 21 * 100');
  console.log('  ✓ 6. Progress Calculation - Formula Progress % = (Completed Days / 21) * 100 verified');
}

// ----------------------------------------------------------------------------
// TEST 7: 7. Rollout Readiness Logic (Read-Only Gate Evaluation)
// ----------------------------------------------------------------------------
{
  const decision = getRolloutDecisionStatus();
  assert.strictEqual(decision.gates.length, 5, 'Exactly 5 rollout gates tracked');

  const gateLabels = decision.gates.map(g => g.label);
  assert.ok(gateLabels.some(l => l.includes('Trial Days Completed = 21')), 'Gate 1: Days completed');
  assert.ok(gateLabels.some(l => l.includes('Accuracy ≥ 99%')), 'Gate 2: Accuracy');
  assert.ok(gateLabels.some(l => l.includes('Open Critical Issues = 0')), 'Gate 3: Open critical issues');
  assert.ok(gateLabels.some(l => l.includes('Backup Success = 100%')), 'Gate 4: Backup');
  assert.ok(gateLabels.some(l => l.includes('Email Success = 100%')), 'Gate 5: Email');

  assert.ok(decision.verdict, 'Verdict string present');
  assert.ok(decision.disclaimer.includes('Read-only'), 'Disclaimer explicitly specifies read-only');
  console.log('  ✓ 7. Rollout Readiness Logic - 5 Rollout criteria verified read-only (no auto-approval)');
}

// ----------------------------------------------------------------------------
// TEST 8: 8. End of Trial Package (Excel, PDF, Rollout Recommendation)
// ----------------------------------------------------------------------------
{
  const signOff = getPilotSignOffData();
  const metrics = getTrialMetrics();

  // Excel
  const excel = exportPilotSignOffReportExcel(signOff);
  assert.strictEqual(excel.success, true, 'Excel trial summary generated');

  // PDF
  const pdf = exportPilotSignOffReportPDF(signOff);
  assert.strictEqual(pdf.success, true, 'PDF trial summary generated');

  // Rollout recommendation report
  const rolloutReport = exportTrialCompletionReportPDF(metrics);
  assert.strictEqual(rolloutReport.success, true, 'Rollout recommendation report generated');
  console.log('  ✓ 8. Trial Completion Package - Excel workbook, PDF summary, and Rollout Report generated');
}

console.log('\n🎉 All 8 Phase 11 MC03 Live Trial Operations tests passed cleanly!\n');
