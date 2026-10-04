import XLSX from 'xlsx-js-style';
import { normalizeMachineCode, normalizeMachineCodes } from './storageService.js';

// Universal Excel Download Helper supporting Desktop Chrome, Android Chrome, and Android APK
export async function downloadWorkbook(wb, filename) {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    // Check if running on Android native platform (Capacitor or WebView interface)
    const isNativeAndroid = typeof window !== 'undefined' && (
      !!window.AndroidExcelDownloader ||
      (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
      !!window.Capacitor?.Plugins?.NativeDownloader
    );

    if (isNativeAndroid) {
      // 1. Primary Native Android Bridge (Direct JavascriptInterface)
      if (window.AndroidExcelDownloader && typeof window.AndroidExcelDownloader.saveExcelFile === 'function') {
        try {
          const raw = window.AndroidExcelDownloader.saveExcelFile(base64Data, filename);
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return {
            success: true,
            filename,
            location: parsed?.path || `Downloads/${filename}`,
            message: `Template downloaded successfully\n\nLocation:\nDownloads/${filename}`
          };
        } catch (bridgeErr) {
          console.warn('AndroidExcelDownloader bridge error:', bridgeErr);
        }
      }

      // 2. Secondary Native Android Bridge (Capacitor NativeDownloader Plugin)
      if (window.Capacitor?.Plugins?.NativeDownloader?.saveExcelFile) {
        try {
          const res = await window.Capacitor.Plugins.NativeDownloader.saveExcelFile({ base64Data, filename });
          return {
            success: true,
            filename,
            location: res?.location || `Downloads/${filename}`,
            message: `Template downloaded successfully\n\nLocation:\nDownloads/${filename}`
          };
        } catch (pluginErr) {
          console.warn('NativeDownloader plugin error:', pluginErr);
        }
      }
    }

    // 3. Desktop Chrome / Android Chrome browser mode (standard HTML5 Blob anchor download)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 1500);

      return {
        success: true,
        filename,
        location: `Downloads/${filename}`,
        message: `Template downloaded successfully\n\nLocation:\nDownloads/${filename}`
      };
    }

    return { success: true, filename, buffer: wbout, location: `Downloads/${filename}` };
  } catch (err) {
    console.error('downloadWorkbook error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Downloads the official 13-column Unified Part Master template.
 * Uploading this single template automatically creates Parts, Machines, and Machine-Part Mappings.
 * Official Filename: Radiance_Part_Master_Template.xlsx
 */
export async function downloadUnifiedPartMasterTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    {
      'Part Number': 'F53200000A',
      'Part Name': 'Front Bezel Enclosure',
      'Customer Name': 'Schneider Electric',
      'Machine Number': 'MC03',
      'Machine Name': 'Milacron 450T',
      'Machine Make': 'Milacron Magna T-450',
      'Machine Tonnage': 450,
      'Material Grade': 'PP Copolymer 575P',
      'Part Weight': 42.5,
      'Runner Weight': 5.2,
      'Cycle Time': 20.0,
      'Cavity Count': 2,
      'Status': 'active'
    },
    {
      'Part Number': '5036677',
      'Part Name': 'Terminal Cover Plate',
      'Customer Name': 'Bosch Automotive',
      'Machine Number': 'MC04',
      'Machine Name': 'Milacron 350T',
      'Machine Make': 'Milacron Magna T-350',
      'Machine Tonnage': 350,
      'Material Grade': 'Nylon 6 30% GF',
      'Part Weight': 28.0,
      'Runner Weight': 4.0,
      'Cycle Time': 15.0,
      'Cavity Count': 4,
      'Status': 'active'
    },
    {
      'Part Number': '5012394',
      'Part Name': 'Switch Housing Bracket',
      'Customer Name': 'Tata Motors',
      'Machine Number': 'MC05',
      'Machine Name': 'Milacron 250T',
      'Machine Make': 'Milacron Magna T-250',
      'Machine Tonnage': 250,
      'Material Grade': 'ABS Hi-Impact AF312',
      'Part Weight': 35.0,
      'Runner Weight': 4.5,
      'Cycle Time': 25.0,
      'Cavity Count': 2,
      'Status': 'active'
    },
    {
      'Part Number': 'F53200000A',
      'Part Name': 'Front Bezel Enclosure',
      'Customer Name': 'Schneider Electric',
      'Machine Number': 'MC06',
      'Machine Name': 'Milacron 180T',
      'Machine Make': 'Milacron Magna T-180',
      'Machine Tonnage': 180,
      'Material Grade': 'PP Copolymer 575P',
      'Part Weight': 42.5,
      'Runner Weight': 5.2,
      'Cycle Time': 20.0,
      'Cavity Count': 2,
      'Status': 'active'
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, {
    header: [
      'Part Number',
      'Part Name',
      'Customer Name',
      'Machine Number',
      'Machine Name',
      'Machine Make',
      'Machine Tonnage',
      'Material Grade',
      'Part Weight',
      'Runner Weight',
      'Cycle Time',
      'Cavity Count',
      'Status'
    ]
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Part Master');
  return await downloadWorkbook(wb, 'Radiance_Part_Master_Template.xlsx');
}

/**
 * Downloads the official Rejection Reason Master template.
 * Official Filename: Radiance_Rejection_Master_Template.xlsx
 */
export async function downloadRejectionMasterTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    { 'Code': 'A', 'Description': 'Burn Mark', 'Status': 'active' },
    { 'Code': 'B', 'Description': 'Flash', 'Status': 'active' },
    { 'Code': 'C', 'Description': 'Short Shot', 'Status': 'active' },
    { 'Code': 'D', 'Description': 'Black Dot', 'Status': 'active' },
    { 'Code': 'E', 'Description': 'Sink Mark', 'Status': 'active' },
    { 'Code': 'F', 'Description': 'Silver Mark', 'Status': 'active' },
    { 'Code': 'G', 'Description': 'Flow Mark', 'Status': 'active' },
    { 'Code': 'H', 'Description': 'Jetting', 'Status': 'active' },
    { 'Code': 'I', 'Description': 'Warpage', 'Status': 'active' },
    { 'Code': 'J', 'Description': 'Dent Mark', 'Status': 'active' }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, {
    header: ['Code', 'Description', 'Status']
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Rejection Master');
  return await downloadWorkbook(wb, 'Radiance_Rejection_Master_Template.xlsx');
}

/**
 * Downloads the official Downtime Reason Master template.
 * Official Filename: Radiance_Downtime_Master_Template.xlsx
 */
export async function downloadDowntimeMasterTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    { 'Downtime Code': 'DT-001', 'Description': 'Machine Breakdown', 'Category': 'Machine Related', 'Status': 'active' },
    { 'Downtime Code': 'DT-002', 'Description': 'Mould Cleaning', 'Category': 'Mould Related', 'Status': 'active' },
    { 'Downtime Code': 'DT-003', 'Description': 'Material Not Available', 'Category': 'Material Related', 'Status': 'active' },
    { 'Downtime Code': 'DT-004', 'Description': 'Power Failure', 'Category': 'Utility Related', 'Status': 'active' },
    { 'Downtime Code': 'DT-005', 'Description': 'Tool Change', 'Category': 'Mould Related', 'Status': 'active' }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, {
    header: ['Downtime Code', 'Description', 'Category', 'Status']
  });
  XLSX.utils.book_append_sheet(wb, ws, 'Downtime Master');
  return await downloadWorkbook(wb, 'Radiance_Downtime_Master_Template.xlsx');
}

/**
 * Downloads a pre-formatted Excel template with sample reference data.
 */
export async function downloadTemplate(type) {
  switch (type) {
    case 'part':
    case 'part_master':
    case 'unified':
      return await downloadUnifiedPartMasterTemplate();

    case 'rejection':
    case 'rejection_master':
      return await downloadRejectionMasterTemplate();

    case 'downtime':
    case 'downtime_master':
      return await downloadDowntimeMasterTemplate();

    case 'machine': {
      const wb = XLSX.utils.book_new();
      const data = [
        {
          'Machine Number': 'MC03',
          'Machine Name': 'Milacron 450T',
          'Make / Model': 'Milacron Magna T-450',
          'Capacity (Tons)': 450,
          'Hourly Cost Rate': 1750,
          'Status': 'active'
        },
        {
          'Machine Number': 'MC01',
          'Machine Name': 'Engel Victory 150T',
          'Make / Model': 'Engel Victory 330/150',
          'Capacity (Tons)': 150,
          'Hourly Cost Rate': 850,
          'Status': 'active'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Machine Master');
      return await downloadWorkbook(wb, 'Radiance_Machine_Master_Template.xlsx');
    }

    case 'mapping': {
      const wb = XLSX.utils.book_new();
      const data = [
        {
          'Machine Code': 'MC03',
          'Part Code': 'F53200000A',
          'Mould Number': 'MLD-F53200000A',
          'Approved To Run': 'YES'
        },
        {
          'Machine Code': 'MC03',
          'Part Code': '5036677',
          'Mould Number': 'MLD-5036677',
          'Approved To Run': 'YES'
        },
        {
          'Machine Code': 'MC03',
          'Part Code': '5012394',
          'Mould Number': 'MLD-5012394',
          'Approved To Run': 'YES'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Machine-Part Mapping');
      return await downloadWorkbook(wb, 'Radiance_Machine_Part_Mapping_Template.xlsx');
    }

    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}

/**
 * Normalizes an object's keys by converting them to lowercase and stripping special chars.
 */
function normalizeRowKeys(row) {
  const normalized = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = v;
  }
  return normalized;
}

/**
 * Validates and parses the 13-column Unified Part Master Excel sheet.
 * Automatically generates normalized arrays of Parts, Machines, and Machine-Part Mappings.
 */
export function parseUnifiedPartMasterExcel(arrayBuffer) {
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { success: false, error: 'Excel workbook contains no sheets.' };
    }

    let rowsProcessed = 0;
    let rejected = 0;
    const errors = [];
    const partsMap = new Map();
    const machinesMap = new Map();
    const mappingsMap = new Map();

    const stdFleetDefaults = {
      'MC03': { name: 'Milacron 450T', tonnage: 450, make: 'Milacron', model: '450T' },
      'MC04': { name: 'Milacron 350T', tonnage: 350, make: 'Milacron', model: '350T' },
      'MC05': { name: 'Milacron 250T', tonnage: 250, make: 'Milacron', model: '250T' },
      'MC06': { name: 'Milacron 180T', tonnage: 180, make: 'Milacron', model: '180T' },
    };

    const registerMachine = (mc, mName, mMake, mTonnage) => {
      if (!machinesMap.has(mc)) {
        const def = stdFleetDefaults[mc] || { name: `${mc} Injection Press`, tonnage: 250, make: 'Milacron', model: '' };
        machinesMap.set(mc, {
          id: `m-${mc.toLowerCase()}`,
          machineNumber: mc,
          machineCode: mc,
          machineName: (mName && !mName.includes('Production IMM')) ? mName : def.name,
          makeModel: mMake || `${def.make} ${def.model}`,
          make: mMake || def.make,
          model: def.model,
          capacityTon: mTonnage > 0 ? mTonnage : def.tonnage,
          tonnage: mTonnage > 0 ? mTonnage : def.tonnage,
          hourlyCostRate: 1500,
          status: 'active'
        });
      }
    };
    // 1. Process all sheets in the workbook (handles single-sheet and multi-sheet workbooks)
    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;
      const rawRows = XLSX.utils.sheet_to_json(sheet);
      if (!Array.isArray(rawRows) || rawRows.length === 0) return;

      rawRows.forEach((r, idx) => {
        const row = normalizeRowKeys(r);

        // Ultra-flexible Part Number detection
        let partNumber = (
          row['partnumber'] || row['partno'] || row['partcode'] || row['part'] ||
          row['itemcode'] || row['itemno'] || row['itemnumber'] || row['fgcode'] ||
          row['fgno'] || row['productcode'] || row['componentcode'] || row['componentno'] ||
          row['toolno'] || row['mouldnumber'] || row['mouldno'] ||
          ''
        ).toString().trim();

        if (!partNumber) {
          // Fallback: check any key containing 'part', 'item', or 'fg'
          for (const [k, v] of Object.entries(row)) {
            if ((k.includes('part') || k.includes('item') || k.includes('fg')) &&
                !k.includes('name') && !k.includes('desc') && !k.includes('weight') &&
                !k.includes('time') && !k.includes('count') && !k.includes('cycle') && v) {
              partNumber = String(v).trim();
              if (partNumber) break;
            }
          }
        }

        // If this row has no part number, skip
        if (!partNumber) return;

        // Ultra-flexible Machine Number detection
        let rawMachine = (
          row['machinenumber'] || row['machineno'] || row['machinecode'] || row['machine'] ||
          row['mcno'] || row['mc'] || row['mccode'] || row['line'] || row['lineno'] ||
          row['linenumber'] || row['press'] || row['pressno'] || row['machinename'] ||
          row['targetmachine'] || row['equipment'] || row['station'] ||
          ''
        ).toString().trim();

        if (!rawMachine) {
          // Fallback: check any key containing 'machine', 'mc', 'press', or 'line'
          for (const [k, v] of Object.entries(row)) {
            if ((k.includes('machine') || k.includes('mc') || k.includes('press') || k.includes('line')) &&
                !k.includes('name') && !k.includes('make') && !k.includes('tonnage') && v) {
              rawMachine = String(v).trim();
              if (rawMachine) break;
            }
          }
        }

        const partName = (
          row['partname'] || row['partdescription'] || row['description'] || row['desc'] ||
          row['itemname'] || row['itemdescription'] || row['name'] || row['componentname'] ||
          partNumber
        ).toString().trim();

        const customerName = (
          row['customername'] || row['customer'] || row['client'] || row['oem'] || row['buyer'] || 'Internal'
        ).toString().trim();

        const materialGrade = (
          row['materialgrade'] || row['rawmaterialgrade'] || row['material'] || row['resin'] || row['grade'] || 'Standard Grade'
        ).toString().trim();

        const partWeight = Number(row['partweightg'] || row['partweight'] || row['weight'] || row['shotweight']) || 0;
        const runnerWeight = Number(row['runnerweightg'] || row['runnerweight'] || row['runner']) || 0;
        const cycleTime = Number(row['cycletimesec'] || row['cycletime'] || row['standardcycletimes'] || row['standardcycletime'] || row['stdcycletime'] || row['ct'] || row['stdct'] || row['cycletimes'] || row['cycletimeseconds']) || 20.0;
        const cavityCount = Number(row['cavitycount'] || row['cavities'] || row['cavity'] || row['noofcavities'] || row['noofcavity'] || row['cavityno']) || 1;
        const status = (row['status'] || row['active'] || 'active').toString().toLowerCase().trim();

        // 1. Register / Update Part
        if (!partsMap.has(partNumber)) {
          partsMap.set(partNumber, {
            id: `part-${partNumber.toLowerCase()}`,
            partCode: partNumber,
            partNumber: partNumber,
            partName: partName || partNumber,
            customer: customerName,
            rawMaterialGrade: materialGrade,
            partWeightGrams: partWeight,
            runnerWeightGrams: runnerWeight,
            standardCycleTimeSeconds: cycleTime,
            cavityCount: cavityCount > 0 ? cavityCount : 1,
            machineNumber: rawMachine || 'ALL',
            status: status === 'inactive' ? 'inactive' : 'active'
          });
        } else {
          const existing = partsMap.get(partNumber);
          if ((!existing.partName || existing.partName === partNumber) && partName) existing.partName = partName;
          if (!existing.rawMaterialGrade && materialGrade) existing.rawMaterialGrade = materialGrade;
          if (!existing.standardCycleTimeSeconds && cycleTime) existing.standardCycleTimeSeconds = cycleTime;
          if (!existing.cavityCount && cavityCount) existing.cavityCount = cavityCount;
          if (rawMachine) existing.machineNumber = rawMachine;
        }

        // 2. Resolve Target Machines for mapping
        let targetMachineCodes = [];
        if (rawMachine) {
          targetMachineCodes = normalizeMachineCodes(rawMachine);
        }

        // If no machine specified in this row, auto-map to all 4 fleet machines so part is mapped and usable
        if (targetMachineCodes.length === 0) {
          targetMachineCodes = ['MC03', 'MC04', 'MC05', 'MC06'];
        }

        // 3. Register Machine and Machine-Part Mappings
        targetMachineCodes.forEach(mc => {
          registerMachine(mc);

          const mapKey = `${mc}_${partNumber}`;
          if (!mappingsMap.has(mapKey)) {
            mappingsMap.set(mapKey, {
              id: `map-${mc.toLowerCase()}-${partNumber.toLowerCase()}`,
              machineCode: mc,
              machineNumber: mc,
              partCode: partNumber,
              partNumber: partNumber,
              mouldNumber: (row['mouldnumber'] || row['mould'] || `MLD-${partNumber}`).toString().trim(),
              approvedToRun: status !== 'inactive',
              isApproved: status !== 'inactive',
              status: 'active'
            });
          }
        });

        rowsProcessed++;
      });
    });

    if (partsMap.size === 0) {
      return {
        success: false,
        error: 'No valid parts found in the uploaded Excel file. Please ensure your file has columns like "Part Number" or "Part Code".'
      };
    }

    // Safety fallback: if mappingsMap is somehow empty, auto-map all parts across all fleet machines
    if (mappingsMap.size === 0) {
      partsMap.forEach(part => {
        ['MC03', 'MC04', 'MC05', 'MC06'].forEach(mc => {
          mappingsMap.set(`${mc}_${part.partNumber}`, {
            id: `map-${mc.toLowerCase()}-${part.partNumber.toLowerCase()}`,
            machineCode: mc,
            machineNumber: mc,
            partCode: part.partNumber,
            partNumber: part.partNumber,
            mouldNumber: `MLD-${part.partNumber}`,
            approvedToRun: true,
            isApproved: true,
            status: 'active'
          });
        });
      });
    }

    const parts = Array.from(partsMap.values());
    const machines = Array.from(machinesMap.values());
    const mappings = Array.from(mappingsMap.values());

    return {
      success: true,
      rowsProcessed,
      partsCount: parts.length,
      machinesCount: machines.length,
      mappingsCount: mappings.length,
      parts,
      machines,
      mappings,
      rejected,
      errors
    };
  } catch (err) {
    return {
      success: false,
      error: `Part Master parsing failed: ${err.message}`
    };
  }
}

/**
 * Validates and parses uploaded Excel file buffers into typed master arrays.
 */
export function parseExcelFile(arrayBuffer, type) {
  if (type === 'unified_part_master' || type === 'part_master' || type === 'unified') {
    return parseUnifiedPartMasterExcel(arrayBuffer);
  }
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { success: false, error: 'Excel workbook contains no sheets.' };
    }

    const firstSheetName = wb.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheetName]);

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { success: false, error: 'Uploaded file is empty.' };
    }

    let imported = 0;
    let rejected = 0;
    const errors = [];
    const validData = [];

    switch (type) {
      case 'machine': {
        rawRows.forEach((r, idx) => {
          const row = normalizeRowKeys(r);
          const machineNumber = (row['machinenumber'] || row['machinecode'] || row['machine'] || '').toString().trim().toUpperCase();

          if (!machineNumber) {
            rejected++;
            errors.push(`Row ${idx + 2}: Missing Machine Number.`);
            return;
          }

          validData.push({
            id: `m-${machineNumber.toLowerCase()}`,
            machineNumber: machineNumber,
            machineName: (row['machinename'] || row['name'] || `${machineNumber} Production IMM`).toString().trim(),
            makeModel: (row['makemodel'] || row['model'] || '').toString().trim(),
            capacityTon: Number(row['capacitytons'] || row['capacity'] || row['tonnage']) || 250,
            hourlyCostRate: Number(row['hourlycostrate'] || row['hourlyrate']) || 1500,
            status: (row['status'] || 'active').toString().toLowerCase().trim()
          });
          imported++;
        });
        break;
      }

      case 'part': {
        rawRows.forEach((r, idx) => {
          const row = normalizeRowKeys(r);
          const partNumber = (row['partnumber'] || row['partcode'] || row['part'] || '').toString().trim();

          if (!partNumber) {
            rejected++;
            errors.push(`Row ${idx + 2}: Missing Part Number.`);
            return;
          }

          const cycleTime = Number(row['standardcycletimes'] || row['cycletime'] || row['standardcycletime']) || 20.0;
          const cavities = Number(row['cavitycount'] || row['cavities'] || row['cavity']) || 2;

          validData.push({
            id: `part-${partNumber.toLowerCase()}`,
            partCode: partNumber,
            partNumber: partNumber,
            partName: (row['partname'] || row['name'] || partNumber).toString().trim(),
            customer: (row['customer'] || 'Internal').toString().trim(),
            rawMaterialGrade: (row['rawmaterialgrade'] || row['materialgrade'] || row['material'] || 'PP Copolymer').toString().trim(),
            partWeightGrams: Number(row['partweightg'] || row['partweight'] || row['weight']) || 35.0,
            runnerWeightGrams: 5.0,
            standardCycleTimeSeconds: cycleTime,
            cavityCount: cavities,
            status: 'active'
          });
          imported++;
        });
        break;
      }

      case 'mapping': {
        rawRows.forEach((r, idx) => {
          const row = normalizeRowKeys(r);
          const machineCode = (row['machinecode'] || row['machinenumber'] || row['machine'] || '').toString().trim().toUpperCase();
          const partCode = (row['partcode'] || row['partnumber'] || row['part'] || '').toString().trim();

          if (!machineCode || !partCode) {
            rejected++;
            errors.push(`Row ${idx + 2}: Missing Machine Code or Part Code.`);
            return;
          }

          const mouldNum = (row['mouldnumber'] || row['mould'] || `MLD-${partCode}`).toString().trim();
          const isApproved = String(row['approvedtorun'] || row['approved'] || 'YES').toUpperCase() === 'YES';

          validData.push({
            id: `map-${machineCode.toLowerCase()}-${partCode.toLowerCase()}`,
            machineCode,
            partCode,
            mouldNumber: mouldNum,
            approvedToRun: isApproved
          });
          imported++;
        });
        break;
      }

      case 'rejection': {
        rawRows.forEach((r, idx) => {
          const row = normalizeRowKeys(r);
          const code = (row['rejectioncode'] || row['code'] || '').toString().trim().toUpperCase();
          const description = (row['description'] || row['desc'] || row['reason'] || '').toString().trim();

          if (!code || !description) {
            rejected++;
            errors.push(`Row ${idx + 2}: Missing Rejection Code or Description.`);
            return;
          }

          validData.push({
            code,
            description,
            category: (row['category'] || 'Process Defect').toString().trim(),
            isActive: true
          });
          imported++;
        });
        break;
      }

      case 'downtime': {
        rawRows.forEach((r, idx) => {
          const row = normalizeRowKeys(r);
          const code = (row['downtimecode'] || row['code'] || '').toString().trim().toUpperCase();
          const description = (row['description'] || row['desc'] || row['reason'] || '').toString().trim();

          if (!code || !description) {
            rejected++;
            errors.push(`Row ${idx + 2}: Missing Downtime Code or Description.`);
            return;
          }

          validData.push({
            code,
            category: (row['category'] || 'Machine Related').toString().trim(),
            description,
            isActive: true
          });
          imported++;
        });
        break;
      }

      default:
        return { success: false, error: `Invalid master type: ${type}` };
    }

    return {
      success: true,
      imported,
      rejected,
      data: validData,
      errors
    };
  } catch (err) {
    return {
      success: false,
      error: `Excel parsing failed: ${err.message}`
    };
  }
}

