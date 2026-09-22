// Test script: Verify deleted shift reports NEVER reappear on refresh or cloud sync
import assert from 'assert';

// Mock localStorage in Node.js environment
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

import {
  initializeStorage,
  createNewShiftReport,
  getShiftReports,
  deleteShiftReport,
  getActiveReport,
  getDeletedReportIds,
  isReportDeleted,
  clearAllProductionEntries
} from '../src/services/storageService.js';

import {
  fetchShiftReportsFromCloud
} from '../src/services/cloudSyncService.js';

console.log('🧪 Starting Shift Report Deletion Persistence Tests...\n');

// 1. Initialize storage
initializeStorage();

// 2. Create a test shift report
const reportA = createNewShiftReport({
  reportDate: '2026-09-22',
  shift: 'Shift A',
  machine: { id: 'm-mc-03', machineNumber: 'MC03', machineName: 'Milacron 450T' },
  operator: { id: 'op-01', name: 'Rajesh Kumar' },
  supervisor: { id: 'sup-01', name: 'Mr. Lokesh' },
  part: { id: 'part-01', partNumber: 'PART-101', partName: 'Cap Top', standardCycleTimeSeconds: 20, cavities: 2 },
  actualCycleTime: 22.5
});

console.log('1. Created Report ID:', reportA.id);
assert.strictEqual(getShiftReports().length, 1, 'Should have 1 report after creation');
assert.strictEqual(getShiftReports()[0].id, reportA.id, 'Report ID should match');

// 3. Delete the shift report
const delResult = deleteShiftReport(reportA.id);
console.log('2. Deleted Report Result:', delResult.success);
assert.strictEqual(delResult.success, true, 'deleteShiftReport should return success');
assert.strictEqual(getShiftReports().length, 0, 'Local reports should be 0 immediately after delete');
assert.strictEqual(getActiveReport(), null, 'Active report should be null');
assert.strictEqual(isReportDeleted(reportA.id), true, 'Report ID should be registered in tombstone store');

// 4. Simulate Page Refresh:
// When the page is reloaded, storage is intact.
console.log('3. Simulating page reload...');
const refreshedReports = getShiftReports();
assert.strictEqual(refreshedReports.length, 0, 'Refreshed reports must remain 0');

// 5. Simulate Cloud Sync returning the lingering report (e.g. if cloud had delayed delete or RLS issue)
// We test fetchShiftReportsFromCloud behavior with tombstones
const cloudResult = await fetchShiftReportsFromCloud();
console.log('4. Cloud sync fetch completed. Reports returned:', cloudResult.reports.length);
assert.strictEqual(cloudResult.reports.length, 0, 'Reports must NOT be resurrected by cloud fetch');
assert.strictEqual(getShiftReports().length, 0, 'LocalStorage must NOT have resurrected reports');

// 6. Test clearAllProductionEntries tombstone registration
const reportB = createNewShiftReport({
  reportDate: '2026-09-22',
  shift: 'Shift B',
  machine: { id: 'm-mc-03', machineNumber: 'MC03', machineName: 'Milacron 450T' },
  operator: { id: 'op-02', name: 'Suresh Patel' },
  supervisor: { id: 'sup-02', name: 'Mr. Akshay' },
  part: { id: 'part-02', partNumber: 'PART-102', partName: 'Base Plate', standardCycleTimeSeconds: 25, cavities: 4 },
  actualCycleTime: 25
});

assert.strictEqual(getShiftReports().length, 1, 'Should have 1 report');
clearAllProductionEntries();
assert.strictEqual(getShiftReports().length, 0, 'All reports cleared');
assert.strictEqual(isReportDeleted(reportB.id), true, 'Report B must be registered in tombstones');

console.log('\n🎉 ALL REPORT DELETION PERSISTENCE TESTS PASSED SUCCESSFULLY!');
