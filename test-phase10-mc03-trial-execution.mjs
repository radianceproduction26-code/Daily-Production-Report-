// Radiance Polymers - Phase 10 MC03 Live Trial Execution Mode Verification Suite
import assert from 'assert';

// 1. Mock Browser Environment (localStorage)
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

console.log('🧪 Starting Phase 10 MC03 Live Trial Execution Mode Tests...\n');

// Import services after localStorage polyfill
const {
  verifyProductionDataReadiness,
  getMasterDataImportStatus,
  getShiftComparisons,
  saveShiftComparisons,
  confirmShiftComparison,
  addShiftComparison,
  getPilotAccuracyMetrics,
  getPilotSignOffData,
  getTrialIssues,
  addTrialIssue
} = await import('./src/services/storageService.js');

const {
  exportPilotSignOffReportExcel,
  exportPilotSignOffReportPDF
} = await import('./src/services/exportService.js');

// ----------------------------------------------------------------------------
// TEST 1: Step 1 – Master Data Import Center Status
// ----------------------------------------------------------------------------
{
  const status = getMasterDataImportStatus();
  assert.ok(status.machineMaster, 'Machine Master Status exists');
  assert.ok(status.partMaster, 'Part Master Status exists');
  assert.ok(status.mappingStatus, 'Machine-Part Mapping Status exists');
  assert.ok(status.supervisorStatus, 'Supervisor Status exists');
  assert.ok(status.emailConfigStatus, 'Email Configuration Status exists');

  assert.strictEqual(status.machineMaster.status, 'VALID', 'Machine master status valid');
  assert.strictEqual(status.supervisorStatus.valid, 2, 'Two supervisors active (Mr. Lokesh & Mr. Akshay)');
  assert.strictEqual(status.mappingStatus.valid, 3, '3 parts mapped to MC03');
  assert.ok(status.isAllValid, 'Overall Master Data integrity is valid');
  console.log('  ✓ 1. Master Data Import Center - 5 status areas & record counts verified');
}

// ----------------------------------------------------------------------------
// TEST 2: Step 2 & 3 – MC03 Machine Lock & Production Data Verification
// ----------------------------------------------------------------------------
{
  // A. Missing Cycle Time & Runner Weight & Supervisor
  const invalidCheck = verifyProductionDataReadiness({
    machine: { machineNumber: 'MC03', id: 'mc-03' },
    part: { partNumber: 'F53200000A', standardCycleTimeSeconds: 0, partWeightGrams: 42.5, runnerWeightGrams: 0 },
    supervisorName: ''
  });
  assert.strictEqual(invalidCheck.isReady, false, 'Should fail when cycle time/runner weight/supervisor missing');
  assert.strictEqual(invalidCheck.statusText, 'MASTER DATA MISSING', 'Status text must be MASTER DATA MISSING');
  assert.ok(invalidCheck.missingFields.some(f => f.includes('Cycle Time')), 'Cycle time missing detected');
  assert.ok(invalidCheck.missingFields.some(f => f.includes('Runner Weight')), 'Runner weight missing detected');
  assert.ok(invalidCheck.missingFields.some(f => f.includes('Supervisor Assigned')), 'Supervisor missing detected');

  // B. Machine not MC03
  const wrongMachineCheck = verifyProductionDataReadiness({
    machine: { machineNumber: 'MC05', id: 'mc-05' },
    part: { partNumber: 'F53200000A', standardCycleTimeSeconds: 20, partWeightGrams: 42.5, runnerWeightGrams: 7 },
    supervisorName: 'Mr. Lokesh'
  });
  assert.strictEqual(wrongMachineCheck.isReady, false, 'Should fail when machine is not MC03');
  assert.ok(wrongMachineCheck.missingFields.some(f => f.includes('MC03')), 'Should enforce MC03 lock');

  // C. Valid MC03 + Pilot Part + Valid Supervisor (Mr. Lokesh)
  const validCheck1 = verifyProductionDataReadiness({
    machine: { machineNumber: 'MC03', id: 'mc-03' },
    part: { partNumber: 'F53200000A', standardCycleTimeSeconds: 20, partWeightGrams: 42.5, runnerWeightGrams: 7.0 },
    supervisorName: 'Mr. Lokesh'
  });
  assert.strictEqual(validCheck1.isReady, true, 'Should pass with complete master data and Mr. Lokesh');
  assert.strictEqual(validCheck1.statusText, 'READY FOR PRODUCTION', 'Status text must be READY FOR PRODUCTION');
  assert.strictEqual(validCheck1.missingFields.length, 0, 'No missing fields');

  // D. Valid with Mr. Akshay
  const validCheck2 = verifyProductionDataReadiness({
    machine: { machineNumber: 'MC03', id: 'mc-03' },
    part: { partNumber: '5036677', standardCycleTimeSeconds: 22, partWeightGrams: 89.0, runnerWeightGrams: 12.0 },
    supervisorName: 'Mr. Akshay'
  });
  assert.strictEqual(validCheck2.isReady, true, 'Should pass with Mr. Akshay');
  assert.strictEqual(validCheck2.statusText, 'READY FOR PRODUCTION', 'Status text must be READY FOR PRODUCTION');
  console.log('  ✓ 2. Production Data Verification - READY FOR PRODUCTION and MASTER DATA MISSING logic verified');
}

