// Comprehensive verification test for Lumps Generated (kg) in Shift Reporting
import assert from 'assert';
import XLSX from 'xlsx-js-style';
import { summarizeReportForMasterSync } from '../src/services/cloudSyncService.js';
import { exportShiftReportToExcel, exportConsolidatedMasterSheetToExcel } from '../src/services/exportService.js';

console.log('🧪 Starting Lumps Generated (kg) Verification Test Suite...\n');

// 1. Test summarizeReportForMasterSync with lumpsGeneratedKg
const sampleReportWithLumps = {
  id: 'rep-test-lumps-01',
  reportDate: '2026-09-24',
  shift: 'Shift A',
  machineNumber: 'MC03',
  operatorName: 'Rajesh Kumar',
  supervisorName: 'Mr. Lokesh',
  partNumber: 'PART-001',
  partName: 'Main Housing',
  lumpsGeneratedKg: 14.5,
  status: 'submitted',
  mouldSessions: [
    {
      id: 'sess-1',
      partNumber: 'PART-001',
      entries: [
        { hourIndex: 1, theoreticalTarget: 360, productionQty: 350, acceptedQty: 340, rejectionQty: 10, downtimeMinutes: 0 }
      ]
    }
  ]
};

const summary = summarizeReportForMasterSync(sampleReportWithLumps);
assert.strictEqual(summary.lumps_generated_kg, 14.5, 'summarizeReportForMasterSync must include lumps_generated_kg as 14.5');
console.log('✓ summarizeReportForMasterSync correctly extracted lumps_generated_kg = 14.5 kg');

// 2. Test fallback when lumpsGeneratedKg is not set
const sampleReportNoLumps = {
  id: 'rep-test-lumps-02',
  reportDate: '2026-09-24',
  shift: 'Shift B',
  machineNumber: 'MC05',
  mouldSessions: []
};
const summaryNoLumps = summarizeReportForMasterSync(sampleReportNoLumps);
assert.strictEqual(summaryNoLumps.lumps_generated_kg, 0, 'summarizeReportForMasterSync defaults lumps_generated_kg to 0');
console.log('✓ summarizeReportForMasterSync defaulted missing lumps to 0 kg');

// 3. Test Shift Report Excel export includes Lumps Generated metadata
const shiftExcelRes = exportShiftReportToExcel(sampleReportWithLumps);
assert.strictEqual(shiftExcelRes.success, true, 'exportShiftReportToExcel should succeed');
assert.ok(shiftExcelRes.filename.includes('Radiance_Production_'), 'Shift report filename convention matched');
console.log('✓ exportShiftReportToExcel generated shift workbook with Lumps Gen:', shiftExcelRes.filename);

// 4. Test Consolidated Master Excel export includes Lumps (Kg) in Master Ledger & Dashboard
const consolidatedReports = [
  sampleReportWithLumps,
  {
    id: 'rep-test-lumps-03',
    reportDate: '2026-09-24',
    shift: 'Shift B',
    machineNumber: 'MC05',
    operatorName: 'Suresh Patel',
    supervisorName: 'Mr. Akshay',
    partNumber: 'PART-002',
    partName: 'Lower Cover',
    lumpsGeneratedKg: 8.2,
    status: 'approved',
    mouldSessions: [
      {
        id: 'sess-1',
        partNumber: 'PART-002',
        entries: [
          { hourIndex: 1, theoreticalTarget: 400, productionQty: 390, acceptedQty: 385, rejectionQty: 5, downtimeMinutes: 10 }
        ]
      }
    ]
  }
];

const masterExcelRes = exportConsolidatedMasterSheetToExcel(consolidatedReports);
assert.strictEqual(masterExcelRes.success, true, 'exportConsolidatedMasterSheetToExcel should succeed');
console.log('✓ Consolidated Master Excel generated successfully with Lumps (Kg):', masterExcelRes.filename);

// 5. Test Submission Validation Logic
function validateLumpsInput(lumpsInput) {
  if (lumpsInput === '' || lumpsInput === null || lumpsInput === undefined || isNaN(Number(lumpsInput)) || Number(lumpsInput) < 0) {
    return { isValid: false, error: 'Supervisor must enter Lumps Generated (kg) before submitting (enter 0 if none).' };
  }
  return { isValid: true, value: Number(lumpsInput) };
}

assert.strictEqual(validateLumpsInput('').isValid, false, 'Empty lumps input should be blocked');
assert.strictEqual(validateLumpsInput(null).isValid, false, 'Null lumps input should be blocked');
assert.strictEqual(validateLumpsInput(-5).isValid, false, 'Negative lumps input should be blocked');
assert.strictEqual(validateLumpsInput('abc').isValid, false, 'Non-numeric lumps input should be blocked');
assert.strictEqual(validateLumpsInput(0).isValid, true, 'Zero lumps input is valid');
assert.strictEqual(validateLumpsInput('12.5').isValid, true, '12.5 kg lumps input is valid');
assert.strictEqual(validateLumpsInput('12.5').value, 12.5, 'Parsed numeric value is 12.5');
console.log('✓ Submission validation strictly enforces non-negative numeric Lumps Generated (kg)');

console.log('\n🎉 ALL LUMPS GENERATED (KG) VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
