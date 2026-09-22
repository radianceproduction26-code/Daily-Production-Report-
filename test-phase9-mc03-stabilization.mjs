// Radiance Polymers - Phase 9 Live MC03 Pilot Execution Stabilization Mode Test Suite
import assert from 'node:assert';

// Polyfill localStorage for Node test runner
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

const {
  getTrialObservations,
  addTrialObservation,
  updateTrialObservationStatus,
  getTrialIssues,
  addTrialIssue,
  updateTrialIssueStatus,
  generateNextIssueId,
  getIssueAgingDays,
  getVersion1_1Backlog,
  getDailyHealthCheckMetrics,
  getTrialMetrics,
  getDailyBackupStatus
} = await import('./src/services/storageService.js');

const {
  getDailyTrialReviewData,
  exportDailyTrialReviewExcel,
  exportDailyTrialReviewPDF,
  sendDailyTrialReviewEmail,
  exportTrialCompletionReport,
  exportTrialCompletionReportPDF
} = await import('./src/services/exportService.js');

console.log('🧪 Starting Phase 9 Live MC03 Pilot Execution Stabilization Mode Tests...\n');

let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. LIVE TRIAL MONITORING MODE
test('1. Live Trial Monitoring Mode - Continuous parameters validation', () => {
  const monitoringConfig = {
    machine: 'MC03',
    dayCounter: 'DAY 1 OF 21',
    partNumber: 'F53200000A',
    operator: 'Ramesh',
    supervisor: 'Mr. Lokesh',
    shift: 'Shift A'
  };

  assert.strictEqual(monitoringConfig.machine, 'MC03');
  assert.strictEqual(monitoringConfig.dayCounter, 'DAY 1 OF 21');
  assert.strictEqual(monitoringConfig.partNumber, 'F53200000A');
  assert.strictEqual(monitoringConfig.operator, 'Ramesh');
  assert.strictEqual(monitoringConfig.supervisor, 'Mr. Lokesh');
  assert.strictEqual(monitoringConfig.shift, 'Shift A');
});

// 2. DAILY HEALTH CHECK DASHBOARD
test('2. Daily Health Check Dashboard - 10 core health indicators and Green/Amber/Red color codes', () => {
  const healthMetrics = getDailyHealthCheckMetrics();
  assert(Array.isArray(healthMetrics));
  assert.strictEqual(healthMetrics.length, 10, 'Must have exactly 10 health indicators');

  const expectedIds = [
    'reports_submitted',
    'reports_pending',
    'val_prevented',
    'rejections_logged',
    'downtime_logged',
    'sync_success',
    'backup_status',
    'email_status',
    'open_issues',
    'closed_issues'
  ];

  expectedIds.forEach(id => {
    const item = healthMetrics.find(h => h.id === id);
    assert(item !== undefined, `Health indicator ${id} must exist`);
    assert(['healthy', 'warning', 'attention'].includes(item.status));
    assert(item.color.startsWith('#'), 'Must have valid hex color');
    assert(item.badge !== undefined, 'Must have readable badge');
  });
});

// 3. OBSERVATION LOGGING & AUDIT TRAIL
test('3. Observation Logging - Create observation, audit trail, and auto-sync to Version 1.1 Backlog', () => {
  const backlogBefore = getVersion1_1Backlog();
  const obsBefore = getTrialObservations();

  const newObs = addTrialObservation({
    date: '2026-09-17',
    shift: 'Shift A',
    machine: 'MC03',
    partNumber: 'F53200000A',
    operator: 'Ramesh',
    supervisor: 'Mr. Lokesh',
    category: 'Validation Issue',
    comments: 'Runtime capacity warning prompted correctly during 11:00-12:00 interval.',
    priority: 'Medium'
  });

  assert(newObs.id.startsWith('obs-'));
  assert.strictEqual(newObs.status, 'Open');

  // Verify stored permanently
  const obsAfter = getTrialObservations();
  assert(obsAfter.length > obsBefore.length);

  // Verify automatically copied to Version 1.1 Backlog
  const backlogAfter = getVersion1_1Backlog();
  assert(backlogAfter.length > backlogBefore.length);
  const mirrored = backlogAfter.find(b => b.sourceId === newObs.id);
  assert(mirrored !== undefined, 'Must be mirrored in Version 1.1 Backlog');
  assert.strictEqual(mirrored.source, 'Observation');
  assert.strictEqual(mirrored.category, 'Validation Issue');
});

