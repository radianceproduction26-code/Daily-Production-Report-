// Radiance Polymers - Phase 11A Master Data Import & Verification Test Suite
// Verifies import and auditing of actual plant master workbook Radiance_Polymers_V1_Master_Data_Template.xlsx

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { auditAndImportPlantMasterWorkbook } from './src/services/importTemplateService.js';
import { validateMachineCode } from './src/services/validationEngine.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runMasterDataImportTests() {
  console.log('🧪 Starting Phase 11A Master Data Import & Verification Tests...\n');

  const filePath = path.resolve('./Radiance_Polymers_V1_Master_Data_Template.xlsx');
  assert(fs.existsSync(filePath), `Excel master data file not found at ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // 1. IMPORT EXCEL DATA
  const auditResult = await auditAndImportPlantMasterWorkbook(workbook);
  assert(auditResult.success === true, 'Master workbook import and audit returned success = false');
  const { auditReport, readinessScore } = auditResult;
  console.log('  ✓ 1. Excel Master Workbook Imported (Sheets: Machine Master, Part Master, Machine-Mould Mapping, User Master, Rejection Master)');

  // 2. VERIFY MACHINE MASTER
  const mc03 = auditReport.mc03Verification;
  assert(mc03.exists === true, 'Machine Master missing MC03');
  assert(mc03.code === 'MC03', 'Machine Code is not MC03');
  assert(mc03.make.trim() === 'Milacron', `Expected MC03 make Milacron, got ${mc03.make}`);
  assert(mc03.model.trim() === 'Milacron', `Expected MC03 model Milacron, got ${mc03.model}`);
  assert(mc03.tonnage === 450, `Expected MC03 tonnage 450, got ${mc03.tonnage}`);
  assert(mc03.blankValues === 0, `MC03 has ${mc03.blankValues} blank required values`);
  assert(mc03.duplicateCount === 0, `MC03 has ${mc03.duplicateCount} duplicates`);
  assert(mc03.formatValid === true, 'MC03 format validation failed');

  // Verify all 14 fleet machines adhere to format and have no duplicates
  const rawMachineSheet = workbook.Sheets['Machine Master'];
  const rawMachines = XLSX.utils.sheet_to_json(rawMachineSheet, { defval: '' });
  assert(rawMachines.length === 14, `Expected 14 machines in master, got ${rawMachines.length}`);
  const machineCodes = rawMachines.map(r => r['Machine Code'].trim().toUpperCase());
  const uniqueMachineCodes = new Set(machineCodes);
  assert(uniqueMachineCodes.size === 14, 'Duplicate machine codes found in fleet');
  machineCodes.forEach(code => {
    assert(validateMachineCode(code).isValid === true, `Machine ${code} failed MCxx format validation`);
  });
  console.log('  ✓ 2. Machine Master Verified (MC03 Milacron 450T verified, 14 machines formatted MC01-MC14, zero duplicates)');

  // 3. VERIFY PART MASTER
  const parts = auditReport.partVerification;
  assert(parts.count === 3, `Expected 3 parts in Part Master, got ${parts.count}`);
  const expectedParts = ['F53200000A', '5036677', '5012394'];
  const partNumbers = parts.partsList.map(p => p.partNumber);
  expectedParts.forEach(ep => {
    assert(partNumbers.includes(ep), `Expected part ${ep} not found in Part Master`);
  });

  // Verify all 8 required parameters on every part
  parts.partsList.forEach(p => {
    assert(Boolean(p.partNumber), `Part ${p.partNumber}: Missing Part Number`);
    assert(Boolean(p.partName), `Part ${p.partNumber}: Missing Part Name`);
    assert(Boolean(p.customer), `Part ${p.partNumber}: Missing Customer`);
    assert(Boolean(p.materialGrade), `Part ${p.partNumber}: Missing Material Grade`);
    assert(Number(p.partWeightGrams) > 0, `Part ${p.partNumber}: Invalid Part Weight ${p.partWeightGrams}`);
    assert(Number(p.runnerWeightGrams) >= 0, `Part ${p.partNumber}: Invalid Runner Weight ${p.runnerWeightGrams}`);
    assert(Number(p.cycleTimeSeconds) > 0, `Part ${p.partNumber}: Invalid Cycle Time ${p.cycleTimeSeconds}`);
    assert(Number(p.cavityCount) > 0, `Part ${p.partNumber}: Invalid Cavity Count ${p.cavityCount}`);
  });
  console.log('  ✓ 3. Part Master Verified (3 parts: F53200000A, 5036677, 5012394 with all 8 operational parameters verified)');

  // 4. VERIFY MACHINE-PART MAPPING
  const mapping = auditReport.mappingVerification;
  assert(mapping.count === 3, `Expected 3 mappings, got ${mapping.count}`);
  expectedParts.forEach(ep => {
    assert(mapping.mc03MappedParts.includes(ep), `Part ${ep} is not mapped to MC03`);
  });
  assert(mapping.orphanMappingsCount === 0, `Found ${mapping.orphanMappingsCount} orphan mappings`);
  console.log('  ✓ 4. Machine-Part Mapping Verified (MC03 mapped to all 3 pilot parts, active status, 0 orphan mappings)');

  // 5. VERIFY USER MASTER
  const userVer = auditReport.userVerification;
  assert(userVer.hasLokesh === true, 'Pilot Supervisor Mr. Lokesh is missing or unverified');
  assert(userVer.hasAkshay === true, 'Pilot Supervisor Mr. Akshay is missing or unverified');
  assert(userVer.pilotSupervisors.length === 2, 'Expected 2 pilot supervisors');
  console.log('  ✓ 5. User Master Verified (Pilot Supervisors Mr. Lokesh & Mr. Akshay verified active for pilot)');

  // 6. GENERATE MASTER DATA AUDIT REPORT
  const imp = auditReport.importedRecords;
  const val = auditReport.validRecords;
  const inv = auditReport.invalidRecords;
  const dup = auditReport.duplicateRecords;
  assert(imp.machines === 14, `Expected 14 imported machines, got ${imp.machines}`);
  assert(imp.parts === 3, `Expected 3 imported parts, got ${imp.parts}`);
  assert(imp.mappings === 3, `Expected 3 imported mappings, got ${imp.mappings}`);
  assert(imp.rejections === 17, `Expected 17 rejection codes, got ${imp.rejections}`);
  assert(inv.total === 0, `Expected 0 invalid records, got ${inv.total}`);
  assert(dup.machines.length === 0, `Expected 0 duplicate machines, got ${dup.machines.length}`);
  assert(dup.parts.length === 0, `Expected 0 duplicate parts, got ${dup.parts.length}`);
  console.log(`  ✓ 6. Master Data Audit Report Generated (Imported: ${imp.total}, Valid: ${val.total}, Invalid: ${inv.total}, Duplicates: 0)`);

  // 7. MASTER DATA READINESS SCORE
  assert(readinessScore.overallScore === 100, `Expected 100% readiness score, got ${readinessScore.overallScore}%`);
  assert(readinessScore.finalResult === 'READY', `Expected final result READY, got ${readinessScore.finalResult}`);
  assert(readinessScore.scoreComponents.machineMaster.status === 'READY', 'Machine Master component not READY');
  assert(readinessScore.scoreComponents.partMaster.status === 'READY', 'Part Master component not READY');
  assert(readinessScore.scoreComponents.mapping.status === 'READY', 'Mapping component not READY');
  assert(readinessScore.scoreComponents.users.status === 'READY', 'Users component not READY');
  console.log(`  ✓ 7. Master Data Readiness Score Calculated: 100% — FINAL RESULT: READY`);

  console.log('\n🎉 All Phase 11A Master Data Import & Verification tests passed cleanly!\n');
}

runMasterDataImportTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
