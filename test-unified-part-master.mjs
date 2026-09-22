// Radiance Polymers - Automated Test Suite: Unified Part Master Architecture
import * as XLSX from 'xlsx';
import {
  INITIAL_PARTS,
  INITIAL_MACHINES,
  INITIAL_MOULDS,
  INITIAL_MACHINE_PART_MAPPINGS
} from './src/data/seedData.js';
import {
  parseUnifiedPartMasterExcel
} from './src/services/dataUploadService.js';

console.log('=================================================================');
console.log('🧪 TEST SUITE: UNIFIED PART MASTER ARCHITECTURE & CLEAN INSTALL');
console.log('=================================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// 1. Verify Clean Install State (Zero Preloaded Data)
assert(INITIAL_PARTS.length === 0, 'INITIAL_PARTS has 0 preloaded items (clean install)');
assert(INITIAL_MACHINES.length === 0, 'INITIAL_MACHINES has 0 preloaded items (clean install)');
assert(INITIAL_MOULDS.length === 0, 'INITIAL_MOULDS has 0 preloaded items (clean install)');
assert(INITIAL_MACHINE_PART_MAPPINGS.length === 0, 'INITIAL_MACHINE_PART_MAPPINGS has 0 preloaded items (clean install)');

// 2. Test 13-column Excel Template Parsing & Auto-Generation
const testData = [
  {
    'Part Number': 'P-101',
    'Part Name': 'Upper Casing Unit',
    'Customer Name': 'Schneider Electric',
    'Machine Number': 'MC01',
    'Machine Name': 'Engel Victory 150T',
    'Machine Make': 'Engel Victory 330/150',
    'Machine Tonnage': 150,
    'Material Grade': 'PP Copolymer 575P',
    'Part Weight (g)': 45.2,
    'Runner Weight (g)': 5.1,
    'Cycle Time (sec)': 22.5,
    'Cavity Count': 2,
    'Status': 'active'
  },
  {
    'Part Number': 'P-102',
    'Part Name': 'Lower Housing Base',
    'Customer Name': 'Bosch Automotive',
    'Machine Number': 'MC02',
    'Machine Name': 'Milacron 250T',
    'Machine Make': 'Milacron Magna T-250',
    'Machine Tonnage': 250,
    'Material Grade': 'Nylon 6 30% GF',
    'Part Weight (g)': 32.0,
    'Runner Weight (g)': 4.0,
    'Cycle Time (sec)': 18.0,
    'Cavity Count': 4,
    'Status': 'active'
  },
  {
    'Part Number': 'P-101', // Same part on second machine
    'Part Name': 'Upper Casing Unit',
    'Customer Name': 'Schneider Electric',
    'Machine Number': 'MC03',
    'Machine Name': 'Milacron 450T',
    'Machine Make': 'Milacron Magna T-450',
    'Machine Tonnage': 450,
    'Material Grade': 'PP Copolymer 575P',
    'Part Weight (g)': 45.2,
    'Runner Weight (g)': 5.1,
    'Cycle Time (sec)': 21.0,
    'Cavity Count': 2,
    'Status': 'active'
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testData);
XLSX.utils.book_append_sheet(wb, ws, 'Part Master');
const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

// Parse buffer with unified parser
const result = parseUnifiedPartMasterExcel(buffer);

assert(result.success === true, 'Unified Excel parser executed successfully');
assert(result.rowsProcessed === 3, `Processed 3 spreadsheet rows (got ${result.rowsProcessed})`);
assert(result.partsCount === 2, `Auto-generated 2 unique parts (P-101, P-102) (got ${result.partsCount})`);
assert(result.machinesCount === 3, `Auto-generated 3 machines (MC01, MC02, MC03) (got ${result.machinesCount})`);
assert(result.mappingsCount === 3, `Auto-generated 3 machine-part mappings (got ${result.mappingsCount})`);

// Verify Part details
const partP101 = result.parts.find(p => p.partNumber === 'P-101');
assert(partP101 !== undefined, 'Part P-101 exists in generated parts');
assert(partP101.partName === 'Upper Casing Unit', 'P-101 partName matches spreadsheet');
assert(partP101.customer === 'Schneider Electric', 'P-101 customer matches spreadsheet');
assert(partP101.rawMaterialGrade === 'PP Copolymer 575P', 'P-101 rawMaterialGrade matches spreadsheet');
assert(partP101.partWeightGrams === 45.2, 'P-101 partWeightGrams is 45.2');
assert(partP101.runnerWeightGrams === 5.1, 'P-101 runnerWeightGrams is 5.1');
assert(partP101.standardCycleTimeSeconds === 22.5, 'P-101 standardCycleTimeSeconds is 22.5');
assert(partP101.cavityCount === 2, 'P-101 cavityCount is 2');

// Verify Machine details
const mc03 = result.machines.find(m => m.machineNumber === 'MC03');
assert(mc03 !== undefined, 'Machine MC03 exists in generated machines');
assert(mc03.machineName === 'Milacron 450T', 'MC03 machineName matches spreadsheet');
assert(mc03.makeModel === 'Milacron Magna T-450', 'MC03 makeModel matches spreadsheet');
assert(mc03.capacityTon === 450, 'MC03 capacityTon is 450');

// Verify Machine-Part Mappings
const mappingP101_MC01 = result.mappings.find(m => m.machineCode === 'MC01' && m.partCode === 'P-101');
const mappingP101_MC03 = result.mappings.find(m => m.machineCode === 'MC03' && m.partCode === 'P-101');
assert(mappingP101_MC01 !== undefined, 'Mapping MC01 -> P-101 automatically created');
assert(mappingP101_MC03 !== undefined, 'Mapping MC03 -> P-101 automatically created');
assert(mappingP101_MC01.approvedToRun === true, 'Mapping approvedToRun defaults to true');

console.log('=================================================================');
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
}