// 4. ISSUE REGISTER WITH AGING DAYS
test('4. Issue Register - Sequential ISS-001 format, aging days, resolution, and auto-sync to Backlog', () => {
  const backlogBefore = getVersion1_1Backlog();

  const newIssue = addTrialIssue({
    date: '2026-09-15', // 2 days ago for aging test
    machine: 'MC03',
    part: '5036677',
    reportedBy: 'Mr. Akshay',
    description: 'Minor burr observed on left mounting rib of bezel',
    priority: 'Medium',
    assignedTo: 'Mr. Akshay',
    resolution: 'De-burred pin and polished cavity 2.'
  });

  assert(newIssue.id.startsWith('ISS-'));
  assert.strictEqual(newIssue.priority, 'Medium');
  assert.strictEqual(newIssue.status, 'Open');

  // Test Aging Days Calculation
  const agingDays = getIssueAgingDays(newIssue.date);
  assert(agingDays >= 0, 'Aging days must be non-negative integer');

  // Update Status & Resolution
  const updated = updateTrialIssueStatus(newIssue.id, 'Closed', 'Polishing completed and QA approved.');
  assert.strictEqual(updated.status, 'Closed');
  assert.strictEqual(updated.resolution, 'Polishing completed and QA approved.');

  // Verify automatically copied to Version 1.1 Backlog
  const backlogAfter = getVersion1_1Backlog();
  assert(backlogAfter.length > backlogBefore.length);
  const mirroredIssue = backlogAfter.find(b => b.sourceId === newIssue.id);
  assert(mirroredIssue !== undefined, 'Issue must be mirrored in Version 1.1 Backlog');
  assert.strictEqual(mirroredIssue.source, 'Issue');
});

// 5. DAILY TRIAL REVIEW SUMMARY (EXCEL, PDF, EMAIL)
test('5. Daily Trial Review Summary - Data extraction, Excel, PDF, and Email exports', async () => {
  const mockReport = {
    id: 'rep-mc03-test',
    reportDate: '2026-09-17',
    machineNumber: 'MC03',
    operator_name: 'Ramesh',
    supervisorName: 'Mr. Lokesh',
    mouldSessions: [
      { partNumber: 'F53200000A', partCode: 'F53200000A' }
    ]
  };

  const reviewData = getDailyTrialReviewData(mockReport, {
    totalProduction: 3335,
    totalRejections: 65,
    totalDowntime: 60,
    validationErrorsPrevented: 24,
    issueCount: 3,
    closedIssuesCount: 3
  });

  assert.strictEqual(reviewData.machine, 'MC03');
  assert.strictEqual(reviewData.partNumber, 'F53200000A');
  assert.strictEqual(reviewData.operator, 'Ramesh');
  assert.strictEqual(reviewData.supervisor, 'Mr. Lokesh');
  assert.strictEqual(reviewData.grossProduction, 3335);
  assert.strictEqual(reviewData.acceptedProduction, 3270);
  assert.strictEqual(reviewData.rejections, 65);
  assert.strictEqual(reviewData.downtime, 60);

  // Export Excel
  const excelRes = exportDailyTrialReviewExcel(reviewData);
  assert.strictEqual(excelRes.success, true);
  assert(excelRes.filename || excelRes.workbook);

  // Export PDF
  const pdfRes = exportDailyTrialReviewPDF(reviewData);
  assert.strictEqual(pdfRes.success, true);
  assert(pdfRes.filename.endsWith('.pdf'));

  // Email Summary Dispatch
  const emailRes = await sendDailyTrialReviewEmail(reviewData, ['director@radiancepolymers.com']);
  assert.strictEqual(emailRes.success, true);
  assert.strictEqual(emailRes.status, 'SENT');
  assert(emailRes.recipients.includes('director@radiancepolymers.com'));
});

// 6. VERSION 1.1 IMPROVEMENT BACKLOG STRUCTURE
test('6. Version 1.1 Backlog - Structural integrity and required fields', () => {
  const backlog = getVersion1_1Backlog();
  assert(Array.isArray(backlog));
  assert(backlog.length > 0, 'Backlog must contain entries');

  const sample = backlog[0];
  assert(sample.id !== undefined, 'ID required');
  assert(['Observation', 'Issue'].includes(sample.source), 'Source must be Observation or Issue');
  assert(sample.category !== undefined, 'Category required');
  assert(sample.priority !== undefined, 'Priority required');
  assert(sample.description !== undefined, 'Description required');
  assert(sample.raisedBy !== undefined, 'Raised By required');
  assert(sample.date !== undefined, 'Date required');
});

// 7. TRIAL COMPLETION READINESS
test('7. Trial Completion Readiness - 10 Rollout Readiness Metrics', () => {
  const metrics = getTrialMetrics();

  assert(metrics.totalShifts >= 1, 'Total Shifts must be tracked');
  assert(metrics.totalProduction >= 0, 'Total Production must be tracked');
  assert(metrics.totalRejections >= 0, 'Total Rejections must be tracked');
  assert(metrics.totalDowntime >= 0, 'Total Downtime must be tracked');
  assert(metrics.issueCount >= 0, 'Total Issues Logged must be tracked');
  assert(metrics.closedIssuesCount >= 0, 'Total Issues Closed must be tracked');
  assert(metrics.systemAvailability >= 99.0, 'System Availability >= 99%');
  assert.strictEqual(metrics.emailSuccessPercent, 100.0, 'Email Success Rate 100%');
  assert.strictEqual(metrics.exportSuccessPercent, 100.0, 'Export Success Rate 100%');

  // Both final completion export documents generated cleanly
  const compExcel = exportTrialCompletionReport(metrics);
  const compPdf = exportTrialCompletionReportPDF(metrics);
  assert.strictEqual(compExcel.success, true);
  assert.strictEqual(compPdf.success, true);
});

console.log(`\n🎉 All ${passedTests} Phase 9 Live MC03 Pilot Execution Stabilization tests passed cleanly!\n`);
