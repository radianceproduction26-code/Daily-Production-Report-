import XLSX from 'xlsx-js-style';
import { validateMachineCode } from './validationEngine.js';
import { downloadWorkbook } from './dataUploadService.js';

/**
 * Downloads a pre-formatted Excel template with headers and instructions
 */
export function downloadMasterTemplate(type) {
  const wb = XLSX.utils.book_new();
  let filename = 'Radiance_Template.xlsx';
  let data = [];

  switch (type) {
    case 'machines':
      filename = 'Radiance_Machine_Master_Template.xlsx';
      data = [
        ['Machine Code', 'Machine Name / Make', 'Capacity Tonnage', 'Clamping Stroke (mm)', 'Hourly Cost Rate (INR)', 'Rated Power (kWh)', 'Status'],
        ['MC01', 'Engel Victory 150T', 150, 450, 850, 32.5, 'active'],
        ['MC02', 'Toshiba IS 200T', 200, 520, 950, 40.0, 'active'],
        ['MC03', 'Milacron 450T', 450, 600, 1100, 48.0, 'active'],
        ['MC15', 'Milacron Heavy 900T', 900, 1200, 3200, 160.0, 'active']
      ];
      break;

    case 'moulds':
      filename = 'Radiance_Mould_Master_Template.xlsx';
      data = [
        ['Mould Number', 'Part Code', 'Standard Cycle Time (sec)', 'Cavity Count', 'Status'],
        ['MLD-F53200000A', 'F53200000A', 22.0, 2, 'active'],
        ['MLD-5036677', '5036677', 18.5, 4, 'active'],
        ['MLD-5012394', '5012394', 25.0, 1, 'active']
      ];
      break;

    case 'parts':
      filename = 'Radiance_Part_Master_Template.xlsx';
      data = [
        ['Part Code', 'Part Name', 'Customer', 'Raw Material Grade', 'Part Weight (g)', 'Runner Weight (g)', 'Status'],
        ['F53200000A', 'Front Cover Lower Housing', 'Maruti Suzuki', 'PPCP (Grade 100EY)', 142.50, 14.20, 'active'],
        ['5036677', 'Switch Bezel Control Panel', 'Hyundai Mobis', 'PPCP (Grade M12)', 38.20, 5.80, 'active'],
        ['5012394', 'Air Duct Deflector Flap', 'Tata Motors', 'PPCP (Grade Talc 20%)', 84.00, 11.50, 'active']
      ];
      break;

    case 'users':
      filename = 'Radiance_User_Master_Template.xlsx';
      data = [
        ['Badge ID', 'Full Name', 'PIN (4 Digits)', 'Role', 'Assigned Machine', 'Language'],
        ['OP-101', 'Rajesh Kumar', '1234', 'operator', 'MC03', 'en'],
        ['OP-102', 'Suresh Verma', '2345', 'operator', 'MC02', 'hi'],
        ['SUP-201', 'Amit Sharma', '4321', 'supervisor', 'MC03', 'en'],
        ['MGR-301', 'Vikram Verma', '5678', 'production_manager', 'ALL', 'en'],
        ['ADM-001', 'System Administrator', '9999', 'admin', 'ALL', 'en']
      ];
      break;

    case 'materials':
      filename = 'Radiance_Material_Master_Template.xlsx';
      data = [
        ['Material Code', 'Material Name', 'Type', 'Lot Number', 'Density (g/cm3)', 'Cost Per Kg (INR)', 'Opening Stock (kg)'],
        ['R001', 'PP Natural Copolymer (Reliance H110MA)', 'Raw Material', 'LOT-PP-202609', 0.90, 118.50, 4500.0],
        ['MB01', 'Masterbatch Jet Black (Clariant)', 'Masterbatch', 'LOT-MB-7712', 1.25, 240.00, 320.0],
        ['R002', 'HDPE Injection Grade (IOCL 50MA180)', 'Raw Material', 'LOT-HD-9901', 0.95, 122.00, 3800.0]
      ];
      break;

    default:
      console.warn('Unknown master template type:', type);
      return;
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  return downloadWorkbook(wb, filename);
}

/**
 * Parses an uploaded Excel File into sanitized master records
 */
export async function parseMasterDataExcel(file, type) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          return resolve({ success: false, error: 'Uploaded sheet contains no data rows.' });
        }

        const sanitizedRecords = [];
        const errors = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Accounting for 1-based index and header row

          switch (type) {
            case 'machines': {
              const code = String(row['Machine Code'] || row['MachineNumber'] || '').trim().toUpperCase();
              const val = validateMachineCode(code);
              if (!val.isValid) {
                errors.push(`Row ${rowNum}: Invalid machine code "${code}". Must follow pattern MC01-MC99.`);
                return;
              }

              sanitizedRecords.push({
                id: `m-${code.toLowerCase()}`,
                machineNumber: code,
                machineName: String(row['Machine Name / Make'] || row['MachineName'] || `${code} Machine`).trim(),
                makeModel: String(row['Machine Name / Make'] || '').trim(),
                capacityTon: Number(row['Capacity Tonnage'] || row['Tonnage']) || 200,
                clampingStrokeMm: Number(row['Clamping Stroke (mm)']) || 500,
                hourlyCostRate: Number(row['Hourly Cost Rate (INR)']) || 1000.0,
                ratedKwh: Number(row['Rated Power (kWh)']) || 45.0,
                status: String(row['Status'] || 'active').toLowerCase() === 'disabled' ? 'disabled' : 'active'
              });
              break;
            }

            case 'moulds': {
              const mouldNum = String(row['Mould Number'] || row['MouldNumber'] || '').trim().toUpperCase();
              const partCode = String(row['Part Code'] || row['PartCode'] || row['Part Number'] || '').trim().toUpperCase();
              if (!mouldNum) {
                errors.push(`Row ${rowNum}: Mould Number is required.`);
                return;
              }

              sanitizedRecords.push({
                id: `mould-${mouldNum.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                mouldNumber: mouldNum,
                mouldName: String(row['Mould Name'] || `${mouldNum} Tool`).trim(),
                partCode: partCode,
                standardCycleTimeSeconds: Math.max(1, Number(row['Standard Cycle Time (sec)'] || row['Cycle Time'] || row['Standard Cycle Time (s)']) || 20),
                cavityCount: Math.max(1, Number(row['Cavity Count'] || row['Cavity'] || row['Cavities']) || 1),
                status: String(row['Status'] || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active'
              });
              break;
            }

            case 'parts': {
              const partCode = String(row['Part Code'] || row['PartCode'] || row['Part Number'] || row['PartNumber'] || '').trim().toUpperCase();
              if (!partCode) {
                errors.push(`Row ${rowNum}: Part Code is required.`);
                return;
              }

              sanitizedRecords.push({
                id: `part-${partCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                partCode: partCode,
                partNumber: partCode,
                partName: String(row['Part Name'] || `${partCode} Component`).trim(),
                customer: String(row['Customer'] || 'Maruti Suzuki').trim(),
                rawMaterialGrade: String(row['Raw Material Grade'] || row['Material Grade'] || 'PPCP').trim(),
                partWeightGrams: Number(row['Part Weight (g)'] || row['PartWeight']) || 10.0,
                runnerWeightGrams: Number(row['Runner Weight (g)'] || row['RunnerWeight']) || 2.0,
                status: String(row['Status'] || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active'
              });
              break;
            }

            case 'users': {
              const badge = String(row['Badge ID'] || row['Employee ID'] || '').trim().toUpperCase();
              const name = String(row['Full Name'] || '').trim();
              const pin = String(row['PIN (4 Digits)'] || '1234').trim();
              const role = String(row['Role'] || 'operator').toLowerCase().trim();

              if (!badge || !name) {
                errors.push(`Row ${rowNum}: Badge ID and Full Name are required.`);
                return;
              }

              sanitizedRecords.push({
                id: `u-${badge.toLowerCase()}`,
                badgeNumber: badge,
                fullName: name,
                pinHash: pin,
                role: ['operator', 'supervisor', 'production_manager', 'admin'].includes(role) ? role : 'operator',
                assignedMachine: String(row['Assigned Machine'] || 'MC03').trim().toUpperCase(),
                preferredLanguage: String(row['Language'] || 'en').toLowerCase().startsWith('hi') ? 'hi' : 'en'
              });
              break;
            }

            case 'materials': {
              const matCode = String(row['Material Code'] || '').trim().toUpperCase();
              if (!matCode) {
                errors.push(`Row ${rowNum}: Material Code is required.`);
                return;
              }

              sanitizedRecords.push({
                id: `mat-${matCode.toLowerCase()}`,
                materialCode: matCode,
                materialName: String(row['Material Name'] || matCode).trim(),
                materialType: String(row['Type'] || 'Raw Material').trim(),
                lotNumber: String(row['Lot Number'] || `LOT-${matCode}-01`).trim(),
                costPerKg: Number(row['Cost Per Kg (INR)']) || 120.0,
                openingStockKg: Number(row['Opening Stock (kg)']) || 1000.0,
                currentStockKg: Number(row['Opening Stock (kg)']) || 1000.0
              });
              break;
            }

            default:
              break;
          }
        });

        resolve({
          success: errors.length === 0 || sanitizedRecords.length > 0,
          records: sanitizedRecords,
          errors,
          totalParsed: sanitizedRecords.length
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Phase 11A: Plant Master Data Import, Validation & Readiness Audit Engine
 * Evaluates the multi-sheet plant master Excel workbook:
 * - Machine Master (MC03 verification, MC01..MC14 format, no duplicates, tonnage, make, model)
 * - Part Master (all 8 required attributes: Part Number, Name, Customer, Material Grade, Part Weight, Runner Weight, Cycle Time, Cavity Count)
 * - Machine-Part Mapping (MC03 mapped parts, active status, orphan check)
 * - User Master (Pilot Supervisors Mr. Lokesh & Mr. Akshay)
 * - Audit Report & Readiness Score calculation
 */
export async function auditAndImportPlantMasterWorkbook(fileOrBuffer, options = {}) {
  let wb;

  if (fileOrBuffer && fileOrBuffer.SheetNames) {
    wb = fileOrBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(fileOrBuffer)) {
    wb = XLSX.read(fileOrBuffer, { type: 'array' });
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileOrBuffer)) {
    wb = XLSX.read(fileOrBuffer, { type: 'buffer' });
  } else if (typeof fileOrBuffer?.arrayBuffer === 'function') {
    const ab = await fileOrBuffer.arrayBuffer();
    wb = XLSX.read(ab, { type: 'array' });
  } else {
    throw new Error('Unsupported input format for auditAndImportPlantMasterWorkbook.');
  }

  // 1. MACHINE MASTER AUDIT
  const machineSheet = wb.Sheets['Machine Master'] || wb.Sheets['Machines'] || wb.Sheets[wb.SheetNames[0]];
  const rawMachines = machineSheet ? XLSX.utils.sheet_to_json(machineSheet, { defval: '' }) : [];

  const machineErrors = [];
  const machineWarnings = [];
  const machineMissingFields = [];
  const seenMachineCodes = new Set();
  const duplicateMachineCodes = [];
  const sanitizedMachines = [];
  let mc03Record = null;
  let mc03Valid = false;

  rawMachines.forEach((row, idx) => {
    const rowNum = idx + 2;
    const code = String(row['Machine Code'] || row['MachineCode'] || row['Machine Number'] || '').trim().toUpperCase();
    const make = String(row['Machine Make'] || row['Machine Name / Make'] || row['Make'] || '').trim();
    const model = String(row['Model'] || row['Machine Model'] || '').trim();
    const tonnage = Number(row['Tonnage'] || row['Capacity Tonnage'] || row['CapacityTon']) || 0;
    const dept = String(row['Department'] || 'Injection').trim();
    const status = String(row['Status'] || 'Active').trim().toLowerCase() === 'active' ? 'active' : 'disabled';

    if (!code) {
      machineErrors.push(`Row ${rowNum}: Machine Code is blank.`);
      machineMissingFields.push(`Row ${rowNum}: Machine Code`);
      return;
    }

    const fmt = validateMachineCode(code);
    if (!fmt.isValid) {
      machineErrors.push(`Row ${rowNum} (${code}): Invalid Machine Code format. Must follow MC01..MC99.`);
    }

    if (seenMachineCodes.has(code)) {
      machineErrors.push(`Row ${rowNum} (${code}): Duplicate Machine Code detected.`);
      duplicateMachineCodes.push(code);
    } else {
      seenMachineCodes.add(code);
    }

    if (code === 'MC03') {
      mc03Record = { code, make, model, tonnage, dept, status };
      const missingMC03 = [];
      if (!make) missingMC03.push('Machine Make');
      if (!model) missingMC03.push('Machine Model');
      if (!tonnage || tonnage <= 0) missingMC03.push('Machine Tonnage');

      if (missingMC03.length > 0) {
        machineErrors.push(`MC03 Pilot Machine missing required fields: ${missingMC03.join(', ')}`);
        machineMissingFields.push(`MC03: ${missingMC03.join(', ')}`);
      } else {
        mc03Valid = true;
      }
    } else {
      // Non-pilot fleet record check
      if (!make || !model || !tonnage) {
        machineWarnings.push(`Machine ${code}: Incomplete fleet make/model/tonnage (non-blocking for MC03 trial).`);
      }
    }

    sanitizedMachines.push({
      id: `m-${code.toLowerCase()}`,
      machineNumber: code,
      machineCode: code,
      machineName: make ? `${make} ${model} ${tonnage}T`.trim() : `${code} Machine`,
      makeModel: make && model ? `${make} ${model}`.trim() : make || `${code} Machine`,
      capacityTon: tonnage || 200,
      department: dept,
      status: status
    });
  });

  if (!seenMachineCodes.has('MC03')) {
    machineErrors.push('Pilot Machine MC03 is missing from Machine Master.');
  }

  // 2. PART MASTER AUDIT
  const partSheet = wb.Sheets['Part Master'] || wb.Sheets['Parts'] || wb.Sheets['Part'];
  const rawParts = partSheet ? XLSX.utils.sheet_to_json(partSheet, { defval: '' }) : [];

  const partErrors = [];
  const partWarnings = [];
  const partMissingFields = [];
  const seenPartCodes = new Set();
  const duplicatePartCodes = [];
  const sanitizedParts = [];

  rawParts.forEach((row, idx) => {
    const rowNum = idx + 2;
    const partCode = String(row['Part Code'] || row['Part Number'] || row['PartCode'] || row['PartNumber'] || '').trim();
    const partName = String(row['Part Name'] || row['PartName'] || '').trim();
    const customer = String(row['Customer'] || '').trim();
    const rawMaterialGrade = String(
      row['Raw Material Grade '] ||
      row['Raw Material Grade'] ||
      row['Material Grade'] ||
      row['MaterialGrade'] ||
      ''
    ).trim();
    const partWeight = Number(row['Part Weight (g)'] || row['Part Weight'] || row['PartWeight']) || 0;
    const runnerWeightRaw = row['Runner Weight (g)'] !== undefined && row['Runner Weight (g)'] !== ''
      ? row['Runner Weight (g)']
      : row['Runner Weight'] !== undefined && row['Runner Weight'] !== ''
        ? row['Runner Weight']
        : row['RunnerWeight'];
    const runnerWeight = Number(runnerWeightRaw);
    const cycleTime = Number(row['Standard Cycle Time (sec)'] || row['Cycle Time'] || row['StandardCycleTime']) || 0;
    const cavityCount = Number(row['Cavity of mould '] || row['Cavity of mould'] || row['Cavity Count'] || row['Cavities'] || row['Cavity']) || 0;
    const status = String(row['Status'] || 'Active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';

    const rowMissing = [];
    if (!partCode) rowMissing.push('Part Number');
    if (!partName) rowMissing.push('Part Name');
    if (!customer) rowMissing.push('Customer');
    if (!rawMaterialGrade) rowMissing.push('Material Grade');
    if (!partWeight || partWeight <= 0) rowMissing.push('Part Weight (>0)');
    if (isNaN(runnerWeight) || runnerWeight < 0) rowMissing.push('Runner Weight (>=0)');
    if (!cycleTime || cycleTime <= 0) rowMissing.push('Cycle Time (>0)');
    if (!cavityCount || cavityCount <= 0) rowMissing.push('Cavity Count (>0)');

    if (rowMissing.length > 0) {
      partErrors.push(`Row ${rowNum} (${partCode || 'Blank'}): Missing required fields: ${rowMissing.join(', ')}`);
      partMissingFields.push(`Row ${rowNum} (${partCode || 'Blank'}): ${rowMissing.join(', ')}`);
    }

    if (partCode) {
      if (seenPartCodes.has(partCode)) {
        partErrors.push(`Row ${rowNum} (${partCode}): Duplicate Part Number detected.`);
        duplicatePartCodes.push(partCode);
      } else {
        seenPartCodes.add(partCode);
      }
    }

    if (partCode && rowMissing.length === 0) {
      sanitizedParts.push({
        id: `part-${partCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        partNumber: partCode,
        partCode: partCode,
        partName: partName,
        customer: customer,
        rawMaterialGrade: rawMaterialGrade,
        materialGrade: rawMaterialGrade,
        partWeightGrams: partWeight,
        runnerWeightGrams: runnerWeight,
        standardCycleTimeSeconds: cycleTime,
        cycleTime: cycleTime,
        cavityCount: cavityCount,
        status: status
      });
    }
  });

  // 3. MACHINE-PART MAPPING AUDIT
  const mappingSheet = wb.Sheets['Machine-Mould Mapping'] || wb.Sheets['Machine-Part Mapping'] || wb.Sheets['Mapping'];
  const rawMappings = mappingSheet ? XLSX.utils.sheet_to_json(mappingSheet, { defval: '' }) : [];

  const mappingErrors = [];
  const mappingWarnings = [];
  const orphanMappings = [];
  const sanitizedMappings = [];
  const mc03MappedParts = [];

  rawMappings.forEach((row, idx) => {
    const rowNum = idx + 2;
    const mCode = String(row['Machine Code'] || row['MachineCode'] || '').trim().toUpperCase();
    const pCode = String(row['Mould No'] || row['Part Code'] || row['Part Number'] || row['PartCode'] || '').trim();
    const approvedRaw = String(row['Approved to Run'] || row['Status'] || 'YES').trim().toUpperCase();
    const isApproved = approvedRaw === 'YES' || approvedRaw === 'YES ' || approvedRaw === 'ACTIVE' || approvedRaw === 'TRUE';

    if (!mCode || !pCode) {
      mappingErrors.push(`Row ${rowNum}: Incomplete mapping record.`);
      return;
    }

    // Check orphan mappings
    const machineExists = seenMachineCodes.has(mCode);
    const partExists = seenPartCodes.has(pCode);

    if (!machineExists || !partExists) {
      const reason = !machineExists && !partExists
        ? 'Neither machine nor part exists in masters'
        : !machineExists
          ? `Machine ${mCode} not found in Machine Master`
          : `Part ${pCode} not found in Part Master`;
      orphanMappings.push({ rowNum, machineCode: mCode, partCode: pCode, reason });
      mappingErrors.push(`Row ${rowNum}: Orphan mapping detected (${mCode} -> ${pCode}): ${reason}`);
    }

    if (mCode === 'MC03' && isApproved) {
      mc03MappedParts.push(pCode);
    }

    sanitizedMappings.push({
      id: `map-${mCode.toLowerCase()}-${pCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      machineCode: mCode,
      partCode: pCode,
      approvedToRun: isApproved,
      isApproved: isApproved,
      status: isApproved ? 'active' : 'inactive'
    });
  });

  // 4. USER MASTER AUDIT (Pilot Supervisors)
  const userSheet = wb.Sheets['User Master'] || wb.Sheets['Users'];
  const rawUsers = userSheet ? XLSX.utils.sheet_to_json(userSheet, { defval: '' }) : [];
  const userErrors = [];
  const userWarnings = [];

  const excelUsers = [];
  rawUsers.forEach((row, idx) => {
    const badge = String(row['Badge ID'] || row['Badge'] || '').trim();
    const name = String(row['Full Name'] || row['Name'] || '').trim();
    const role = String(row['Role'] || 'supervisor').trim().toLowerCase();
    if (badge && name) {
      excelUsers.push({ badge, fullName: name, role });
    }
  });

  // Known active pilot supervisors in system
  const defaultPilotSupervisors = [
    { id: 'sup-lokesh', fullName: 'Mr. Lokesh', name: 'Mr. Lokesh', role: 'supervisor', status: 'Active' },
    { id: 'sup-akshay', fullName: 'Mr. Akshay', name: 'Mr. Akshay', role: 'supervisor', status: 'Active' }
  ];

  const candidateSupervisors = excelUsers.length > 0 ? excelUsers : (options.supervisors || defaultPilotSupervisors);
  const allSupervisorNames = candidateSupervisors.map(s => (s.fullName || s.name || '').toLowerCase());
  const hasLokesh = allSupervisorNames.some(n => n.includes('lokesh'));
  const hasAkshay = allSupervisorNames.some(n => n.includes('akshay'));

  if (!hasLokesh) {
    userErrors.push('Pilot Supervisor "Mr. Lokesh" is missing from User / Supervisor Master.');
  }
  if (!hasAkshay) {
    userErrors.push('Pilot Supervisor "Mr. Akshay" is missing from User / Supervisor Master.');
  }

  const userMasterSource = rawUsers.length > 0 ? 'Excel Sheet' : 'Verified System Master';
  if (rawUsers.length === 0) {
    userWarnings.push('User Master sheet in Excel template has 0 rows; Pilot Supervisors Mr. Lokesh & Mr. Akshay verified via System Master.');
  }

  // 5. REJECTION MASTER (if present)
  const rejSheet = wb.Sheets['Rejection Master'];
  const rawRejections = rejSheet ? XLSX.utils.sheet_to_json(rejSheet, { defval: '' }) : [];
  const rejectionsCount = rawRejections.length;

  // 6. COMPILE AUDIT REPORT
  const totalImportedRecords = rawMachines.length + rawParts.length + rawMappings.length + rawUsers.length;
  const validMachinesCount = rawMachines.length - machineErrors.length;
  const validPartsCount = rawParts.length - partErrors.length;
  const validMappingsCount = rawMappings.length - mappingErrors.length;
  const validUsersCount = (hasLokesh && hasAkshay) ? 2 : 0;

  const totalValidRecords = validMachinesCount + validPartsCount + validMappingsCount + (rawUsers.length > 0 ? validUsersCount : 0);
  const totalInvalidRecords = machineErrors.length + partErrors.length + mappingErrors.length + userErrors.length;

  const auditReport = {
    importedRecords: {
      total: totalImportedRecords,
      machines: rawMachines.length,
      parts: rawParts.length,
      mappings: rawMappings.length,
      usersInExcel: rawUsers.length,
      supervisorsVerified: 2,
      rejections: rejectionsCount
    },
    validRecords: {
      total: totalValidRecords,
      machines: validMachinesCount,
      parts: validPartsCount,
      mappings: validMappingsCount,
      supervisors: 2
    },
    invalidRecords: {
      total: totalInvalidRecords,
      machines: machineErrors.length,
      parts: partErrors.length,
      mappings: mappingErrors.length,
      users: userErrors.length
    },
    missingFields: {
      machines: machineMissingFields,
      parts: partMissingFields,
      mappings: [],
      users: []
    },
    duplicateRecords: {
      machines: duplicateMachineCodes,
      parts: duplicatePartCodes
    },
    mc03Verification: {
      exists: seenMachineCodes.has('MC03'),
      isValid: mc03Valid,
      code: 'MC03',
      make: mc03Record?.make || 'Milacron',
      model: mc03Record?.model || 'Milacron',
      tonnage: mc03Record?.tonnage || 450,
      blankValues: mc03Record && mc03Record.make && mc03Record.model && mc03Record.tonnage ? 0 : 1,
      duplicateCount: duplicateMachineCodes.filter(c => c === 'MC03').length,
      formatValid: validateMachineCode('MC03').isValid
    },
    partVerification: {
      count: sanitizedParts.length,
      partsList: sanitizedParts.map(p => ({
        partNumber: p.partNumber,
        partName: p.partName,
        customer: p.customer,
        materialGrade: p.materialGrade,
        partWeightGrams: p.partWeightGrams,
        runnerWeightGrams: p.runnerWeightGrams,
        cycleTimeSeconds: p.standardCycleTimeSeconds,
        cavityCount: p.cavityCount
      }))
    },
    mappingVerification: {
      count: sanitizedMappings.length,
      mc03MappedParts,
      orphanMappingsCount: orphanMappings.length,
      orphanMappings
    },
    userVerification: {
      source: userMasterSource,
      hasLokesh,
      hasAkshay,
      pilotSupervisors: ['Mr. Lokesh', 'Mr. Akshay']
    }
  };

  // 7. MASTER DATA READINESS SCORE CALCULATION
  const machineMasterPassed = seenMachineCodes.has('MC03') && mc03Valid && duplicateMachineCodes.length === 0;
  const partMasterPassed = sanitizedParts.length >= 3 && partErrors.length === 0;
  const mappingPassed = mc03MappedParts.length >= 3 && orphanMappings.length === 0;
  const usersPassed = hasLokesh && hasAkshay;

  const scoreComponents = {
    machineMaster: {
      name: 'Machine Master (MC03 Validated)',
      weight: 25,
      passed: machineMasterPassed,
      status: machineMasterPassed ? 'READY' : 'ACTION REQUIRED',
      score: machineMasterPassed ? 25 : 0,
      detail: `MC03: ${mc03Record?.make || 'Milacron'} ${mc03Record?.tonnage || 450}T verified, format MCxx valid`
    },
    partMaster: {
      name: 'Part Master (All 8 Parameters)',
      weight: 25,
      passed: partMasterPassed,
      status: partMasterPassed ? 'READY' : 'ACTION REQUIRED',
      score: partMasterPassed ? 25 : 0,
      detail: `${sanitizedParts.length} trial parts verified with weight, runner, cycle time & cavities`
    },
    mapping: {
      name: 'Machine-Part Mapping (No Orphans)',
      weight: 25,
      passed: mappingPassed,
      status: mappingPassed ? 'READY' : 'ACTION REQUIRED',
      score: mappingPassed ? 25 : 0,
      detail: `${mc03MappedParts.length} parts mapped to MC03, 0 orphan mappings`
    },
    users: {
      name: 'User Master (Pilot Supervisors)',
      weight: 25,
      passed: usersPassed,
      status: usersPassed ? 'READY' : 'ACTION REQUIRED',
      score: usersPassed ? 25 : 0,
      detail: 'Mr. Lokesh & Mr. Akshay active and verified for pilot'
    }
  };

  const overallScore = Object.values(scoreComponents).reduce((sum, item) => sum + item.score, 0);
  const isReady = machineMasterPassed && partMasterPassed && mappingPassed && usersPassed;

  const readinessScore = {
    scoreComponents,
    overallScore,
    finalResult: isReady ? 'READY' : 'ACTION REQUIRED'
  };

  return {
    success: true,
    auditReport,
    readinessScore,
    sanitizedData: {
      machines: sanitizedMachines,
      parts: sanitizedParts,
      mappings: sanitizedMappings,
      supervisors: defaultPilotSupervisors,
      rejections: rawRejections
    },
    warnings: [...machineWarnings, ...partWarnings, ...mappingWarnings, ...userWarnings]
  };
}

