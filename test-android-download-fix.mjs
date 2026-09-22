// test-android-download-fix.mjs
// Verification of Android Template Download Fixes and Excel Compatibility

import * as XLSX from 'xlsx';
import assert from 'assert';
import {
  downloadWorkbook,
  downloadUnifiedPartMasterTemplate,
  downloadRejectionMasterTemplate,
  downloadDowntimeMasterTemplate
} from './src/services/dataUploadService.js';
import { exportShiftReportToExcel } from './src/services/exportService.js';

console.log('====================================================');
console.log('🧪 VERIFYING ANDROID EXCEL TEMPLATE DOWNLOAD FIXES');
console.log('====================================================\n');

// 1. Test Excel Generation & Buffer Integrity for Part Master Template
console.log('1. Testing Part Master Template Excel Generation...');
const partRes = await downloadUnifiedPartMasterTemplate();
assert(partRes.success, 'Part Master download returned success: false');
assert.strictEqual(partRes.filename, 'Radiance_Part_Master_Template.xlsx', 'Filename must match exact specification');
assert(partRes.buffer || partRes.location, 'Must produce valid buffer or location');

// Open the generated workbook back up with XLSX to verify no corruption
const partWb = XLSX.read(partRes.buffer, { type: 'array' });
const partSheet = partWb.Sheets[partWb.SheetNames[0]];
const partRows = XLSX.utils.sheet_to_json(partSheet, { header: 1 });
const expectedPartHeaders = [
  'Part Number', 'Part Name', 'Customer Name', 'Machine Number',
  'Machine Name', 'Machine Make', 'Machine Tonnage', 'Material Grade',
  'Part Weight', 'Runner Weight', 'Cycle Time', 'Cavity Count', 'Status'
];
assert.deepStrictEqual(partRows[0], expectedPartHeaders, '13 Columns must match exact headers');
console.log('✓ Radiance_Part_Master_Template.xlsx generated, valid XLSX, 13 headers verified, no corruption');

// 2. Test Rejection Master Template
console.log('\n2. Testing Rejection Master Template Excel Generation...');
const rejRes = await downloadRejectionMasterTemplate();
assert(rejRes.success, 'Rejection Master download returned success: false');
assert.strictEqual(rejRes.filename, 'Radiance_Rejection_Master_Template.xlsx');

const rejWb = XLSX.read(rejRes.buffer, { type: 'array' });
const rejSheet = rejWb.Sheets[rejWb.SheetNames[0]];
const rejRows = XLSX.utils.sheet_to_json(rejSheet, { header: 1 });
const expectedRejHeaders = ['Code', 'Description', 'Status'];
assert.deepStrictEqual(rejRows[0], expectedRejHeaders, 'Rejection headers must be Code, Description, Status');
console.log('✓ Radiance_Rejection_Master_Template.xlsx generated, valid XLSX, headers verified, no corruption');

// 3. Test Downtime Master Template
console.log('\n3. Testing Downtime Master Template Excel Generation...');
const dtRes = await downloadDowntimeMasterTemplate();
assert(dtRes.success, 'Downtime Master download returned success: false');
assert.strictEqual(dtRes.filename, 'Radiance_Downtime_Master_Template.xlsx');

const dtWb = XLSX.read(dtRes.buffer, { type: 'array' });
const dtSheet = dtWb.Sheets[dtWb.SheetNames[0]];
const dtRows = XLSX.utils.sheet_to_json(dtSheet, { header: 1 });
const expectedDtHeaders = ['Downtime Code', 'Description', 'Category', 'Status'];
assert.deepStrictEqual(dtRows[0], expectedDtHeaders, 'Downtime headers must be Downtime Code, Description, Category, Status');
console.log('✓ Radiance_Downtime_Master_Template.xlsx generated, valid XLSX, headers verified, no corruption');

