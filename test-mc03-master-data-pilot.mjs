// Verification Test Suite for Master Data Structure Optimization for MC03 Pilot
import { INITIAL_MACHINES, INITIAL_MOULDS, INITIAL_PARTS, INITIAL_MACHINE_PART_MAPPINGS, SUPERVISORS } from './src/data/seedData.js';
import { calculateTheoreticalHourlyTarget, calculateMaxAllowedProduction, validateHourlyEntry } from './src/services/validationEngine.js';
import { getSupervisors, getMachinePartMappings, getApprovedPartsForMachine, isPartApprovedForMachine } from './src/services/storageService.js';

console.log('========================================================================');
console.log('🧪 MC03 PILOT MASTER DATA STRUCTURE OPTIMIZATION - VERIFICATION TEST');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${description}`);
    failCount++;
  }
}

// -------------------------------------------------------------------------
// Requirement 1: Part Master Optimization
// -------------------------------------------------------------------------
console.log('\n--- 1. Part Master Optimization ---');
const activeParts = INITIAL_PARTS.filter(p => p.status === 'active');
assert(activeParts.length === 3, `3 active pilot parts exist (found: ${activeParts.length})`);

const expectedPartCodes = ['F53200000A', '5036677', '5012394'];
const allPilotPartsPresent = expectedPartCodes.every(code => activeParts.some(p => p.partCode === code));
assert(allPilotPartsPresent, `Active parts match pilot scope: ${expectedPartCodes.join(', ')}`);

// Check that duplicate mould fields (standardCycleTimeSeconds, cavityCount) are REMOVED from Part Master
const partMasterHasNoCycleTime = activeParts.every(p => p.standardCycleTimeSeconds === undefined);
assert(partMasterHasNoCycleTime, 'Part Master has NO duplicate standardCycleTimeSeconds field');

const partMasterHasNoCavityCount = activeParts.every(p => p.cavityCount === undefined);
assert(partMasterHasNoCavityCount, 'Part Master has NO duplicate cavityCount field');

// Check that required part-specific attributes are present
const partMasterHasRequiredFields = activeParts.every(p => 
  p.partCode && p.partName && p.customer && p.rawMaterialGrade &&
  typeof p.partWeightGrams === 'number' && typeof p.runnerWeightGrams === 'number' && p.status
);
assert(partMasterHasRequiredFields, 'Part Master contains only part-specific attributes (Code, Name, Customer, Raw Material Grade, Part Weight, Runner Weight, Status)');

// -------------------------------------------------------------------------
// Requirement 2: Mould Master Redesign (Single Source of Truth)
// -------------------------------------------------------------------------
console.log('\n--- 2. Mould Master Redesign & Single Source of Truth ---');
const activeMoulds = INITIAL_MOULDS.filter(m => m.status === 'active');
assert(activeMoulds.length === 3, `3 active pilot moulds exist (found: ${activeMoulds.length})`);

const expectedMouldKeys = ['mouldNumber', 'partCode', 'standardCycleTimeSeconds', 'cavityCount', 'status'];
const mouldsHaveCorrectKeys = activeMoulds.every(m => expectedMouldKeys.every(k => k in m));
assert(mouldsHaveCorrectKeys, `Mould Master contains required structure: ${expectedMouldKeys.join(', ')}`);

// Source of Truth calculation check
// MLD-F53200000A: 20.0s, 2 cavity => (3600 / 20) * 2 = 360 pcs/hr
const mould1 = INITIAL_MOULDS.find(m => m.mouldNumber === 'MLD-F53200000A');
const target1 = calculateTheoreticalHourlyTarget(mould1.standardCycleTimeSeconds, mould1.cavityCount);
assert(target1 === 360, `Mould Master calculation for MLD-F53200000A (20s, 2 cav): target = ${target1} pcs/hr`);

// MLD-5036677: 15.0s, 4 cavity => (3600 / 15) * 4 = 960 pcs/hr
const mould2 = INITIAL_MOULDS.find(m => m.mouldNumber === 'MLD-5036677');
const target2 = calculateTheoreticalHourlyTarget(mould2.standardCycleTimeSeconds, mould2.cavityCount);
assert(target2 === 960, `Mould Master calculation for MLD-5036677 (15s, 4 cav): target = ${target2} pcs/hr`);

// Validation check using Mould Master values as source of truth
const v9TestPass = validateHourlyEntry({
  productionQty: 350,
  rejectionQty: 2,
  downtimeMinutes: 0,
  cycleTimeSeconds: mould1.standardCycleTimeSeconds,
  cavityCount: mould1.cavityCount
});
assert(v9TestPass.isValid, 'Production 350 pcs within theoretical cap 360 pcs passes V9');

const v9TestFail = validateHourlyEntry({
  productionQty: 400,
  rejectionQty: 0,
  downtimeMinutes: 0,
  cycleTimeSeconds: mould1.standardCycleTimeSeconds,
  cavityCount: mould1.cavityCount
});
assert(!v9TestFail.isValid, 'Production 400 pcs exceeding theoretical cap 360 pcs is blocked by V9');

// -------------------------------------------------------------------------
// Requirement 3: Machine-Mould Mapping Update (Part Code rename)
// -------------------------------------------------------------------------
console.log('\n--- 3. Machine-Mould Mapping (Renamed to Part Code) ---');
const mappings = INITIAL_MACHINE_PART_MAPPINGS;
assert(mappings.length === 3, `3 machine-part mappings defined for MC03 (found: ${mappings.length})`);

const mappingKeys = ['id', 'machineCode', 'partCode', 'approvedToRun'];
const mappingsHaveCorrectKeys = mappings.every(m => mappingKeys.every(k => k in m));
assert(mappingsHaveCorrectKeys, `Mappings contain 'partCode' instead of 'mouldNo': ${mappingKeys.join(', ')}`);

const allApprovedForMC03 = mappings.every(m => m.machineCode === 'MC03' && (m.approvedToRun === true || m.isApproved === true));
assert(allApprovedForMC03, 'All 3 pilot parts approved for machine MC03');

const mappedParts = mappings.map(m => m.partCode);
assert(
  mappedParts.includes('F53200000A') && mappedParts.includes('5036677') && mappedParts.includes('5012394'),
  'Mappings correctly map MC03 to parts F53200000A, 5036677, 5012394'
);

// Helper check
const approvedPartsList = getApprovedPartsForMachine('MC03');
assert(approvedPartsList.length === 3, 'getApprovedPartsForMachine("MC03") returns all 3 pilot parts');
assert(isPartApprovedForMachine('MC03', 'F53200000A'), 'isPartApprovedForMachine("MC03", "F53200000A") is true');
assert(!isPartApprovedForMachine('MC03', 'NON-EXISTENT-PART'), 'Non-approved part correctly rejected');

// -------------------------------------------------------------------------
// Requirement 4: User Master Simplification for Pilot (Supervisors)
// -------------------------------------------------------------------------
console.log('\n--- 4. Supervisor Master & User Simplification ---');
const supervisors = getSupervisors();
assert(supervisors.length === 2, `2 authorized supervisors provisioned (found: ${supervisors.length})`);

const supervisorNames = supervisors.map(s => s.name);
assert(supervisorNames.includes('Mr. Lokesh'), 'Supervisor "Mr. Lokesh" exists in Master');
assert(supervisorNames.includes('Mr. Akshay'), 'Supervisor "Mr. Akshay" exists in Master');

const supervisorsRoleCorrect = supervisors.every(s => s.role === 'supervisor');
assert(supervisorsRoleCorrect, 'All supervisor records have role "supervisor"');

// -------------------------------------------------------------------------
// Requirement 5: MC03 Pilot Scope
// -------------------------------------------------------------------------
console.log('\n--- 5. MC03 Machine Scope & Make ---');
const mc03 = INITIAL_MACHINES.find(m => m.machineNumber === 'MC03');
assert(Boolean(mc03), 'Machine MC03 exists in Machine Master');
assert(mc03.machineName === 'Milacron 450T', `MC03 Make is 'Milacron 450T' (found: ${mc03.machineName})`);
assert(mc03.capacityTon === 450, `MC03 capacity is 450 Ton (found: ${mc03.capacityTon})`);
assert(mc03.status === 'active', 'MC03 status is active');

console.log('\n========================================================================');
console.log(`📊 FINAL SUMMARY: ${passCount} Passed, ${failCount} Failed (${passCount + failCount} Total)`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL MASTER DATA STRUCTURE OPTIMIZATIONS FOR MC03 PILOT VERIFIED!\n');
}
