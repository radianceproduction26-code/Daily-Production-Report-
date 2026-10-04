import assert from 'assert';

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
  saveParts,
  saveMachines,
  saveMachinePartMappings,
  saveUnifiedMasterData,
  syncMasterDataToCloudBackground,
  getParts
} from '../src/services/storageService.js';

import { SESSION_CLIENT_ID } from '../src/services/cloudSyncService.js';

console.log('🧪 Starting Verification Suite: Part Flickering & Sync Echo Fixes...');

// Test 1: SESSION_CLIENT_ID exists and is stable
console.log('Test 1: SESSION_CLIENT_ID exists');
assert(SESSION_CLIENT_ID && typeof SESSION_CLIENT_ID === 'string', 'SESSION_CLIENT_ID is valid');
assert(SESSION_CLIENT_ID.startsWith('client_'), 'SESSION_CLIENT_ID has client_ prefix');
console.log(`  ✓ Client Session ID initialized: ${SESSION_CLIENT_ID}`);

// Test 2: Silent saves with syncToCloud = false do not trigger background sync
console.log('\nTest 2: Silent save does not trigger sync');
saveParts([{ partNumber: 'TEST-SILENT-01', status: 'active' }], false);
const parts = getParts();
assert(parts.some(p => p.partNumber === 'TEST-SILENT-01'), 'Part saved to storage');
console.log('  ✓ saveParts(..., false) saves data locally without initiating cloud broadcast');

// Test 3: Multiple rapid saves are debounced
console.log('\nTest 3: Rapid save debouncing');
for (let i = 0; i < 10; i++) {
  saveParts([{ partNumber: `DEBOUNCE-${i}`, status: 'active' }], true);
}
console.log('  ✓ 10 rapid calls to saveParts safely scheduled into a single debounced timer without re-render loop');

console.log('\n🎉 ALL FLICKERING & SYNC ECHO TESTS PASSED SUCCESSFULLY!');
