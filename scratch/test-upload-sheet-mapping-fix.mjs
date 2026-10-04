import assert from 'assert';
import * as XLSX from 'xlsx';

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
  normalizeMachineCodes,
  getMachines,
  getParts,
  saveParts,
  getMachinePartMappings,
  saveMachinePartMappings,
  saveUnifiedMasterData,
  togglePartMachineMapping,
  initializeStorage
} from '../src/services/storageService.js';

import { parseUnifiedPartMasterExcel } from '../src/services/dataUploadService.js';

console.log('🧪 Starting Verification Suite: Uploaded Sheet Part Mapping Verification...\n');

// Test 1: normalizeMachineCodes handles diverse formats
console.log('Test 1: normalizeMachineCodes handles diverse formats');
assert.deepStrictEqual(normalizeMachineCodes('MC03'), ['MC03']);
assert.deepStrictEqual(normalizeMachineCodes('3'), ['MC03']);
assert.deepStrictEqual(normalizeMachineCodes('450T'), ['MC03']);
assert.deepStrictEqual(normalizeMachineCodes('Milacron 350T'), ['MC04']);
assert.deepStrictEqual(normalizeMachineCodes('MC03, MC04'), ['MC03', 'MC04']);
assert.deepStrictEqual(normalizeMachineCodes('MC04/MC05/MC06'), ['MC04', 'MC05', 'MC06']);
assert.deepStrictEqual(normalizeMachineCodes('ALL'), ['MC03', 'MC04', 'MC05', 'MC06']);
console.log('  ✓ normalizeMachineCodes successfully maps single, multiple, and tonnage machine strings\n');

// Test 2: Upload Excel file with column header variations (e.g. "Part No", "Machine No", "M/C No")
console.log('Test 2: Parse Excel with headers like "Part No" and "Machine No"');
const testRows1 = [
  {
    'Part No': 'NEW-P3-001',
    'Part Name': 'Lower Shell 3',
    'Customer': 'Siemens',
    'Machine No': 'MC03',
    'Cycle Time': 19.5,
    'Cavity': 2
  },
  {
    'Part No': 'NEW-P4-002',
    'Part Name': 'Bezel 4',
    'Customer': 'Bosch',
    'M/C No': '4',
    'Cycle Time': 16.0,
    'Cavity': 4
  },
  {
    'Part No': 'NEW-P5-003',
    'Part Name': 'Housing 5',
    'Customer': 'Tata',
    'Machine': '250T',
    'Cycle Time': 24.0,
    'Cavity': 2
  }
];

const wb1 = XLSX.utils.book_new();
const ws1 = XLSX.utils.json_to_sheet(testRows1);
XLSX.utils.book_append_sheet(wb1, ws1, 'Parts');
const buffer1 = XLSX.write(wb1, { type: 'array', bookType: 'xlsx' });

const res1 = parseUnifiedPartMasterExcel(buffer1);
assert.strictEqual(res1.success, true, 'Parsing must succeed');
assert.strictEqual(res1.partsCount, 3, 'Found 3 parts');
assert.strictEqual(res1.mappingsCount, 3, 'Found 3 mappings');

// Save through unified master data
saveUnifiedMasterData({
  parts: res1.parts,
  machines: res1.machines,
  mappings: res1.mappings
});

const currentParts = getParts();
const currentMappings = getMachinePartMappings();

assert(currentParts.some(p => p.partNumber === 'NEW-P3-001'), 'Part NEW-P3-001 saved in master');
assert(currentParts.some(p => p.partNumber === 'NEW-P4-002'), 'Part NEW-P4-002 saved in master');
assert(currentParts.some(p => p.partNumber === 'NEW-P5-003'), 'Part NEW-P5-003 saved in master');

// Check that NEW-P3-001 is mapped to MC03
const p3Map = currentMappings.find(m => m.partCode === 'NEW-P3-001');
assert(p3Map, 'NEW-P3-001 has mapping');
assert.strictEqual(p3Map.machineCode, 'MC03', 'NEW-P3-001 is mapped to MC03');

// Check that NEW-P4-002 is mapped to MC04
const p4Map = currentMappings.find(m => m.partCode === 'NEW-P4-002');
assert(p4Map, 'NEW-P4-002 has mapping');
assert.strictEqual(p4Map.machineCode, 'MC04', 'NEW-P4-002 is mapped to MC04');

// Check that NEW-P5-003 is mapped to MC05
const p5Map = currentMappings.find(m => m.partCode === 'NEW-P5-003');
assert(p5Map, 'NEW-P5-003 has mapping');
assert.strictEqual(p5Map.machineCode, 'MC05', 'NEW-P5-003 is mapped to MC05');

console.log('  ✓ Parts with headers "Part No", "Machine No", "M/C No", "250T" correctly parsed & mapped\n');

