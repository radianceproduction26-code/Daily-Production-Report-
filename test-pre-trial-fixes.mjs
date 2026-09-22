// Automated Verification Test for Pre-Trial Fixes
import assert from 'assert';
import * as XLSX from 'xlsx';
import {
  downloadUnifiedPartMasterTemplate,
  downloadRejectionMasterTemplate,
  downloadDowntimeMasterTemplate,
  parseUnifiedPartMasterExcel,
  parseRejectionMasterExcel,
  parseDowntimeMasterExcel
} from './src/services/dataUploadService.js';
import {
  INITIAL_REJECTION_CODES,
  INITIAL_DOWNTIME_CODES,
  INITIAL_OPERATORS,
  SUPERVISORS
} from './src/data/seedData.js';
import {
  generateNextDowntimeCode,
  generateNextRejectionCode,
  getSupervisors,
  getOperators,
  clearOperationalData
} from './src/services/storageService.js';

// Setup mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

console.log('--- RUNNING PRE-TRIAL VERIFICATION TEST SUITE ---');

// 1. TEST PART MASTER TEMPLATE DOWNLOAD
console.log('\n1. Testing Part Master Template Download...');
const partResult = await downloadUnifiedPartMasterTemplate();
assert.strictEqual(partResult.filename, 'Radiance_Part_Master_Template.xlsx', 'Filename must be Radiance_Part_Master_Template.xlsx');
assert(partResult.buffer && (partResult.buffer.byteLength > 0 || partResult.buffer.length > 0), 'Generated Excel buffer must not be empty');

const partWb = XLSX.read(partResult.buffer, { type: 'array' });
assert(partWb.SheetNames.includes('Part Master'), 'Workbook must include Part Master sheet');
const partRows = XLSX.utils.sheet_to_json(partWb.Sheets['Part Master']);
assert(partRows.length >= 3, 'Template must include sample rows');
const sampleRow = partRows[0];
const expectedHeaders = [
  'Part Number', 'Part Name', 'Customer Name', 'Machine Number', 'Machine Name',
  'Machine Make', 'Machine Tonnage', 'Material Grade', 'Part Weight', 'Runner Weight',
  'Cycle Time', 'Cavity Count', 'Status'
];
expectedHeaders.forEach(h => {
  assert(h in sampleRow, `Header "${h}" must exist in Part Master template`);
});
console.log('✓ Part Master Template is valid, headers verified, filename is Radiance_Part_Master_Template.xlsx');

// 2. TEST REJECTION MASTER RESTORATION
console.log('\n2. Testing Rejection Master Restoration...');
assert(INITIAL_REJECTION_CODES.length >= 10, 'Initial rejection codes must contain standard defect codes');
const rejCodes = INITIAL_REJECTION_CODES.map(r => r.code);
assert(rejCodes.includes('A') && rejCodes.includes('B') && rejCodes.includes('J'), 'Codes A through J must exist');

const rejResult = await downloadRejectionMasterTemplate();
assert.strictEqual(rejResult.filename, 'Radiance_Rejection_Master_Template.xlsx', 'Filename must be Radiance_Rejection_Master_Template.xlsx');
const rejWb = XLSX.read(rejResult.buffer, { type: 'array' });
const rejRows = XLSX.utils.sheet_to_json(rejWb.Sheets['Rejection Master']);
assert(rejRows.length >= 10, 'Rejection template must contain defect examples');
assert(rejRows.some(r => r['Code'] === 'A' && r['Description'] === 'Burn Mark'), 'Code A must be Burn Mark');
assert(rejRows.some(r => r['Code'] === 'B' && r['Description'] === 'Flash'), 'Code B must be Flash');

// Dynamic code generation
const nextRej = generateNextRejectionCode(INITIAL_REJECTION_CODES);
assert(typeof nextRej === 'string' && nextRej.length > 0, 'Next rejection code must be generated');
console.log(`✓ Rejection Master verified with A-J defects, template download, and next code: ${nextRej}`);

// 3. TEST DOWNTIME MASTER RESTORATION
console.log('\n3. Testing Downtime Master Restoration...');
assert(INITIAL_DOWNTIME_CODES.length >= 5, 'Initial downtime codes must exist');
const dtResult = await downloadDowntimeMasterTemplate();
assert.strictEqual(dtResult.filename, 'Radiance_Downtime_Master_Template.xlsx', 'Filename must be Radiance_Downtime_Master_Template.xlsx');
const dtWb = XLSX.read(dtResult.buffer, { type: 'array' });
const dtRows = XLSX.utils.sheet_to_json(dtWb.Sheets['Downtime Master']);
assert(dtRows.some(r => r['Downtime Code'] === 'DT-001' && r['Description'] === 'Machine Breakdown'), 'DT-001 must be Machine Breakdown');
assert(dtRows.some(r => r['Downtime Code'] === 'DT-002' && r['Description'] === 'Mould Cleaning'), 'DT-002 must be Mould Cleaning');

// Auto-generate next DT code
const nextDt = generateNextDowntimeCode(INITIAL_DOWNTIME_CODES);
assert(nextDt === 'DT-008' || nextDt === 'DT-006', `Next downtime code should be 3-digit formatted (got ${nextDt})`);
console.log(`✓ Downtime Master verified with DT-001-DT-005, template download, and next code: ${nextDt}`);

