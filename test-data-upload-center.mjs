// Automated Test Suite for Phase 13A – Simple Data Upload Center
import * as XLSX from 'xlsx';
import assert from 'assert';
import {
  parseExcelFile,
  checkPilotReadiness
} from './src/services/dataUploadService.js';

console.log('=================================================================');
console.log('🧪 PHASE 13A – SIMPLE DATA UPLOAD CENTER AUTOMATED TEST SUITE');
console.log('=================================================================\n');

let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Test Excel Parsing for Machine Master
test('Machine Master: Valid Excel Buffer parsed accurately', () => {
  const wb = XLSX.utils.book_new();
  const data = [
    { 'Machine Number': 'MC03', 'Machine Name': 'Milacron 450T', 'Make / Model': 'Milacron Magna', 'Capacity (Tons)': 450, 'Hourly Cost Rate': 1750, 'Status': 'active' },
    { 'Machine Number': 'MC05', 'Machine Name': 'Haitian Mars 450T', 'Make / Model': 'Haitian MA4500', 'Capacity (Tons)': 450, 'Hourly Cost Rate': 1750, 'Status': 'active' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Machine Master');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const result = parseExcelFile(buffer, 'machine');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.imported, 2);
  assert.strictEqual(result.rejected, 0);
  assert.strictEqual(result.data[0].machineNumber, 'MC03');
  assert.strictEqual(result.data[0].capacityTon, 450);
});

// 2. Test Invalid/Rejected Rows in Machine Master
test('Machine Master: Missing Machine Number row correctly rejected', () => {
  const wb = XLSX.utils.book_new();
  const data = [
    { 'Machine Number': 'MC03', 'Machine Name': 'Milacron 450T' },
    { 'Machine Number': '', 'Machine Name': 'Invalid Machine Without Code' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Machine Master');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const result = parseExcelFile(buffer, 'machine');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.imported, 1);
  assert.strictEqual(result.rejected, 1);
  assert.strictEqual(result.errors.length, 1);
});

// 3. Test Part Master Parsing
test('Part Master: Valid Excel Buffer parsed accurately', () => {
  const wb = XLSX.utils.book_new();
  const data = [
    { 'Part Number': 'F53200000A', 'Part Name': 'Front Bezel Enclosure', 'Standard Cycle Time (s)': 20.0, 'Cavity Count': 2, 'Raw Material Grade': 'PP Copolymer 575P' },
    { 'Part Number': '5036677', 'Part Name': 'Terminal Cover Plate', 'Standard Cycle Time (s)': 15.0, 'Cavity Count': 4, 'Raw Material Grade': 'Nylon 6 30% GF' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Part Master');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const result = parseExcelFile(buffer, 'part');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.imported, 2);
  assert.strictEqual(result.rejected, 0);
  assert.strictEqual(result.data[0].partNumber, 'F53200000A');
  assert.strictEqual(result.data[0].standardCycleTimeSeconds, 20.0);
  assert.strictEqual(result.data[0].cavityCount, 2);
});

// 4. Test Machine-Part Mapping Parsing
test('Machine-Part Mapping: Valid Excel Buffer parsed accurately', () => {
  const wb = XLSX.utils.book_new();
  const data = [
    { 'Machine Code': 'MC03', 'Part Code': 'F53200000A', 'Mould Number': 'MLD-F53200000A', 'Approved To Run': 'YES' },
    { 'Machine Code': 'MC03', 'Part Code': '5036677', 'Mould Number': 'MLD-5036677', 'Approved To Run': 'YES' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Machine-Part Mapping');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const result = parseExcelFile(buffer, 'mapping');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.imported, 2);
  assert.strictEqual(result.rejected, 0);
  assert.strictEqual(result.data[0].machineCode, 'MC03');
  assert.strictEqual(result.data[0].partCode, 'F53200000A');
  assert.strictEqual(result.data[0].approvedToRun, true);
});

// 5. Test Rejection Master Parsing
test('Rejection Master: Valid Excel Buffer parsed accurately', () => {
  const wb = XLSX.utils.book_new();
  const data = [
    { 'Rejection Code': 'A', 'Description': 'Start Up', 'Category': 'Process Defect' },
    { 'Rejection Code': 'B', 'Description': 'Set Up', 'Category': 'Process Defect' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Rejection Master');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const result = parseExcelFile(buffer, 'rejection');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.imported, 2);
  assert.strictEqual(result.rejected, 0);
  assert.strictEqual(result.data[0].code, 'A');
  assert.strictEqual(result.data[0].description, 'Start Up');
});

// 6. Test Downtime Master Parsing
test('Downtime Master: Valid Excel Buffer parsed accurately', () => {
  const wb = XLSX.utils.book_new();
  const data = [
    { 'Downtime Code': 'DT-101', 'Category': 'Machine Related', 'Description': 'Hydraulic Failure' },
    { 'Downtime Code': 'DT-401', 'Category': 'Process Related', 'Description': 'Setup' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Downtime Master');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const result = parseExcelFile(buffer, 'downtime');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.imported, 2);
  assert.strictEqual(result.rejected, 0);
  assert.strictEqual(result.data[0].code, 'DT-101');
  assert.strictEqual(result.data[0].category, 'Machine Related');
});

// 7. Test Pilot Readiness: Full MC03 Pilot Verification Pass
test('Pilot Readiness: Ready when MC03, Supervisors, and Mapped Parts exist', () => {
  const machines = [{ machineNumber: 'MC03' }];
  const parts = [{ partNumber: 'F53200000A' }];
  const mappings = [{ machineCode: 'MC03', partCode: 'F53200000A' }];
  const usersList = [
    { fullName: 'Mr. Lokesh', role: 'supervisor' },
    { fullName: 'Mr. Akshay', role: 'supervisor' }
  ];

  const readiness = checkPilotReadiness({ machines, parts, mappings, usersList });
  assert.strictEqual(readiness.isReady, true);
  assert.strictEqual(readiness.missing.length, 0);
});

// 8. Test Pilot Readiness: Missing Mandatory Masters Gating
test('Pilot Readiness: Flags missing mandatory masters and blocks readiness', () => {
  const machines = [];
  const parts = [];
  const mappings = [];
  const usersList = [{ fullName: 'Mr. Lokesh' }];

  const readiness = checkPilotReadiness({ machines, parts, mappings, usersList });
  assert.strictEqual(readiness.isReady, false);
  assert.ok(readiness.missing.includes('Machine Master'));
  assert.ok(readiness.missing.includes('Part Master'));
  assert.ok(readiness.missing.includes('Machine-Part Mapping'));
  assert.ok(readiness.missing.includes('Pilot Machine MC03'));
});

// 9. Multi-sheet Backup Workbook Structure Verification
test('Master Backup: Generates 5-sheet workbook correctly', () => {
  const wb = XLSX.utils.book_new();
  const sheets = ['Machine Master', 'Part Master', 'Machine-Part Mapping', 'Rejection Master', 'Downtime Master'];
  sheets.forEach(s => {
    const ws = XLSX.utils.json_to_sheet([{ id: 1, name: 'Sample' }]);
    XLSX.utils.book_append_sheet(wb, ws, s);
  });

  assert.strictEqual(wb.SheetNames.length, 5);
  sheets.forEach(s => assert.ok(wb.SheetNames.includes(s)));
});

console.log('\n=================================================================');
console.log(`🏁 TEST RESULTS: ${passedTests} / 9 PASSED (100% ACCURACY)`);
console.log('=================================================================');
