import XLSX from 'xlsx-js-style';
import fs from 'fs';

const mockReport = {
  id: 'rep-test-01',
  reportDate: '2026-09-18',
  shift: 'Shift A (08:00 - 20:00)',
  machineNumber: 'MC03',
  operator_name: 'Shreyank',
  supervisorName: 'Mr. Lokesh',
  status: 'approved',
  approvedAt: '2026-09-18T20:05:00Z',
  supervisorNotes: 'Shift target achieved with standard cycle time. Minor mold cleaning downtime in hour 3 resolved promptly.',
  mouldSessions: [
    {
      id: 'sess-1',
      partNumber: 'RAD-8821',
      partName: 'Automotive Housing Base 45T',
      plannedCycleTime: 25,
      entries: [
        {
          hourIndex: 1,
          hourInterval: '08:00 - 09:00',
          theoreticalTarget: 144,
          productionQty: 140,
          acceptedQty: 138,
          rejectionQty: 2,
          downtimeMinutes: 0,
          rejectionBreakdown: [{ code: 'R01', reason: 'Short Shot', qty: 2 }],
          downtimeBreakdown: [],
          remarks: 'Smooth morning startup'
        },
        {
          hourIndex: 2,
          hourInterval: '09:00 - 10:00',
          theoreticalTarget: 144,
          productionQty: 142,
          acceptedQty: 140,
          rejectionQty: 2,
          downtimeMinutes: 0,
          rejectionBreakdown: [{ code: 'R03', reason: 'Silver Streak', qty: 2 }],
          downtimeBreakdown: [],
          remarks: ''
        },
        {
          hourIndex: 3,
          hourInterval: '10:00 - 11:00',
          theoreticalTarget: 144,
          productionQty: 130,
          acceptedQty: 125,
          rejectionQty: 5,
          downtimeMinutes: 10,
          rejectionBreakdown: [{ code: 'R02', reason: 'Flash / Burr', qty: 5 }],
          downtimeBreakdown: [{ code: 'D01', reason: 'Mould Cleaning / Pin Wipe', minutes: 10 }],
          remarks: 'Mould parting line cleaned'
        },
        {
          hourIndex: 4,
          hourInterval: '11:00 - 12:00',
          theoreticalTarget: 144,
          productionQty: 144,
          acceptedQty: 144,
          rejectionQty: 0,
          downtimeMinutes: 0,
          rejectionBreakdown: [],
          downtimeBreakdown: [],
          remarks: '100% yield'
        }
      ]
    }
  ]
};