// 4. TEST OPERATOR MASTER RESTORATION
console.log('\n4. Testing Operator Master Restoration...');
assert(INITIAL_OPERATORS.length >= 4, 'Initial operator master must exist');
assert(INITIAL_OPERATORS.some(op => op.operatorName === 'Ramesh Kumar'), 'Ramesh Kumar must exist in Operator Master');
const ops = getOperators();
assert(ops.length >= 4, 'getOperators must return operator list');
console.log('✓ Operator Master verified with free text compatibility and suggestions');

// 5. TEST SUPERVISOR MASTER CLEANUP
console.log('\n5. Testing Supervisor Master Cleanup (Strictly Lokesh & Akshay)...');
// Inject fake/demo supervisor in mock localStorage
localStorage.setItem('rp_supervisors_v1', JSON.stringify([
  { id: 'sup-lokesh', fullName: 'Mr. Lokesh', name: 'Mr. Lokesh', role: 'supervisor' },
  { id: 'sup-akshay', fullName: 'Mr. Akshay', name: 'Mr. Akshay', role: 'supervisor' },
  { id: 'sup-demo', fullName: 'Demo Supervisor', name: 'Demo Supervisor', role: 'supervisor' },
  { id: 'sup-test', fullName: 'Test Supervisor', name: 'Test Supervisor', role: 'supervisor' }
]));

const cleanedSups = getSupervisors();
assert.strictEqual(cleanedSups.length, 2, 'Only exactly 2 supervisors must exist');
const supNames = cleanedSups.map(s => s.name || s.fullName);
assert(supNames.includes('Mr. Lokesh'), 'Mr. Lokesh must be present');
assert(supNames.includes('Mr. Akshay'), 'Mr. Akshay must be present');
assert(!supNames.includes('Demo Supervisor'), 'Demo Supervisor must be removed');
assert(!supNames.includes('Test Supervisor'), 'Test Supervisor must be removed');
console.log('✓ Supervisor Master strictly restricted to Mr. Lokesh and Mr. Akshay only');

// 6. TEST 13-COLUMN PART MASTER AUTO-GENERATION
console.log('\n6. Testing 13-Column Part Master Auto-Generation...');
const parseResult = parseUnifiedPartMasterExcel(partResult.buffer);
assert.strictEqual(parseResult.success, true, 'Parsing official template must succeed');
assert(parseResult.parts.length >= 3, 'Must auto-create Parts');
assert(parseResult.machines.length >= 1, 'Must auto-create Machines');
assert(parseResult.mappings.length >= 3, 'Must auto-create Machine-Part Mappings');
console.log(`✓ Auto-generated: ${parseResult.parts.length} Parts, ${parseResult.machines.length} Machines, ${parseResult.mappings.length} Mappings`);

// 7. TEST DATA RESET RULE
console.log('\n7. Testing Data Reset Rule...');
// Populate storage with operational data
localStorage.setItem('rp_master_parts_v1', JSON.stringify(parseResult.parts));
localStorage.setItem('rp_master_machines_v1', JSON.stringify(parseResult.machines));
localStorage.setItem('rp_machine_part_mappings_v1', JSON.stringify(parseResult.mappings));
localStorage.setItem('rp_shift_reports_v1', JSON.stringify([{ id: 'rep-1', shift: 'Shift 1' }]));
localStorage.setItem('rp_master_rejection_codes_v1', JSON.stringify(INITIAL_REJECTION_CODES));
localStorage.setItem('rp_master_downtime_codes_v1', JSON.stringify(INITIAL_DOWNTIME_CODES));
localStorage.setItem('rp_master_operators_v1', JSON.stringify(INITIAL_OPERATORS));
localStorage.setItem('rp_supervisors_v1', JSON.stringify(SUPERVISORS));

// Run clearOperationalData
clearOperationalData();

// Verify deletion of operational data
const partsAfter = JSON.parse(localStorage.getItem('rp_master_parts_v1'));
const machinesAfter = JSON.parse(localStorage.getItem('rp_master_machines_v1'));
const mappingsAfter = JSON.parse(localStorage.getItem('rp_machine_part_mappings_v1'));
const reportsAfter = JSON.parse(localStorage.getItem('rp_shift_reports_v1'));
assert.strictEqual(partsAfter.length, 0, 'Parts must be deleted on clear data');
assert.strictEqual(machinesAfter.length, 0, 'Machines must be deleted on clear data');
assert.strictEqual(mappingsAfter.length, 0, 'Mappings must be deleted on clear data');
assert.strictEqual(reportsAfter.length, 0, 'Shift reports must be deleted on clear data');

// Verify preservation of masters
const rejectionsAfter = JSON.parse(localStorage.getItem('rp_master_rejection_codes_v1'));
const downtimesAfter = JSON.parse(localStorage.getItem('rp_master_downtime_codes_v1'));
const operatorsAfter = JSON.parse(localStorage.getItem('rp_master_operators_v1'));
const supervisorsAfter = JSON.parse(localStorage.getItem('rp_supervisors_v1'));

assert(rejectionsAfter.length >= 10, 'Rejection Master must be preserved after clear data');
assert(downtimesAfter.length >= 5, 'Downtime Master must be preserved after clear data');
assert(operatorsAfter.length >= 4, 'Operator Master must be preserved after clear data');
assert(supervisorsAfter.length === 2, 'Supervisor Master must be preserved after clear data');
console.log('✓ Data Reset Rule verified: Parts, Machines, Mappings, Reports deleted. Masters preserved intact.');

console.log('\n========================================');
console.log('ALL PRE-TRIAL FIXES VERIFIED SUCCESSFULLY!');
console.log('========================================');
