import XLSX from 'xlsx-js-style';
import fs from 'fs';

console.log('Testing Excel Multi-Mould Totals Formatting...');

const wb = XLSX.utils.book_new();
const rows = [];

// Header
rows.push(['RADIANCE POLYMERS PVT. LTD.']);
rows.push(['DIGITAL SHIFT PRODUCTION REPORT - AUDIT & MANAGEMENT SUMMARY']);
rows.push([]);

// Metadata
rows.push(['Report Date:', '2026-09-18', 'Shift:', 'Shift 1', 'Machine:', 'MC03', 'Status:', 'APPROVED', '', '', '', '', '']);
rows.push(['Operator:', 'Shreyank', 'Supervisor:', 'Mr. Lokesh', 'Generated:', '2026-09-18 12:00', 'Approved At:', '2026-09-18 12:00', '', '', '', '', '']);
rows.push([]);

// KPI
rows.push(['SHIFT EXECUTIVE PERFORMANCE SUMMARY (12-HOUR SHIFT · 2 MOULDS)']);
rows.push(['Gross Output', 'Accepted Output', 'Rejections', 'Quality Yield', 'Total Downtime', 'Net Runtime', 'Target Output', 'Shift Efficiency', '', '', '', '', '']);
rows.push(['8,330 pcs', '8,235 pcs', '95 pcs', '98.9%', '35 mins', '685 mins', '8,520 pcs', '98.9%', '', '', '', '', '']);
rows.push([]);

// Table header
rows.push(['Time Slot', 'Part Number', 'Part Name', 'Cycle (s)', 'Target (pcs)', 'Production (pcs)', 'Accepted (pcs)', 'Rejection (pcs)', 'Downtime (min)', 'Runtime (min)', 'Rejection Breakdown', 'Downtime Breakdown', 'Hourly Remarks / Notes']);

// Hours 1 to 5 (Mould 1: F53200000A)
for (let h = 1; h <= 5; h++) {
  rows.push([`Hour ${h}`, 'F53200000A', 'CAP OIL FILLER', 20, 360, 350, 345, 5, 0, 60, 'None', 'None', 'Normal run']);
}

// In-table Mould Change Divider
const dividerRowIdx = rows.length;
rows.push(['🔄 MOULD / TOOL CHANGE: SWITCHED TO 5036677 — BEARING HOUSING (SESSION #2 · CYCLE 15s · TARGET 960 pcs/hr)', '', '', '', '', '', '', '', '', '', '', '', '']);

// Hours 6 to 12 (Mould 2: 5036677)
for (let h = 6; h <= 12; h++) {
  rows.push([`Hour ${h}`, '5036677', 'BEARING HOUSING', 15, 960, 940, 930, 10, 5, 55, 'Flash (10)', 'Cleaning (5m)', 'Smooth production']);
}

// Subtotal Mould 1
const subtotal1Idx = rows.length;
rows.push(['TOTAL - MOULD 1: F53200000A (Hours 1-5)', 'F53200000A', 'CAP OIL FILLER', '20s (2C)', 1800, 1750, 1725, 25, 0, 300, 'Rej Rate: 1.43%', 'Downtime: 0 mins', 'Mould Eff: 98.6%']);

// Subtotal Mould 2
const subtotal2Idx = rows.length;
rows.push(['TOTAL - MOULD 2: 5036677 (Hours 6-12)', '5036677', 'BEARING HOUSING', '15s (4C)', 6720, 6580, 6510, 70, 35, 385, 'Rej Rate: 1.06%', 'Downtime: 35 mins', 'Mould Eff: 98.9%']);

// Grand Total
const grandTotalIdx = rows.length;
rows.push(['GRAND TOTAL (ALL 2 MOULDS · COMBINED SHIFT)', '2 MOULDS', 'SHIFT COMBINED', '', 8520, 8330, 8235, 95, 35, 685, 'Overall Rej: 1.14%', 'Total Downtime: 35 mins', 'Shift Eff: 98.9%']);

// Supervisor Section
rows.push([]);
rows.push(['SUPERVISOR VERIFICATION & SHIFT OBSERVATIONS']);
rows.push(['Supervisor Name:', 'Mr. Lokesh', 'Sign-off Status:', 'APPROVED', 'Shift Date:', '2026-09-18', 'Machine:', 'MC03']);
rows.push(['Shift Remarks:', 'Mould changed successfully after Hour 5. Quality verified for both tools.', '', '', '', '', '', '', '', '', '', '', '']);

const ws = XLSX.utils.aoa_to_sheet(rows);

// Merges
ws['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
  { s: { r: 6, c: 0 }, e: { r: 6, c: 12 } },
  { s: { r: dividerRowIdx, c: 0 }, e: { r: dividerRowIdx, c: 12 } },
  { s: { r: grandTotalIdx, c: 0 }, e: { r: grandTotalIdx, c: 3 } },
  { s: { r: grandTotalIdx + 2, c: 0 }, e: { r: grandTotalIdx + 2, c: 12 } },
  { s: { r: grandTotalIdx + 4, c: 1 }, e: { r: grandTotalIdx + 4, c: 12 } }
];

// Style Subtotal 1 (Sky Blue)
for (let c = 0; c <= 12; c++) {
  const addr = XLSX.utils.encode_cell({ r: subtotal1Idx, c });
  if (ws[addr]) {
    ws[addr].s = {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0369A1' } },
      fill: { fgColor: { rgb: 'E0F2FE' } },
      border: {
        top: { style: 'thin', color: { rgb: '0284C7' } },
        bottom: { style: 'thin', color: { rgb: '0284C7' } }
      }
    };
  }
}

// Style Subtotal 2 (Amber)
for (let c = 0; c <= 12; c++) {
  const addr = XLSX.utils.encode_cell({ r: subtotal2Idx, c });
  if (ws[addr]) {
    ws[addr].s = {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '92400E' } },
      fill: { fgColor: { rgb: 'FEF3C7' } },
      border: {
        top: { style: 'thin', color: { rgb: 'D97706' } },
        bottom: { style: 'thin', color: { rgb: 'D97706' } }
      }
    };
  }
}

// Style Grand Total (Slate with double border)
for (let c = 0; c <= 12; c++) {
  const addr = XLSX.utils.encode_cell({ r: grandTotalIdx, c });
  if (ws[addr]) {
    ws[addr].s = {
      font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      border: {
        top: { style: 'thin', color: { rgb: '0F172A' } },
        bottom: { style: 'double', color: { rgb: '0F172A' } }
      }
    };
  }
}

XLSX.utils.book_append_sheet(wb, ws, 'Production Report');
const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('scratch_test_multi_mould.xlsx', outBuf);

console.log('✅ Generated scratch_test_multi_mould.xlsx successfully, size:', outBuf.length, 'bytes');