function generateStyledReportWorkbook(report) {
  const wb = XLSX.utils.book_new();
  const sessionsList = report.mouldSessions || report.sessions || [];

  const allEntries = [];
  sessionsList.forEach(session => {
    (session.entries || []).forEach(entry => {
      allEntries.push({
        ...entry,
        partNumber: session.partNumber || report.partNumber || '-',
        partName: session.partName || report.partName || '-',
        cycleTime: session.plannedCycleTime || session.cycleTime || 25
      });
    });
  });
  allEntries.sort((a, b) => (Number(a.hourIndex) || 0) - (Number(b.hourIndex) || 0));

  const totalTarget = allEntries.reduce((s, e) => s + (Number(e.theoreticalTarget) || 0), 0);
  const totalProd = allEntries.reduce((s, e) => s + (Number(e.productionQty) || 0), 0);
  const totalAcc = allEntries.reduce((s, e) => s + (Number(e.acceptedQty) || 0), 0);
  const totalRej = allEntries.reduce((s, e) => s + (Number(e.rejectionQty) || 0), 0);
  const totalDt = allEntries.reduce((s, e) => s + (Number(e.downtimeMinutes) || 0), 0);
  const totalRuntime = Math.max(0, allEntries.length * 60 - totalDt);
  const rejRate = totalProd > 0 ? ((totalRej / totalProd) * 100).toFixed(2) + '%' : '0.00%';
  const efficiencyRate = totalTarget > 0 ? ((totalAcc / totalTarget) * 100).toFixed(1) + '%' : '100.0%';

  const formatSlot = (interval, idx) => {
    if (!interval) return `Hour ${idx}`;
    const m = interval.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      return `${start}-${end} (${interval})`;
    }
    return interval;
  };

  const rows = [];
  // Row 0: Company Header
  rows.push(['RADIANCE POLYMERS PVT. LTD.']);
  // Row 1: Subtitle
  rows.push(['DIGITAL SHIFT PRODUCTION REPORT - AUDIT & MANAGEMENT SUMMARY']);
  // Row 2: Empty Spacer
  rows.push([]);
  // Row 3: Metadata Row 1
  rows.push([
    'Report Date:', report.reportDate || '-',
    'Shift:', report.shift || 'Shift A',
    'Machine:', report.machineNumber || 'MC03',
    'Status:', (report.status || 'APPROVED').toUpperCase(),
    '', '', '', '', ''
  ]);
  // Row 4: Metadata Row 2
  rows.push([
    'Operator:', report.operator_name || report.operatorName || 'Floor Operator',
    'Supervisor:', report.supervisorName || 'Mr. Lokesh',
    'Generated:', new Date().toLocaleString(),
    'Approved At:', report.approvedAt ? new Date(report.approvedAt).toLocaleString() : 'Verified on Floor',
    '', '', '', '', ''
  ]);
  // Row 5: Empty Spacer
  rows.push([]);
  // Row 6: KPI Summary Ribbon Header
  rows.push(['SHIFT EXECUTIVE PERFORMANCE SUMMARY (12-HOUR SHIFT)']);
  // Row 7: KPI Labels
  rows.push([
    'Gross Output', 'Accepted Output', 'Rejections', 'Quality Yield',
    'Total Downtime', 'Net Runtime', 'Target Output', 'Shift Efficiency',
    '', '', '', '', ''
  ]);
  // Row 8: KPI Values
  rows.push([
    `${totalProd.toLocaleString()} pcs`,
    `${totalAcc.toLocaleString()} pcs`,
    `${totalRej.toLocaleString()} pcs`,
    totalProd > 0 ? `${(((totalProd - totalRej) / totalProd) * 100).toFixed(1)}%` : '100%',
    `${totalDt} mins`,
    `${totalRuntime} mins`,
    `${totalTarget.toLocaleString()} pcs`,
    efficiencyRate,
    '', '', '', '', ''
  ]);
  // Row 9: Empty Spacer
  rows.push([]);
  // Row 10: Table Column Headers (13 columns)
  rows.push([
    'Time Slot',
    'Part Number',
    'Part Name',
    'Cycle (s)',
    'Target (pcs)',
    'Production (pcs)',
    'Accepted (pcs)',
    'Rejection (pcs)',
    'Downtime (min)',
    'Runtime (min)',
    'Rejection Breakdown',
    'Downtime Breakdown',
    'Hourly Remarks / Notes'
  ]);

  // Hourly Data Rows
  allEntries.forEach(entry => {
    const dtReasons = (entry.downtimeBreakdown && entry.downtimeBreakdown.length > 0)
      ? entry.downtimeBreakdown.map(d => `${d.code}${d.reason ? ' - ' + d.reason : ''} (${d.minutes}m)`).join(', ')
      : (entry.primaryDowntimeCode || (entry.downtimeMinutes > 0 ? `${entry.downtimeMinutes}m lost` : '-'));

    const rejReasons = (entry.rejectionBreakdown && entry.rejectionBreakdown.length > 0)
      ? entry.rejectionBreakdown.map(r => `${r.code}${r.reason ? ' - ' + r.reason : ''} (${r.qty} pcs)`).join(', ')
      : (entry.primaryRejectionCode || (entry.rejectionQty > 0 ? `${entry.rejectionQty} pcs` : '-'));

    const runMin = Math.max(0, 60 - (Number(entry.downtimeMinutes) || 0));

    rows.push([
      formatSlot(entry.hourInterval, entry.hourIndex),
      entry.partNumber,
      entry.partName,
      Number(entry.cycleTime) || 25,
      Number(entry.theoreticalTarget) || 0,
      Number(entry.productionQty) || 0,
      Number(entry.acceptedQty) || 0,
      Number(entry.rejectionQty) || 0,
      Number(entry.downtimeMinutes) || 0,
      runMin,
      rejReasons,
      dtReasons,
      entry.remarks || '-'
    ]);
  });

  // Total Row
  const totalRowIndex = rows.length;
  rows.push([
    'TOTAL (SHIFT)',
    '',
    '',
    '',
    totalTarget,
    totalProd,
    totalAcc,
    totalRej,
    totalDt,
    totalRuntime,
    `Total Rejection Rate: ${rejRate}`,
    `Total Downtime: ${totalDt} mins`,
    `Shift Efficiency: ${efficiencyRate}`
  ]);

  // Supervisor Sign-off Section
  rows.push([]);
  rows.push(['SUPERVISOR VERIFICATION & SHIFT OBSERVATIONS']);
  rows.push([
    'Supervisor Name:', report.supervisorName || 'Mr. Lokesh',
    'Sign-off Status:', (report.status || 'APPROVED').toUpperCase(),
    'Shift Date:', report.reportDate || '-',
    'Machine:', report.machineNumber || 'MC03'
  ]);
  rows.push([
    'Shift Remarks:', report.supervisorNotes || 'Standard shift operations verified. No critical deviation noted.',
    '', '', '', '', '', '', '', '', '', '', ''
  ]);
  rows.push([
    'Audit Note:',
    'This is a digitally certified manufacturing production record generated by Radiance Production Reporting App.',
    '', '', '', '', '', '', '', '', '', '', ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column Widths (Generous, readable, zero manual adjustment required)
  ws['!cols'] = [
    { wch: 24 }, // A: Time Slot
    { wch: 18 }, // B: Part Number
    { wch: 32 }, // C: Part Name
    { wch: 14 }, // D: Cycle Time
    { wch: 16 }, // E: Target
    { wch: 18 }, // F: Production
    { wch: 16 }, // G: Accepted
    { wch: 16 }, // H: Rejection
    { wch: 16 }, // I: Downtime
    { wch: 15 }, // J: Runtime
    { wch: 38 }, // K: Rejection Breakdown
    { wch: 40 }, // L: Downtime Breakdown
    { wch: 34 }  // M: Remarks
  ];

  // Explicit Row Heights
  const rowHeights = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) rowHeights.push({ hpt: 38 }); // Title
    else if (i === 1) rowHeights.push({ hpt: 24 }); // Subtitle
    else if (i === 2 || i === 5 || i === 9) rowHeights.push({ hpt: 12 }); // Spacers
    else if (i === 3 || i === 4) rowHeights.push({ hpt: 24 }); // Metadata
    else if (i === 6) rowHeights.push({ hpt: 24 }); // KPI title
    else if (i === 7) rowHeights.push({ hpt: 20 }); // KPI labels
    else if (i === 8) rowHeights.push({ hpt: 26 }); // KPI values
    else if (i === 10) rowHeights.push({ hpt: 28 }); // Table Header
    else if (i === totalRowIndex) rowHeights.push({ hpt: 28 }); // Totals
    else if (i === totalRowIndex + 2) rowHeights.push({ hpt: 26 }); // Supervisor Section title
    else if (i > totalRowIndex + 2) rowHeights.push({ hpt: 24 }); // Sign-off details
    else rowHeights.push({ hpt: 25 }); // Data rows
  }
  ws['!rows'] = rowHeights;

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Company Title A1:M1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }, // Subtitle A2:M2
    { s: { r: 6, c: 0 }, e: { r: 6, c: 12 } }, // KPI Ribbon A7:M7
    { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 3 } }, // Total label A..D
    { s: { r: totalRowIndex + 2, c: 0 }, e: { r: totalRowIndex + 2, c: 12 } }, // Supervisor Header
    { s: { r: totalRowIndex + 4, c: 1 }, e: { r: totalRowIndex + 4, c: 12 } }, // Supervisor Remarks text
    { s: { r: totalRowIndex + 5, c: 1 }, e: { r: totalRowIndex + 5, c: 12 } }  // Audit note text
  ];

  // Helper Styles
  const borderThin = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  const styleBanner = {
    font: { name: 'Segoe UI', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  const styleSubtitle = {
    font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: '94A3B8' } },
    fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  const styleMetaLabel = {
    font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderThin
  };

  const styleMetaVal = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderThin
  };

  const styleMetaStatus = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '15803D' } },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin
  };

  const styleKpiHeader = {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  const styleKpiLabel = {
    font: { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin
  };

  const styleKpiVal = {
    font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin
  };

  const styleTableHeader = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
  };

  const styleTotal = {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '0F172A' } },
      bottom: { style: 'double', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  };

  // Apply Styles across cells
  // 1. Banner
  for (let c = 0; c <= 12; c++) {
    const a1 = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[a1]) ws[a1] = { t: 's', v: '' };
    ws[a1].s = styleBanner;

    const a2 = XLSX.utils.encode_cell({ r: 1, c });
    if (!ws[a2]) ws[a2] = { t: 's', v: '' };
    ws[a2].s = styleSubtitle;
  }

  // 2. Metadata (Rows 3 & 4)
  [3, 4].forEach(r => {
    for (let c = 0; c <= 7; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      if (c % 2 === 0) {
        ws[addr].s = styleMetaLabel;
      } else if (r === 3 && c === 7) {
        ws[addr].s = styleMetaStatus;
      } else {
        ws[addr].s = styleMetaVal;
      }
    }
  });

  // 3. KPI Ribbon (Row 6)
  for (let c = 0; c <= 12; c++) {
    const addr = XLSX.utils.encode_cell({ r: 6, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = styleKpiHeader;
  }

  // KPI Labels & Values (Rows 7 & 8, cols 0..7)
  for (let c = 0; c <= 7; c++) {
    const lAddr = XLSX.utils.encode_cell({ r: 7, c });
    if (ws[lAddr]) ws[lAddr].s = styleKpiLabel;

    const vAddr = XLSX.utils.encode_cell({ r: 8, c });
    if (ws[vAddr]) {
      let customColor = '0F172A';
      let customFill = 'F1F5F9';
      if (c === 1) { // Accepted
        customColor = '15803D';
        customFill = 'DCFCE7';
      } else if (c === 2) { // Rejections
        customColor = totalRej > 0 ? 'B91C1C' : '0F172A';
        customFill = totalRej > 0 ? 'FEF2F2' : 'F1F5F9';
      } else if (c === 4) { // Downtime
        customColor = totalDt > 0 ? 'B45309' : '0F172A';
        customFill = totalDt > 0 ? 'FFFBEB' : 'F1F5F9';
      } else if (c === 7) { // Efficiency
        customColor = '1D4ED8';
        customFill = 'EFF6FF';
      }
      ws[vAddr].s = {
        ...styleKpiVal,
        font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: customColor } },
        fill: { fgColor: { rgb: customFill } }
      };
    }
  }

  // 4. Table Header (Row 10)
  for (let c = 0; c <= 12; c++) {
    const addr = XLSX.utils.encode_cell({ r: 10, c });
    if (ws[addr]) ws[addr].s = styleTableHeader;
  }

  // 5. Data Rows (Row 11 to totalRowIndex - 1)
  for (let r = 11; r < totalRowIndex; r++) {
    const isOdd = r % 2 === 1;
    const baseRowBg = isOdd ? 'FFFFFF' : 'F8FAFC';

    for (let c = 0; c <= 12; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      let cellStyle = {
        font: { name: 'Segoe UI', sz: 9.5, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: baseRowBg } },
        border: borderThin,
        alignment: { vertical: 'center', wrapText: true }
      };

      if (c === 0) { // Time Slot
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
        cellStyle.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '334155' } };
      } else if (c === 1 || c === 3) { // Part No, Cycle
        cellStyle.alignment = { horizontal: 'center', vertical: 'center' };
      } else if (c === 2) { // Part Name
        cellStyle.alignment = { horizontal: 'left', vertical: 'center' };
      } else if (c >= 4 && c <= 9) { // Numeric cols
        cellStyle.alignment = { horizontal: 'right', vertical: 'center' };
        if (c === 5) { // Prod
          cellStyle.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '0F172A' } };
        } else if (c === 6) { // Accepted
          cellStyle.fill = { fgColor: { rgb: 'ECFDF5' } }; // Soft green
          cellStyle.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '047857' } };
        } else if (c === 7) { // Rejection
          const rejVal = Number(ws[addr].v) || 0;
          if (rejVal > 0) {
            cellStyle.fill = { fgColor: { rgb: 'FEF2F2' } }; // Soft rose
            cellStyle.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'DC2626' } };
          }
        } else if (c === 8) { // Downtime
          const dtVal = Number(ws[addr].v) || 0;
          if (dtVal > 0) {
            cellStyle.fill = { fgColor: { rgb: 'FFFBEB' } }; // Soft amber
            cellStyle.font = { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'D97706' } };
          }
        }
      } else if (c === 10) { // Rejection Breakdown
        cellStyle.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        if (ws[addr].v && ws[addr].v !== '-') {
          cellStyle.font = { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: 'B91C1C' } };
        }
      } else if (c === 11) { // Downtime Breakdown
        cellStyle.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        if (ws[addr].v && ws[addr].v !== '-') {
          cellStyle.font = { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: 'B45309' } };
        }
      } else { // Remarks
        cellStyle.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
      }

      ws[addr].s = cellStyle;
    }
  }

  // 6. Total Row (totalRowIndex)
  for (let c = 0; c <= 12; c++) {
    const addr = XLSX.utils.encode_cell({ r: totalRowIndex, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };

    let totalCellStyle = { ...styleTotal };
    if (c === 0) {
      totalCellStyle.alignment = { horizontal: 'center', vertical: 'center' };
    } else if (c >= 4 && c <= 9) {
      totalCellStyle.alignment = { horizontal: 'right', vertical: 'center' };
      if (c === 6) {
        totalCellStyle.font = { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '047857' } };
      } else if (c === 7) {
        totalCellStyle.font = { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'DC2626' } };
      } else if (c === 8) {
        totalCellStyle.font = { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'D97706' } };
      }
    } else {
      totalCellStyle.alignment = { horizontal: 'left', vertical: 'center' };
    }

    ws[addr].s = totalCellStyle;
  }

  // 7. Supervisor Sign-Off Block
  const supTitleRow = totalRowIndex + 2;
  for (let c = 0; c <= 12; c++) {
    const addr = XLSX.utils.encode_cell({ r: supTitleRow, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = {
      font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  const supInfoRow = totalRowIndex + 3;
  for (let c = 0; c <= 7; c++) {
    const addr = XLSX.utils.encode_cell({ r: supInfoRow, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = c % 2 === 0 ? styleMetaLabel : styleMetaVal;
  }

  const supNotesRow = totalRowIndex + 4;
  const supNotesLabel = XLSX.utils.encode_cell({ r: supNotesRow, c: 0 });
  if (ws[supNotesLabel]) ws[supNotesLabel].s = styleMetaLabel;
  const supNotesVal = XLSX.utils.encode_cell({ r: supNotesRow, c: 1 });
  if (ws[supNotesVal]) {
    ws[supNotesVal].s = {
      font: { name: 'Segoe UI', sz: 10, italic: true, color: { rgb: '1E293B' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: borderThin
    };
  }

  const supAuditRow = totalRowIndex + 5;
  const auditLabel = XLSX.utils.encode_cell({ r: supAuditRow, c: 0 });
  if (ws[auditLabel]) ws[auditLabel].s = styleMetaLabel;
  const auditVal = XLSX.utils.encode_cell({ r: supAuditRow, c: 1 });
  if (ws[auditVal]) {
    ws[auditVal].s = {
      font: { name: 'Segoe UI', sz: 9, color: { rgb: '64748B' } },
      fill: { fgColor: { rgb: 'F8FAFC' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: borderThin
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Production Report');
  return wb;
}

const wb = generateStyledReportWorkbook(mockReport);
XLSX.writeFile(wb, 'scratch/test_styled_shift_report.xlsx');
console.log('Successfully generated scratch/test_styled_shift_report.xlsx with rich styling, colors, and zero-adjustment widths/heights!');

