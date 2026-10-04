import assert from 'assert';

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

import {
  normalizeMachineCode,
  getMachines,
  saveMachines,
  getMachinePartMappings,
  saveMachinePartMappings,
  saveUnifiedMasterData,
  getParts
} from '../src/services/storageService.js';

import { parseUnifiedPartMasterExcel } from '../src/services/dataUploadService.js';
import * as XLSX from 'xlsx';

console.log('🧪 Starting Machine Fleet and Part Master Verification Suite...\n');

// 1. Test normalizeMachineCode
console.log('Test 1: normalizeMachineCode variants');
assert.strictEqual(normalizeMachineCode('3'), 'MC03');
assert.strictEqual(normalizeMachineCode('4'), 'MC04');
assert.strictEqual(normalizeMachineCode('5'), 'MC05');
assert.strictEqual(normalizeMachineCode('6'), 'MC06');
assert.strictEqual(normalizeMachineCode('mc04'), 'MC04');
assert.strictEqual(normalizeMachineCode('MC 04'), 'MC04');
assert.strictEqual(normalizeMachineCode('MC-05'), 'MC05');
assert.strictEqual(normalizeMachineCode('Machine 4'), 'MC04');
assert.strictEqual(normalizeMachineCode('LINE 6'), 'MC06');
assert.strictEqual(normalizeMachineCode('MC03'), 'MC03');
assert.strictEqual(normalizeMachineCode('MC04'), 'MC04');
assert.strictEqual(normalizeMachineCode('MC05'), 'MC05');
assert.strictEqual(normalizeMachineCode('MC06'), 'MC06');
console.log('  ✓ normalizeMachineCode correctly maps all 3-6 representations to MC03-MC06\n');

// 2. Test getMachines() returns strictly 4 machines
console.log('Test 2: getMachines() strictly returns 4 machines (MC03-MC06)');
localStorage.clear();
// Simulate dirty localStorage with legacy 4, 5, 6
localStorage.setItem('rp_machines_v1', JSON.stringify([
  { machineNumber: 'MC03', machineName: 'Milacron 450T' },
  { machineNumber: 'MC04', machineName: 'Milacron 350T' },
  { machineNumber: 'MC05', machineName: 'Milacron 250T' },
  { machineNumber: 'MC06', machineName: 'Milacron 180T' },
  { machineNumber: '4', machineName: '4 Injection Press' },
  { machineNumber: '5', machineName: '5 Injection Press' },
  { machineNumber: '6', machineName: '6 Injection Press' }
]));

const machines = getMachines();
assert.strictEqual(machines.length, 4, 'Exactly 4 machines returned');
assert.deepStrictEqual(machines.map(m => m.machineNumber), ['MC03', 'MC04', 'MC05', 'MC06']);
console.log('  ✓ Dirty storage with duplicate 4, 5, 6 cleaned up to strictly MC03-MC06\n');

// 3. Test getMachinePartMappings() has 0 parts for MC03 and normalizes 4, 5, 6
console.log('Test 3: getMachinePartMappings() has 0 parts for MC03 and adds new parts on MC04, MC05, MC06');
localStorage.clear();

// User added new parts for machine no 4, 5, 6 (some with '4', '5', '6' codes)
const newMappings = [
  { machineCode: '4', partCode: 'NEW-PART-MC04-A', approvedToRun: true },
  { machineCode: 'MC05', partCode: 'NEW-PART-MC05-B', approvedToRun: true },
  { machineCode: '6', partCode: 'NEW-PART-MC06-C', approvedToRun: true }
];

saveMachinePartMappings(newMappings);

const activeMappings = getMachinePartMappings();

// Check MC03 has 0 parts
const mc03Parts = activeMappings.filter(m => m.machineCode === 'MC03').map(m => m.partCode);
assert.strictEqual(mc03Parts.length, 0, 'MC03 has strictly 0 parts');

// Check MC04 has the new part normalized
const mc04Parts = activeMappings.filter(m => m.machineCode === 'MC04').map(m => m.partCode);
assert(mc04Parts.includes('NEW-PART-MC04-A'), 'MC04 includes NEW-PART-MC04-A');

// Check MC05 has the new part
const mc05Parts = activeMappings.filter(m => m.machineCode === 'MC05').map(m => m.partCode);
assert(mc05Parts.includes('NEW-PART-MC05-B'), 'MC05 includes NEW-PART-MC05-B');