// 4. Test Simulated Android Native Bridge (JavascriptInterface: window.AndroidExcelDownloader)
console.log('\n4. Testing Simulated Android Native Bridge (window.AndroidExcelDownloader)...');
let nativeCallReceived = false;
let savedFilename = '';
let savedBase64Length = 0;

// Setup mock window environment simulating Android WebView
global.window = {
  AndroidExcelDownloader: {
    saveExcelFile: (base64Data, filename) => {
      nativeCallReceived = true;
      savedFilename = filename;
      savedBase64Length = base64Data.length;
      return JSON.stringify({ success: true, path: `Downloads/${filename}` });
    }
  }
};

const nativeRes = await downloadUnifiedPartMasterTemplate();
assert(nativeRes.success, 'Native download failed');
assert(nativeCallReceived, 'Direct Android Java interface was not called');
assert.strictEqual(savedFilename, 'Radiance_Part_Master_Template.xlsx');
assert(savedBase64Length > 100, 'Base64 data must be populated');
assert.strictEqual(nativeRes.location, 'Downloads/Radiance_Part_Master_Template.xlsx');
assert(nativeRes.message.includes('Downloads/Radiance_Part_Master_Template.xlsx'), 'Message must indicate Downloads path');
console.log('✓ Android Native Bridge successfully intercepted download without intent errors!');
console.log(`  File target: ${nativeRes.location}`);
console.log(`  Base64 Payload Size: ${savedBase64Length} chars`);

// 5. Test Simulated Capacitor Plugin Bridge (window.Capacitor.Plugins.NativeDownloader)
console.log('\n5. Testing Simulated Capacitor Plugin Bridge...');
let pluginCallReceived = false;
global.window = {
  Capacitor: {
    isNativePlatform: () => true,
    Plugins: {
      NativeDownloader: {
        saveExcelFile: async ({ base64Data, filename }) => {
          pluginCallReceived = true;
          return { success: true, location: `Downloads/${filename}` };
        }
      }
    }
  }
};

const pluginRes = await downloadRejectionMasterTemplate();
assert(pluginRes.success, 'Plugin download failed');
assert(pluginCallReceived, 'Capacitor NativeDownloader plugin was not called');
assert.strictEqual(pluginRes.location, 'Downloads/Radiance_Rejection_Master_Template.xlsx');
console.log('✓ Capacitor NativeDownloader plugin fallback successfully routed download to Downloads folder');

// 6. Test Shift Report Excel Export Integration
console.log('\n6. Testing Production Shift Report Excel Export Integration...');
const mockReport = {
  id: 'RPT-20260917-MC03-A',
  reportDate: '2026-09-17',
  shift: 'Shift A',
  machineNumber: 'MC03',
  operatorName: 'Floor Operator',
  supervisorName: 'Mr. Lokesh',
  status: 'approved',
  mouldSessions: [
    {
      sessionSequence: 1,
      mouldNumber: 'MLD-001',
      partNumber: 'F53200000A',
      partName: 'Front Bezel Enclosure',
      entries: [
        {
          hourInterval: '08:00 - 09:00',
          theoreticalTarget: 360,
          productionQty: 350,
          rejectionQty: 5,
          acceptedQty: 345,
          downtimeMinutes: 0
        }
      ],
      materials: [
        { slot: 1, materialCode: 'PP-01', materialName: 'PP Copolymer', usedQuantityKg: 15 }
      ]
    }
  ]
};

const reportExportRes = await exportShiftReportToExcel(mockReport);
assert(reportExportRes.success, 'Shift report export failed');
assert(reportExportRes.location.includes('MC03'), 'Report export path must contain machine number');
console.log(`✓ Shift report export routed cleanly via universal downloader to: ${reportExportRes.location}`);

// Cleanup global mock
delete global.window;

console.log('\n====================================================');
console.log('🎉 ALL ANDROID EXCEL DOWNLOAD TESTS PASSED 100%!');
console.log('====================================================\n');
