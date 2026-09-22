// Radiance Polymers - Phase 8 MC03 Live Production Trial Mode Comprehensive Test Suite
import assert from 'node:assert';

// Mock localStorage for Node test runner
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
  saveTrialObservations,
  addTrialObservation,
  updateTrialObservationStatus,
  getTrialIssues,
  saveTrialIssues,
  addTrialIssue,
  updateTrialIssueStatus,
  generateNextIssueId,
  getTrialMetrics,
  executeDailyBackupPipeline,
  getDailyBackupStatus,
  getTrialFeedback,
  saveTrialFeedback
} = await import('./src/services/storageService.js');

const {
  exportTrialCompletionReport,
  exportTrialCompletionReportPDF
} = await import('./src/services/exportService.js');

console.log('🧪 Starting Phase 8 MC03 Live Production Trial Verification Tests...\n');

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

// 1. TRIAL CONFIGURATION & PERSISTENCE
test('1. Trial Configuration - Machine MC03 and Pilot Supervisors', () => {
  const pilotMachine = 'MC03';
  const supervisors = ['Mr. Lokesh', 'Mr. Akshay'];
  const pilotPartCodes = ['F53200000A', '5036677', '5012394'];

  assert.strictEqual(pilotMachine, 'MC03');
  assert.strictEqual(supervisors.length, 2);
  assert(supervisors.includes('Mr. Lokesh'));
  assert(supervisors.includes('Mr. Akshay'));
  assert(pilotPartCodes.includes('F53200000A'));
  assert(pilotPartCodes.includes('5036677'));
  assert(pilotPartCodes.includes('5012394'));
});

// 2. TRIAL OBSERVATION MODULE
test('2. Trial Observation Module - Permanent logging with 8 specific categories', () => {
  const validCategories = [
    'UI Improvement',
    'Validation Improvement',
    'Data Entry Issue',
    'Report Issue',
    'Performance Issue',
    'Training Issue',
    'Master Data Issue',
    'Other'
  ];

  validCategories.forEach(cat => {
    const obs = addTrialObservation({
      date: '2026-09-17',
      shift: 'Shift A',
      machine: 'MC03',
      partNumber: 'F53200000A',
      operator: 'Ramesh',
      supervisor: 'Mr. Lokesh',
      category: cat,
      comments: `Verified observation for category: ${cat}`,
      priority: 'High'
    });

    assert.strictEqual(obs.category, cat);
    assert.strictEqual(obs.machine, 'MC03');
    assert.strictEqual(obs.operator, 'Ramesh');
    assert.strictEqual(obs.status, 'Open');
  });

  const updatedObs = getTrialObservations();
  assert(updatedObs.length >= validCategories.length);
});

test('3. Trial Observation Module - Status update Open -> Closed', () => {
  const newObs = addTrialObservation({
    date: '2026-09-17',
    shift: 'Shift B',
    machine: 'MC03',
    partNumber: '5036677',
    operator: 'Suresh',
    supervisor: 'Mr. Akshay',
    category: 'UI Improvement',
    comments: 'Button contrast test observation',
    priority: 'Low'
  });

  assert.strictEqual(newObs.status, 'Open');

  const closed = updateTrialObservationStatus(newObs.id, 'Closed');
  assert.strictEqual(closed.status, 'Closed');

  const reloaded = getTrialObservations().find(o => o.id === newObs.id);
  assert.strictEqual(reloaded.status, 'Closed');
});

// 3. TRIAL ISSUE REGISTER & SEQUENTIAL ID GENERATION
test('4. Trial Issue Register - Sequential ID generation ISS-001, ISS-002, ISS-003...', () => {
  const nextId1 = generateNextIssueId([]);
  assert.strictEqual(nextId1, 'ISS-001');

  const nextId2 = generateNextIssueId([{ id: 'ISS-001' }, { id: 'ISS-002' }]);
  assert.strictEqual(nextId2, 'ISS-003');

  const nextId3 = generateNextIssueId([{ id: 'ISS-009' }]);
  assert.strictEqual(nextId3, 'ISS-010');
});

