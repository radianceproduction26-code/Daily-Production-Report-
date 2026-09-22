// Test Suite: Daily Production Summary Email
import {
  calculateReportSummaryMetrics,
  generateDailySummaryEmailPayload,
  sendDailyProductionSummaryEmail
} from './src/services/exportService.js';
import { createDemoShiftReport } from './src/services/storageService.js';

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

console.log('=== TEST SUITE: DAILY PRODUCTION SUMMARY EMAIL ===\n');

// Mock localStorage if in node environment
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// 1. Generate realistic report for MC03
const demoReport = createDemoShiftReport();

console.log('1. Testing Report Summary Metrics Calculation:');
const metrics = calculateReportSummaryMetrics(demoReport);

assert(metrics !== null, 'Summary metrics calculated');
assert(metrics.machineNumber === 'MC03', `Machine is MC03 (got: ${metrics.machineNumber})`);
assert(metrics.partNumber === 'F53200000A', `Part Number is F53200000A (got: ${metrics.partNumber})`);
assert(Boolean(metrics.operatorName), `Operator Name present: ${metrics.operatorName}`);
assert(metrics.supervisorName === 'Mr. Lokesh', `Supervisor Name is Mr. Lokesh (got: ${metrics.supervisorName})`);
assert(metrics.grossProduction > 0, `Gross Production > 0 (${metrics.grossProduction} pcs)`);
assert(metrics.rejections > 0, `Rejections > 0 (${metrics.rejections} pcs)`);
assert(metrics.acceptedQuantity === (metrics.grossProduction - metrics.rejections), `Accepted Quantity = Gross - Rejections (${metrics.acceptedQuantity} pcs)`);
assert(metrics.downtimeMinutes >= 0, `Downtime Minutes >= 0 (${metrics.downtimeMinutes} min)`);
assert(metrics.materialConsumptionKg > 0, `Material Consumption computed (${metrics.materialConsumptionKg} kg)`);
assert(Boolean(metrics.approvalStatus), `Approval Status present (${metrics.approvalStatus})`);

console.log('\n2. Testing Email Payload & Attachments Generation:');
const customRecipients = ['planthead@radiancepolymers.com', 'quality@radiancepolymers.com', 'lokesh@radiancepolymers.com'];
const payload = generateDailySummaryEmailPayload(demoReport, customRecipients);

assert(payload.subject.includes('MC03'), 'Subject line specifies Machine MC03');
assert(payload.subject.includes('DAILY PRODUCTION SUMMARY'), 'Subject line specifies DAILY PRODUCTION SUMMARY');
assert(payload.recipients.length === 3, 'Configured 3 custom recipients');
assert(payload.recipients.includes('planthead@radiancepolymers.com'), 'Contains planthead email');
assert(payload.textBody.includes('Machine:            MC03'), 'Body contains Machine MC03');
assert(payload.textBody.includes('Part Number:        F53200000A'), 'Body contains Part Number F53200000A');
assert(payload.textBody.includes('Operator Name:'), 'Body contains Operator Name');
assert(payload.textBody.includes('Supervisor Name:    Mr. Lokesh'), 'Body contains Supervisor Name Mr. Lokesh');
assert(payload.textBody.includes('Gross Production:'), 'Body contains Gross Production');
assert(payload.textBody.includes('Rejections:'), 'Body contains Rejections');
assert(payload.textBody.includes('Accepted Quantity:'), 'Body contains Accepted Quantity');
assert(payload.textBody.includes('Downtime Minutes:'), 'Body contains Downtime Minutes');
assert(payload.textBody.includes('Material Consumption:'), 'Body contains Material Consumption');
assert(payload.textBody.includes('Approval Status:'), 'Body contains Approval Status');

// Attachments check
assert(payload.attachments.length === 2, '2 attachments present (Excel + PDF)');
const hasExcel = payload.attachments.some(a => a.filename.endsWith('.xlsx'));
const hasPdf = payload.attachments.some(a => a.filename.endsWith('.pdf'));
assert(hasExcel === true, 'Excel report (.xlsx) attached');
assert(hasPdf === true, 'PDF report (.pdf) attached');

console.log('\n3. Testing Automated Dispatch & Queue Persistence:');
sendDailyProductionSummaryEmail(demoReport, customRecipients).then((result) => {
  assert(result.success === true, 'Email dispatch promise succeeded');
  assert(result.dispatchId.startsWith('disp-'), 'Unique dispatch ID generated');
  assert(result.attachments.length === 2, 'Result returned both attachments');

  const loggedEmails = JSON.parse(localStorage.getItem('rp_email_dispatches_v1') || '[]');
  assert(loggedEmails.length > 0, 'Email dispatch recorded in permanent local storage');
  assert(loggedEmails[0].machine === 'MC03', 'Stored dispatch record targets MC03');
  assert(loggedEmails[0].partNumber === 'F53200000A', 'Stored dispatch record contains Part Number F53200000A');
  assert(loggedEmails[0].status === 'SENT', 'Stored dispatch status is SENT');

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('ALL DAILY PRODUCTION SUMMARY EMAIL TESTS PASSED!');
  }
});
