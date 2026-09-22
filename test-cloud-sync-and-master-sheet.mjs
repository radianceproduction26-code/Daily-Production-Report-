// Polyfill localStorage for Node test runner
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import assert from 'assert';
import { summarizeReportForMasterSync } from './src/services/cloudSyncService.js';
import { exportConsolidatedMasterSheetToExcel } from './src/services/exportService.js';

console.log('\n🚀 Starting Cloud Sync & Laptop Master Sheet Test Suite...\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// Mock sample shift report with multiple sessions & hourly entries
const mockReport = {
  id: 'rep-test-001',
  reportDate: '2026-09-22',
  shift: 'Shift 1',
  machineNumber: 'MC03',
  machineName: 'Milacron 450T',
  operatorName: 'Shreyank',
  supervisorName: 'Mr. Lokesh',
  status: 'submitted',
  submittedAt: '2026-09-22T16:05:00.000Z',
  approvedAt: null,
  mouldSessions: [
    {
      id: 'sess-1',
      partNumber: 'F53200000A',
      partName: 'Main Housing Cover',
      standardCycleTimeSeconds: 20,
      cavityCount: 2,
      entries: [
        {
          hourIndex: 1,
          theoreticalTarget: 360,
          productionQty: 350,
          acceptedQty: 345,
          rejectionQty: 5,
          downtimeMinutes: 0
        },
        {
          hourIndex: 2,
          theoreticalTarget: 360,
          productionQty: 340,
          acceptedQty: 330,
          rejectionQty: 10,
          downtimeMinutes: 5
        }
      ]
    },
    {
      id: 'sess-2',
      partNumber: 'F53200001B',
      partName: 'Front Bezel Plate',
      standardCycleTimeSeconds: 25,
      cavityCount: 1,
      entries: [
        {
          hourIndex: 3,
          theoreticalTarget: 144,
          productionQty: 140,
          acceptedQty: 138,
          rejectionQty: 2,
          downtimeMinutes: 0
        }
      ]
    }
  ]
};

// 1. Test summarizeReportForMasterSync
test('summarizeReportForMasterSync correctly computes production totals and rejection rates', () => {
  const syncRow = summarizeReportForMasterSync(mockReport);
  assert.strictEqual(syncRow.id, 'rep-test-001');
  assert.strictEqual(syncRow.report_date, '2026-09-22');
  assert.strictEqual(syncRow.shift, 'Shift 1');
  assert.strictEqual(syncRow.machine_number, 'MC03');
  assert.strictEqual(syncRow.operator_name, 'Shreyank');
  assert.strictEqual(syncRow.part_number, 'F53200000A');

  // Total Target: 360 + 360 + 144 = 864
  assert.strictEqual(syncRow.target_qty, 864);
  // Total Prod: 350 + 340 + 140 = 830
  assert.strictEqual(syncRow.production_qty, 830);
  // Total Accepted: 345 + 330 + 138 = 813
  assert.strictEqual(syncRow.accepted_qty, 813);
  // Total Rejections: 5 + 10 + 2 = 17
  assert.strictEqual(syncRow.rejection_qty, 17);
  // Total Downtime: 0 + 5 + 0 = 5
  assert.strictEqual(syncRow.downtime_minutes, 5);

  // Rejection rate = (17 / 830) * 100 = 2.05%
  assert.strictEqual(syncRow.rejection_rate, 2.05);

  // Efficiency = (830 / 864) * 100 = 96.06%
  assert.strictEqual(syncRow.efficiency_percent, 96.06);

  assert.strictEqual(syncRow.status, 'submitted');
  assert.ok(syncRow.full_data, 'full_data must contain the raw report object');
});

// 2. Test master sheet multi-report Excel generation
test('exportConsolidatedMasterSheetToExcel generates a valid master workbook structure', () => {
  const reportsList = [mockReport, {
    ...mockReport,
    id: 'rep-test-002',
    shift: 'Shift 2',
    operatorName: 'Dheera',
    status: 'approved'
  }];

  const res = exportConsolidatedMasterSheetToExcel(reportsList, 'Radiance Polymers - Test Master Sheet');
  assert.strictEqual(res.success, true);
  assert.ok(res.filename.includes('Radiance_Production_Master_Ledger_'));
});

// 3. Test empty reports handling
test('exportConsolidatedMasterSheetToExcel gracefully handles empty reports list', () => {
  const res = exportConsolidatedMasterSheetToExcel([]);
  assert.strictEqual(res.success, false);
});

console.log(`\nResults: ${passCount} passed, ${failCount} failed.\n`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Cloud Sync and Master Sheet tests passed successfully!\n');
}