/**
 * Validates and parses uploaded Rejection Master Excel file.
 */
export function parseRejectionMasterExcel(arrayBuffer) {
  const res = parseExcelFile(arrayBuffer, 'rejection');
  if (res.success) {
    return {
      success: true,
      codes: (res.data || []).map(d => ({
        code: d.code,
        description: d.description,
        status: 'active',
        isActive: true
      })),
      count: res.imported,
      errors: res.errors
    };
  }
  return res;
}

/**
 * Validates and parses uploaded Downtime Master Excel file.
 */
export function parseDowntimeMasterExcel(arrayBuffer) {
  const res = parseExcelFile(arrayBuffer, 'downtime');
  if (res.success) {
    return {
      success: true,
      codes: (res.data || []).map(d => ({
        code: d.code,
        category: d.category || 'Machine Related',
        description: d.description,
        status: 'active',
        isActive: true
      })),
      count: res.imported,
      errors: res.errors
    };
  }
  return res;
}

/**
 * Creates one master Excel workbook with all 5 master data sheets.
 */
export function exportAllMasterDataBackup({ machines = [], parts = [], mappings = [], rejectionCodes = [], downtimeCodes = [] }) {
  const wb = XLSX.utils.book_new();

  // 1. Machine Master Sheet
  const machineRows = machines.map(m => ({
    'Machine Number': m.machineNumber,
    'Machine Name': m.machineName,
    'Make / Model': m.makeModel || '',
    'Capacity (Tons)': m.capacityTon || '',
    'Hourly Cost Rate': m.hourlyCostRate || '',
    'Status': m.status || 'active'
  }));
  const wsMachines = XLSX.utils.json_to_sheet(machineRows);
  XLSX.utils.book_append_sheet(wb, wsMachines, 'Machine Master');

  // 2. Part Master Sheet
  const partRows = parts.map(p => ({
    'Part Number': p.partNumber || p.partCode,
    'Part Name': p.partName,
    'Customer': p.customer || '',
    'Raw Material Grade': p.rawMaterialGrade || '',
    'Part Weight (g)': p.partWeightGrams || '',
    'Standard Cycle Time (s)': p.standardCycleTimeSeconds || '',
    'Cavity Count': p.cavityCount || '',
    'Status': p.status || 'active'
  }));
  const wsParts = XLSX.utils.json_to_sheet(partRows);
  XLSX.utils.book_append_sheet(wb, wsParts, 'Part Master');

  // 3. Machine-Part Mapping Sheet
  const mappingRows = mappings.map(m => ({
    'Machine Code': m.machineCode || m.machineNumber,
    'Part Code': m.partCode || m.partNumber,
    'Mould Number': m.mouldNumber || '',
    'Approved To Run': m.approvedToRun ? 'YES' : 'NO'
  }));
  const wsMappings = XLSX.utils.json_to_sheet(mappingRows);
  XLSX.utils.book_append_sheet(wb, wsMappings, 'Machine-Part Mapping');

  // 4. Rejection Master Sheet
  const rejRows = rejectionCodes.map(r => ({
    'Rejection Code': r.code,
    'Description': r.description,
    'Category': r.category || 'Process Defect',
    'Status': r.isActive ? 'active' : 'inactive'
  }));
  const wsRej = XLSX.utils.json_to_sheet(rejRows);
  XLSX.utils.book_append_sheet(wb, wsRej, 'Rejection Master');

  // 5. Downtime Master Sheet
  const dtRows = downtimeCodes.map(d => ({
    'Downtime Code': d.code,
    'Category': d.category,
    'Description': d.description,
    'Status': d.isActive ? 'active' : 'inactive'
  }));
  const wsDt = XLSX.utils.json_to_sheet(dtRows);
  XLSX.utils.book_append_sheet(wb, wsDt, 'Downtime Master');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Radiance_All_Master_Data_Backup_${todayStr}.xlsx`);
}

/**
 * Verifies plant production conditions for production readiness across machines (MC03, MC04, MC05, MC06).
 */
export function checkPilotReadiness({ machines = [], parts = [], mappings = [], usersList = [] }) {
  const missing = [];

  // Mandatory masters check
  if (!machines || machines.length === 0) {
    missing.push('Machine Master');
  }
  if (!parts || parts.length === 0) {
    missing.push('Part Master');
  }

  // Fleet check: at least one active machine from MC03, MC04, MC05, MC06
  const hasFleetMachine = machines.some(m => ['MC03', 'MC04', 'MC05', 'MC06'].includes((m.machineNumber || m.machineCode || '').toUpperCase()));
  if (!hasFleetMachine) {
    missing.push('Production Machines (MC03, MC04, MC05, MC06)');
  }

  return {
    isReady: missing.length === 0,
    missing
  };
}