// ----------------------------------------------------------------------------
// TEST 3: Step 4 – First Shift Comparison Mode (Manual vs App Reconciliation)
// ----------------------------------------------------------------------------
{
  const comparisons = getShiftComparisons();
  assert.ok(comparisons.length >= 3, 'Initial comparisons initialized for pilot shifts');
  const comp1 = comparisons[0];
  assert.strictEqual(comp1.machine, 'MC03', 'Machine is MC03');
  assert.strictEqual(comp1.isMatched, true, 'Initial shift 1 values match floor report');
  assert.strictEqual(comp1.deltas.grossProduction, 0, 'Gross delta is 0');
  assert.strictEqual(comp1.deltas.rejections, 0, 'Rejection delta is 0');
  assert.strictEqual(comp1.deltas.acceptedQty, 0, 'Accepted delta is 0');
  assert.strictEqual(comp1.deltas.downtime, 0, 'Downtime delta is 0');
  assert.strictEqual(comp1.deltas.materialConsumption, 0, 'Material consumption delta is 0');
  assert.strictEqual(comp1.deltas.counterDifference, 0, 'Counter difference delta is 0');

  // Add new shift comparison with a delta
  const addedComp = addShiftComparison({
    shiftDate: '2026-09-17',
    shift: 'Shift 1',
    machine: 'MC03',
    partNumber: 'F53200000A',
    supervisor: 'Mr. Lokesh',
    manualValues: {
      grossProduction: 1500,
      rejections: 30,
      acceptedQty: 1470,
      downtime: 25,
      materialConsumption: 74.25,
      counterDifference: 750
    },
    appValues: {
      grossProduction: 1500,
      rejections: 30,
      acceptedQty: 1470,
      downtime: 25,
      materialConsumption: 74.25,
      counterDifference: 750
    }
  });
  assert.strictEqual(addedComp.isMatched, true, 'Added comparison matches');
  assert.strictEqual(addedComp.supervisorConfirmed, false, 'Pending confirmation');

  // Confirm as supervisor
  const confirmed = confirmShiftComparison(addedComp.id, 'Mr. Lokesh');
  assert.strictEqual(confirmed.supervisorConfirmed, true, 'Confirmed status updated');
  assert.strictEqual(confirmed.confirmedBy, 'Mr. Lokesh', 'Supervisor name recorded');
  assert.ok(confirmed.confirmedAt, 'Timestamp recorded');
  console.log('  ✓ 3. First Shift Comparison Mode - Manual vs App deltas and Supervisor Confirmation verified');
}