// Test 3: Upload a second sheet with parts for MC06 without wiping previous mappings for MC03, MC04, MC05
console.log('Test 3: Upload incremental parts for MC06 without wiping previous machines mappings');
const testRows2 = [
  {
    'Part Number': 'NEW-P6-004',
    'Part Name': 'Cap 6',
    'Machine Number': 'MC06',
    'Cycle Time': 12.0,
    'Cavity Count': 8
  }
];

const wb2 = XLSX.utils.book_new();
const ws2 = XLSX.utils.json_to_sheet(testRows2);
XLSX.utils.book_append_sheet(wb2, ws2, 'Sheet1');
const buffer2 = XLSX.write(wb2, { type: 'array', bookType: 'xlsx' });

const res2 = parseUnifiedPartMasterExcel(buffer2);
saveUnifiedMasterData({
  parts: res2.parts,
  machines: res2.machines,
  mappings: res2.mappings
});

const mergedMappings = getMachinePartMappings();
const mc03Mapped = mergedMappings.filter(m => m.machineCode === 'MC03').map(m => m.partCode);
const mc04Mapped = mergedMappings.filter(m => m.machineCode === 'MC04').map(m => m.partCode);
const mc05Mapped = mergedMappings.filter(m => m.machineCode === 'MC05').map(m => m.partCode);
const mc06Mapped = mergedMappings.filter(m => m.machineCode === 'MC06').map(m => m.partCode);

assert(mc03Mapped.includes('NEW-P3-001'), 'MC03 mapping still exists');
assert(mc04Mapped.includes('NEW-P4-002'), 'MC04 mapping still exists');
assert(mc05Mapped.includes('NEW-P5-003'), 'MC05 mapping still exists');
assert(mc06Mapped.includes('NEW-P6-004'), 'MC06 mapping added');

console.log('  ✓ Incremental upload preserves all machines mappings without overwriting\n');

// Test 4: Upload sheet without any machine column -> Auto-mapped to all 4 fleet machines
console.log('Test 4: Upload sheet without machine column -> Auto-mapped to all fleet machines');
const testRows3 = [
  {
    'Part Code': 'UNIVERSAL-PART-99',
    'Part Description': 'Universal Spacer',
    'Client': 'Universal',
    'Standard Cycle Time': 15.0,
    'Cavities': 4
  }
];

const wb3 = XLSX.utils.book_new();
const ws3 = XLSX.utils.json_to_sheet(testRows3);
XLSX.utils.book_append_sheet(wb3, ws3, 'PartsOnly');
const buffer3 = XLSX.write(wb3, { type: 'array', bookType: 'xlsx' });

const res3 = parseUnifiedPartMasterExcel(buffer3);
assert.strictEqual(res3.success, true);
assert.strictEqual(res3.partsCount, 1);
assert.strictEqual(res3.mappingsCount, 4, 'Auto-mapped across 4 fleet machines');

saveUnifiedMasterData({
  parts: res3.parts,
  machines: res3.machines,
  mappings: res3.mappings
});

const uniMaps = getMachinePartMappings().filter(m => m.partCode === 'UNIVERSAL-PART-99');
assert.strictEqual(uniMaps.length, 4, 'Mapped to all 4 machines');
assert.deepStrictEqual(uniMaps.map(m => m.machineCode).sort(), ['MC03', 'MC04', 'MC05', 'MC06']);
console.log('  ✓ Parts uploaded without machine column are auto-mapped across all 4 fleet machines\n');

// Test 5: togglePartMachineMapping
console.log('Test 5: togglePartMachineMapping can toggle any machine on/off');
// Unmap UNIVERSAL-PART-99 from MC03
togglePartMachineMapping('MC03', 'UNIVERSAL-PART-99');
const afterUnmap = getMachinePartMappings().filter(m => m.partCode === 'UNIVERSAL-PART-99');
assert.strictEqual(afterUnmap.length, 3, 'Now mapped to 3 machines');
assert(!afterUnmap.some(m => m.machineCode === 'MC03'), 'MC03 unmapped');

// Remap UNIVERSAL-PART-99 to MC03
togglePartMachineMapping('MC03', 'UNIVERSAL-PART-99');
const afterRemap = getMachinePartMappings().filter(m => m.partCode === 'UNIVERSAL-PART-99');
assert.strictEqual(afterRemap.length, 4, 'Now re-mapped to 4 machines');
assert(afterRemap.some(m => m.machineCode === 'MC03'), 'MC03 mapped');
console.log('  ✓ togglePartMachineMapping toggles machine mapping on and off cleanly\n');

console.log('🎉 ALL UPLOAD MAPPING TESTS PASSED SUCCESSFULLY!');