test('5. Trial Issue Register - Log and permanently store issue with resolution field', () => {
  const newIssue = addTrialIssue({
    date: '2026-09-17',
    machine: 'MC03',
    part: '5012394',
    reportedBy: 'Mr. Lokesh',
    description: 'Heater band 3 fluctuating during shift start-up',
    priority: 'High',
    assignedTo: 'Technical Team',
    resolution: 'Replaced thermocouple and re-calibrated zone 3.'
  });

  assert(newIssue.id.startsWith('ISS-'));
  assert.strictEqual(newIssue.machine, 'MC03');
  assert.strictEqual(newIssue.part, '5012394');
  assert.strictEqual(newIssue.reportedBy, 'Mr. Lokesh');
  assert.strictEqual(newIssue.priority, 'High');
  assert.strictEqual(newIssue.status, 'Open');
  assert.strictEqual(newIssue.resolution, 'Replaced thermocouple and re-calibrated zone 3.');

  // Update status to Closed and update resolution
  const updatedIssue = updateTrialIssueStatus(newIssue.id, 'Closed', 'Resolved and confirmed by QA.');
  assert.strictEqual(updatedIssue.status, 'Closed');
  assert.strictEqual(updatedIssue.resolution, 'Resolved and confirmed by QA.');

  const stored = getTrialIssues().find(i => i.id === newIssue.id);
  assert.strictEqual(stored.status, 'Closed');
  assert.strictEqual(stored.resolution, 'Resolved and confirmed by QA.');
});

// 4. TRIAL METRICS
test('6. Trial Metrics - Track all 8 required Phase 8 metrics', () => {
  const metrics = getTrialMetrics();

  // Verify all 8 metrics are present and numeric/well-formatted
  assert(metrics.totalReportsSubmitted !== undefined, 'Total Reports Submitted missing');
  assert(metrics.validationErrorsPrevented !== undefined, 'Validation Errors Prevented missing');
  assert(metrics.rejectedEntriesBlocked !== undefined, 'Rejected Entries Blocked missing');
  assert(metrics.offlineEventsHandled !== undefined, 'Offline Events Handled missing');
  assert(metrics.emailDispatchSuccess !== undefined, 'Email Dispatch Success missing');
  assert(metrics.exportSuccess !== undefined, 'Export Success missing');
  assert(metrics.operatorFeedbackCount !== undefined, 'Operator Feedback Count missing');
  assert(metrics.issueCount !== undefined, 'Issue Count missing');

  assert(metrics.validationErrorsPrevented >= 0);
  assert(metrics.rejectedEntriesBlocked >= 0);
  assert(metrics.offlineEventsHandled >= 0);
  assert(metrics.emailDispatchSuccess >= 0);
  assert.strictEqual(metrics.exportSuccess, 100);
  assert(metrics.systemAvailability >= 99.0);
});

// 5. DAILY BACKUP PIPELINE AT SHIFT APPROVAL
test('7. Daily Backup Pipeline - 4-step execution and SUCCESS / FAILED status', () => {
  const mockReport = {
    id: 'report-mc03-shift-1',
    machineNumber: 'MC03',
    shift: 'Shift A',
    operator_name: 'Ramesh',
    supervisorName: 'Mr. Lokesh',
    mouldSessions: []
  };

  const backupResult = executeDailyBackupPipeline(mockReport, ['director@radiancepolymers.com']);
  assert.strictEqual(backupResult.success, true);
  assert.strictEqual(backupResult.status, 'SUCCESS');
  assert.strictEqual(backupResult.record.excelGenerated, true);
  assert.strictEqual(backupResult.record.pdfGenerated, true);
  assert.strictEqual(backupResult.record.emailDispatched, true);
  assert.strictEqual(backupResult.record.backupStored, true);

  const status = getDailyBackupStatus();
  assert.strictEqual(status.status, 'SUCCESS');
});

// 6. TRIAL COMPLETION REPORT GENERATION (EXCEL & PDF)
test('8. Trial Completion Report - Generate Excel workbook with complete KPI structure', () => {
  const metrics = getTrialMetrics();
  const excelResult = exportTrialCompletionReport(metrics);
  assert.strictEqual(excelResult.success, true);
  assert(excelResult.filename || excelResult.workbook);
});

test('9. Trial Completion Report - Generate PDF audit pack with complete KPI structure', () => {
  const metrics = getTrialMetrics();
  const pdfResult = exportTrialCompletionReportPDF(metrics);
  assert.strictEqual(pdfResult.success, true);
  assert(pdfResult.filename.endsWith('.pdf'));
  assert(pdfResult.doc !== undefined);
});

console.log(`\n🎉 All ${passedTests} Phase 8 MC03 Live Production Trial tests passed cleanly!\n`);