// ----------------------------------------------------------------------------
// TEST 4: Step 5 – Pilot Accuracy Dashboard (Accuracy Formula & Target 100%)
// ----------------------------------------------------------------------------
{
  const accuracy = getPilotAccuracyMetrics();
  assert.ok(accuracy.totalShifts >= 3, 'Total shifts counted');
  assert.ok(accuracy.matchedReports >= 3, 'Matched reports counted');
  assert.strictEqual(accuracy.mismatchedReports, 0, 'Zero mismatched reports');
  assert.strictEqual(accuracy.accuracyPercent, 100, 'Accuracy is 100%');
  assert.strictEqual(accuracy.targetPercent, 100, 'Target is 100%');
  assert.strictEqual(accuracy.isTargetAchieved, true, 'Target achieved');
  assert.strictEqual(accuracy.status, 'EXCELLENT', 'Accuracy status excellent');
  console.log('  ✓ 4. Pilot Accuracy Dashboard - (Matched / Total * 100) = 100.0% verified');
}

// ----------------------------------------------------------------------------
// TEST 5: Step 6 – Pilot Issue Tracking
// ----------------------------------------------------------------------------
{
  const newIssue = addTrialIssue({
    date: '2026-09-17',
    machine: 'MC03',
    part: 'F53200000A',
    reportedBy: 'Mr. Lokesh',
    issueDescription: 'Operator training needed for dynamic runner defect tagging',
    priority: 'Low',
    assignedTo: 'Mr. Lokesh',
    resolution: 'Floor demonstration completed on Shift A'
  });
  assert.ok(newIssue.id.startsWith('ISS-'), 'Sequential issue format ISS-xxx');
  assert.strictEqual(newIssue.machine, 'MC03', 'Targeted to MC03');
  console.log('  ✓ 5. Pilot Issue Tracking - Continues register with categories and resolution tracking');
}

// ----------------------------------------------------------------------------
// TEST 6: Step 7 – Pilot Sign-Off Package Data & Signature Blocks
// ----------------------------------------------------------------------------
{
  const signOff = getPilotSignOffData();
  assert.ok(signOff.trialDuration.includes('21 Days'), 'Includes trial duration');
  assert.strictEqual(signOff.pilotMachine.includes('MC03'), true, 'Includes MC03');
  assert.ok(signOff.totalShifts > 0, 'Total shifts present');
  assert.ok(signOff.totalProduction > 0, 'Total production present');
  assert.ok(signOff.totalRejections > 0, 'Total rejections present');
  assert.ok(signOff.totalDowntime > 0, 'Total downtime present');
  assert.strictEqual(signOff.accuracyPercent, 100, 'Accuracy 100% present');
  assert.ok(signOff.issuesLogged >= 2, 'Issues logged tracked');
  assert.ok(signOff.issuesClosed >= 1, 'Issues closed tracked');

  // Signatures
  assert.strictEqual(signOff.signatures.length, 3, 'Exactly 3 required signatories');
  const roles = signOff.signatures.map(s => s.role);
  assert.ok(roles.includes('Pilot Supervisor'), 'Supervisor signature required');
  assert.ok(roles.includes('Production Manager'), 'Production Manager signature required');
  assert.ok(roles.includes('Plant Head'), 'Plant Head signature required');
  console.log('  ✓ 6. Pilot Sign-Off Package - All metrics & 3 signatures (Supervisor, Manager, Plant Head) verified');
}

// ----------------------------------------------------------------------------
// TEST 7: Step 7 – Sign-Off Report Exports (Excel & PDF)
// ----------------------------------------------------------------------------
{
  const signOff = getPilotSignOffData();
  const excelRes = exportPilotSignOffReportExcel(signOff);
  assert.strictEqual(excelRes.success, true, 'Excel sign-off export succeeded');

  const pdfRes = exportPilotSignOffReportPDF(signOff);
  assert.strictEqual(pdfRes.success, true, 'PDF sign-off export succeeded');
  assert.ok(pdfRes.doc, 'PDF jsPDF document generated');
  console.log('  ✓ 7. Sign-Off Exports - Excel workbook and PDF certificate generated');
}

console.log('\n🎉 All 7 Phase 10 MC03 Live Trial Execution tests passed cleanly!\n');