// Check MC06 has the new part normalized
const mc06Parts = activeMappings.filter(m => m.machineCode === 'MC06').map(m => m.partCode);
assert(mc06Parts.includes('NEW-PART-MC06-C'), 'MC06 includes NEW-PART-MC06-C');

// Check NO mappings exist with machineCode '4', '5', or '6'
const rawMachineCodes = activeMappings.map(m => m.machineCode);
assert(!rawMachineCodes.includes('4'), 'No raw machineCode 4');
assert(!rawMachineCodes.includes('5'), 'No raw machineCode 5');
assert(!rawMachineCodes.includes('6'), 'No raw machineCode 6');

console.log('  ✓ MC03 has 0 mapped parts');
console.log('  ✓ New parts for 4, 5, 6 correctly mapped to MC04, MC05, MC06\n');

// 4. Test Excel Parsing with machine numbers 4, 5, 6
console.log('Test 4: parseUnifiedPartMasterExcel with Machine Number 4, 5, 6');
const testExcelRows = [
  {
    'Part Number': 'PART-A4',
    'Part Name': 'Housing Bracket 4',
    'Customer Name': 'Bajaj Auto',
    'Machine Number': '4',
    'Cycle Time': 18.5,
    'Cavity Count': 2,
    'Status': 'active'
  },
  {
    'Part Number': 'PART-B5',
    'Part Name': 'Base Cover 5',
    'Customer Name': 'Mahindra',
    'Machine Number': '5',
    'Cycle Time': 22.0,
    'Cavity Count': 4,
    'Status': 'active'
  },
  {
    'Part Number': 'PART-C6',
    'Part Name': 'Clip 6',
    'Customer Name': 'Tata Motors',
    'Machine Number': '6',
    'Cycle Time': 14.0,
    'Cavity Count': 8,
    'Status': 'active'
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testExcelRows);
XLSX.utils.book_append_sheet(wb, ws, 'Part Master');
const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

const parseResult = parseUnifiedPartMasterExcel(buffer);
assert.strictEqual(parseResult.success, true);
assert.deepStrictEqual(parseResult.machines.map(m => m.machineNumber), ['MC04', 'MC05', 'MC06']);
assert.deepStrictEqual(parseResult.mappings.map(m => m.machineCode), ['MC04', 'MC05', 'MC06']);
console.log('  ✓ Excel parser automatically normalized Machine Numbers 4, 5, 6 to MC04, MC05, MC06\n');

// 5. Save unified master data from the parsed result
saveUnifiedMasterData({
  parts: parseResult.parts,
  machines: parseResult.machines,
  mappings: parseResult.mappings
});

const afterUploadMappings = getMachinePartMappings();
const afterUploadMachines = getMachines();
assert.strictEqual(afterUploadMachines.length, 4, 'Machines count is strictly 4');
assert.deepStrictEqual(afterUploadMachines.map(m => m.machineNumber), ['MC03', 'MC04', 'MC05', 'MC06']);

const mc03After = afterUploadMappings.filter(m => m.machineCode === 'MC03').map(m => m.partCode);
assert.strictEqual(mc03After.length, 0, 'MC03 has strictly 0 parts');

const mc04After = afterUploadMappings.filter(m => m.machineCode === 'MC04').map(m => m.partCode);
assert(mc04After.includes('PART-A4'), 'MC04 has PART-A4');

// 6. Test that any mistaken mappings for MC03 are blocked
console.log('Test 6: Mistaken mappings for MC03 are blocked, keeping MC03 at 0 parts');
const pollutedMappings = [
  { machineCode: 'MC03', partCode: 'WRONG-PART-ON-MC03', approvedToRun: true },
  { machineCode: '3', partCode: 'ANOTHER-WRONG-MC03', approvedToRun: true },
  { machineCode: 'MC04', partCode: 'CORRECT-PART-MC04', approvedToRun: true }
];
saveMachinePartMappings(pollutedMappings);
const protectedMappings = getMachinePartMappings();
const finalMC03Parts = protectedMappings.filter(m => m.machineCode === 'MC03').map(m => m.partCode);
assert.strictEqual(finalMC03Parts.length, 0, 'MC03 remains strictly 0 parts');

const finalMC04Parts = protectedMappings.filter(m => m.machineCode === 'MC04').map(m => m.partCode);
assert(finalMC04Parts.includes('CORRECT-PART-MC04'), 'MC04 got its correct part');

console.log('  ✓ Machine 3 parts are completely deleted and blocked from mistaken additions');
console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
