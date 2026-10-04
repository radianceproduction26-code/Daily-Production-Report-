import assert from 'assert';
import * as XLSX from 'xlsx';

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

// Mock window and sessionStorage
global.window = {
  sessionStorage: {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
};

import {
  isPartAllocatedToMachine,
  getApprovedPartsForMachine,
  saveUnifiedMasterData,
  getParts,
  getMachinePartMappings
} from '../src/services/storageService.js';

import { parseUnifiedPartMasterExcel } from '../src/services/dataUploadService.js';

console.log('🧪 Starting Verification Suite: Machine Allocated Parts at Shift Start...');

// Test 1: Direct isPartAllocatedToMachine check
console.log('Test 1: isPartAllocatedToMachine tests');
const partMC04 = {
  partNumber: 'PART-MC04-ONLY',
  partName: 'Bracket 4',
  machineNumber: '4'
};
const partMC03 = {
  partNumber: 'PART-MC03-ONLY',
  partName: 'Housing 3',
  machineNumber: 'MC03'
};
const partAll = {
  partNumber: 'PART-ALL-MC',
  partName: 'Common Clip',
  machineNumber: 'ALL'
};

assert.strictEqual(isPartAllocatedToMachine(partMC04, 'MC04'), true, 'partMC04 allocated to MC04');
assert.strictEqual(isPartAllocatedToMachine(partMC04, 'MC03'), false, 'partMC04 NOT allocated to MC03');
assert.strictEqual(isPartAllocatedToMachine(partMC04, 'MC05'), false, 'partMC04 NOT allocated to MC05');

assert.strictEqual(isPartAllocatedToMachine(partMC03, 'MC03'), true, 'partMC03 allocated to MC03');
assert.strictEqual(isPartAllocatedToMachine(partMC03, 'MC04'), false, 'partMC03 NOT allocated to MC04');

assert.strictEqual(isPartAllocatedToMachine(partAll, 'MC03'), true, 'partAll allocated to MC03');
assert.strictEqual(isPartAllocatedToMachine(partAll, 'MC04'), true, 'partAll allocated to MC04');
assert.strictEqual(isPartAllocatedToMachine(partAll, 'MC05'), true, 'partAll allocated to MC05');
assert.strictEqual(isPartAllocatedToMachine(partAll, 'MC06'), true, 'partAll allocated to MC06');
console.log('  ✓ isPartAllocatedToMachine correctly isolates parts strictly by machine allocation');

// Test 2: Upload Excel with allocated machines and verify shift parts filtering
console.log('\nTest 2: Excel sheet upload with Machine Number column');
const sheetRows = [
  {
    'Part Number': 'GEAR-03',
    'Part Name': 'Gear 450T',
    'Machine Number': 'MC03',
    'Standard Cycle Time (s)': 25,
    'Cavity Count': 1
  },
  {
    'Part Number': 'LEVER-04',
    'Part Name': 'Lever 350T',
    'Machine Number': '4',
    'Standard Cycle Time (s)': 18,
    'Cavity Count': 2
  },
  {
    'Part Number': 'COVER-05',
    'Part Name': 'Cover 250T',
    'Machine Number': '5',
    'Standard Cycle Time (s)': 15,
    'Cavity Count': 4
  },
  {
    'Part Number': 'KNOB-06',
    'Part Name': 'Knob 180T',
    'Machine Number': '6',
    'Standard Cycle Time (s)': 12,
    'Cavity Count': 8
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sheetRows);
XLSX.utils.book_append_sheet(wb, ws, 'Part Master');
const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

const parseResult = parseUnifiedPartMasterExcel(buffer);
assert.strictEqual(parseResult.success, true);

saveUnifiedMasterData({
  parts: parseResult.parts,
  machines: parseResult.machines,
  mappings: parseResult.mappings
}, false);

const allParts = getParts();
const allMappings = getMachinePartMappings();

// Verify parts under MC03 at shift start
const mc03ShiftParts = allParts.filter(p => isPartAllocatedToMachine(p, 'MC03', allMappings));
const mc03PartCodes = mc03ShiftParts.map(p => p.partNumber);
assert(mc03PartCodes.includes('GEAR-03'), 'MC03 includes GEAR-03');
assert(!mc03PartCodes.includes('LEVER-04'), 'MC03 does NOT include LEVER-04');
assert(!mc03PartCodes.includes('COVER-05'), 'MC03 does NOT include COVER-05');
assert(!mc03PartCodes.includes('KNOB-06'), 'MC03 does NOT include KNOB-06');
console.log('  ✓ Shift start on MC03 shows ONLY parts allocated to MC03');

// Verify parts under MC04 at shift start
const mc04ShiftParts = allParts.filter(p => isPartAllocatedToMachine(p, 'MC04', allMappings));
const mc04PartCodes = mc04ShiftParts.map(p => p.partNumber);
assert(!mc04PartCodes.includes('GEAR-03'), 'MC04 does NOT include GEAR-03');
assert(mc04PartCodes.includes('LEVER-04'), 'MC04 includes LEVER-04');
assert(!mc04PartCodes.includes('COVER-05'), 'MC04 does NOT include COVER-05');
assert(!mc04PartCodes.includes('KNOB-06'), 'MC04 does NOT include KNOB-06');
console.log('  ✓ Shift start on MC04 shows ONLY parts allocated to MC04');

// Verify parts under MC05 at shift start
const mc05ShiftParts = allParts.filter(p => isPartAllocatedToMachine(p, 'MC05', allMappings));
const mc05PartCodes = mc05ShiftParts.map(p => p.partNumber);
assert(!mc05PartCodes.includes('GEAR-03'), 'MC05 does NOT include GEAR-03');
assert(!mc05PartCodes.includes('LEVER-04'), 'MC05 does NOT include LEVER-04');
assert(mc05PartCodes.includes('COVER-05'), 'MC05 includes COVER-05');
assert(!mc05PartCodes.includes('KNOB-06'), 'MC05 does NOT include KNOB-06');
console.log('  ✓ Shift start on MC05 shows ONLY parts allocated to MC05');

// Verify parts under MC06 at shift start
const mc06ShiftParts = allParts.filter(p => isPartAllocatedToMachine(p, 'MC06', allMappings));
const mc06PartCodes = mc06ShiftParts.map(p => p.partNumber);
assert(!mc06PartCodes.includes('GEAR-03'), 'MC06 does NOT include GEAR-03');
assert(!mc06PartCodes.includes('LEVER-04'), 'MC06 does NOT include LEVER-04');
assert(!mc06PartCodes.includes('COVER-05'), 'MC06 does NOT include COVER-05');
assert(mc06PartCodes.includes('KNOB-06'), 'MC06 includes KNOB-06');
console.log('  ✓ Shift start on MC06 shows ONLY parts allocated to MC06');

console.log('\n🎉 ALL MACHINE ALLOCATED SHIFT PART TESTS PASSED SUCCESSFULLY!');
