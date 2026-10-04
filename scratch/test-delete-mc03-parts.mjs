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
  getParts,
  saveParts,
  getMachinePartMappings,
  saveMachinePartMappings,
  saveUnifiedMasterData,
  initializeStorage
} from '../src/services/storageService.js';

import { INITIAL_PARTS, INITIAL_MACHINE_PART_MAPPINGS, INITIAL_MACHINES } from '../src/data/seedData.js';

console.log('🧪 Starting Verification Suite: Delete 3 no machine parts only...\n');

// Test 1: Seed data has 0 parts for MC03 and empty INITIAL_PARTS & INITIAL_MACHINE_PART_MAPPINGS
console.log('Test 1: Seed data parts and mappings are empty');
assert.strictEqual(INITIAL_PARTS.length, 0, 'INITIAL_PARTS must be empty');
assert.strictEqual(INITIAL_MACHINE_PART_MAPPINGS.length, 0, 'INITIAL_MACHINE_PART_MAPPINGS must be empty');
assert.strictEqual(INITIAL_MACHINES.length, 4, 'INITIAL_MACHINES has 4 machines (MC03-MC06)');
assert.deepStrictEqual(INITIAL_MACHINES.map(m => m.machineNumber), ['MC03', 'MC04', 'MC05', 'MC06']);
console.log('  ✓ Seed data correctly contains 0 parts and preserves 4 machines\n');

// Test 2: initializeStorage() purges any legacy MC03 parts and mappings
console.log('Test 2: initializeStorage() cleanses any stored MC03 parts and MC03 mappings');
localStorage.clear();
// Simulate dirty state with old MC03 parts and new MC04-MC06 parts
localStorage.setItem('rp_master_parts_v1', JSON.stringify([
  { partNumber: 'F53200000A', partName: 'Front Bezel Enclosure' },
  { partNumber: '5036677', partName: 'Terminal Cover Plate' },
  { partNumber: '5012394', partName: 'Switch Housing Bracket' },
  { partNumber: 'PART-MC04-NEW', partName: 'Bracket 4' },
  { partNumber: 'PART-MC05-NEW', partName: 'Plate 5' },
  { partNumber: 'PART-MC06-NEW', partName: 'Cap 6' }
]));

localStorage.setItem('rp_machine_part_mappings_v1', JSON.stringify([
  { machineCode: 'MC03', partCode: 'F53200000A' },
  { machineCode: 'MC03', partCode: '5036677' },
  { machineCode: 'MC03', partCode: '5012394' },
  { machineCode: 'MC04', partCode: 'PART-MC04-NEW' },
  { machineCode: 'MC05', partCode: 'PART-MC05-NEW' },
  { machineCode: 'MC06', partCode: 'PART-MC06-NEW' }
]));

initializeStorage();

const partsAfterInit = getParts();
const mappingsAfterInit = getMachinePartMappings();

// Verify parts for MC03 are completely gone
const partCodes = partsAfterInit.map(p => p.partNumber || p.partCode);
assert(!partCodes.includes('F53200000A'), 'F53200000A is deleted');
assert(!partCodes.includes('5036677'), '5036677 is deleted');
assert(!partCodes.includes('5012394'), '5012394 is deleted');
assert(partCodes.includes('PART-MC04-NEW'), 'MC04 part kept');
assert(partCodes.includes('PART-MC05-NEW'), 'MC05 part kept');
assert(partCodes.includes('PART-MC06-NEW'), 'MC06 part kept');
assert.strictEqual(partsAfterInit.length, 3, 'Exactly 3 parts remain for MC04-MC06');

// Verify MC03 has 0 mappings
const mc03Mappings = mappingsAfterInit.filter(m => m.machineCode === 'MC03');
assert.strictEqual(mc03Mappings.length, 0, 'MC03 has strictly 0 mapped parts');

// Verify MC04-MC06 mappings are intact
const otherMappings = mappingsAfterInit.filter(m => ['MC04', 'MC05', 'MC06'].includes(m.machineCode));
assert.strictEqual(otherMappings.length, 3, 'MC04, MC05, MC06 retain their 3 mappings');
console.log('  ✓ Storage initialization automatically purged MC03 parts & mappings while keeping MC04-MC06 intact\n');

// Test 3: saveParts and saveMachinePartMappings ignore any attempt to re-add MC03 parts
console.log('Test 3: saveParts and saveMachinePartMappings filter out MC03 parts');
saveParts([
  { partNumber: 'F53200000A', partName: 'Deleted 1' },
  { partNumber: 'PART-A4', partName: 'Part 4' }
]);
const savedParts = getParts();
assert.strictEqual(savedParts.length, 1, 'Only non-MC03 part saved');
assert.strictEqual(savedParts[0].partNumber, 'PART-A4');

saveMachinePartMappings([
  { machineCode: 'MC03', partCode: 'F53200000A' },
  { machineCode: '3', partCode: '5036677' },
  { machineCode: 'MC04', partCode: 'PART-A4' }
]);
const savedMappings = getMachinePartMappings();
const finalMC03Maps = savedMappings.filter(m => m.machineCode === 'MC03');
assert.strictEqual(finalMC03Maps.length, 0, 'MC03 still has 0 mappings');
const finalMC04Maps = savedMappings.filter(m => m.machineCode === 'MC04');
assert.strictEqual(finalMC04Maps.length, 1, 'MC04 has 1 mapping');
console.log('  ✓ saveParts and saveMachinePartMappings strictly block MC03 parts and mappings\n');

// Test 4: Plant fleet check
console.log('Test 4: Plant fleet check (strictly 4 machines: MC03 to MC06)');
const fleet = getMachines();
assert.strictEqual(fleet.length, 4, 'Plant fleet has strictly 4 machines');
assert.deepStrictEqual(fleet.map(m => m.machineNumber), ['MC03', 'MC04', 'MC05', 'MC06']);
console.log('  ✓ Machine 3 (MC03) remains in plant fleet as Milacron 450T, but with 0 mapped parts\n');

console.log('🎉 ALL TESTS PASSED! "delete 3 no machine parts only" is 100% verified.');
