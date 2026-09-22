// Radiance Polymers - Digital Production Reporting System
// Initial Master & Seed Data Configuration

export const INITIAL_REJECTION_CODES = [];

export const INITIAL_DOWNTIME_CODES = [];

export const INITIAL_OPERATORS = [
  { id: 'op-01', operatorName: 'Shreyank', employeeCode: 'EMP-101', status: 'active' },
  { id: 'op-02', operatorName: 'Dheera', employeeCode: 'EMP-102', status: 'active' },
  { id: 'op-03', operatorName: 'Mahadev', employeeCode: 'EMP-103', status: 'active' },
  { id: 'op-04', operatorName: 'Ravi', employeeCode: 'EMP-104', status: 'active' },
  { id: 'op-05', operatorName: 'Bipendar', employeeCode: 'EMP-105', status: 'active' },
  { id: 'op-06', operatorName: 'Ramkesh', employeeCode: 'EMP-106', status: 'active' }
];

export const INITIAL_MACHINES = [];

export const INITIAL_MOULDS = [];

export const INITIAL_PARTS = [];


export const INITIAL_MATERIALS = [
  {
    id: 'mat-pp-01',
    materialCode: 'MAT-PP-01',
    materialName: 'PP Copolymer 575P',
    materialType: 'Virgin Resin',
    grade: 'Sabic PP 575P Injection Grade',
    supplier: 'SABIC India',
    standardPricePerKg: 115.0,
    unit: 'kg',
    status: 'active'
  },
  {
    id: 'mat-abs-02',
    materialCode: 'MAT-ABS-02',
    materialName: 'ABS Hi-Impact AF312',
    materialType: 'Virgin Resin',
    grade: 'LG Chem AF312 Flame Retardant',
    supplier: 'LG Chem',
    standardPricePerKg: 185.0,
    unit: 'kg',
    status: 'active'
  },
  {
    id: 'mat-pa6-01',
    materialCode: 'MAT-PA6-01',
    materialName: 'Nylon 6 30% GF',
    materialType: 'Engineering Resin',
    grade: 'BASF Ultramid B3EG6 Heat Stab',
    supplier: 'BASF',
    standardPricePerKg: 290.0,
    unit: 'kg',
    status: 'active'
  },
  {
    id: 'mat-r001',
    materialCode: 'R001',
    materialName: 'Virgin Resin PP Natural (R001)',
    materialType: 'Virgin Resin',
    grade: 'Injection Grade PP R001',
    supplier: 'Reliance Industries',
    standardPricePerKg: 120.0,
    unit: 'kg',
    status: 'active'
  },
  {
    id: 'mat-mb01',
    materialCode: 'MB01',
    materialName: 'Black Color Masterbatch (MB01)',
    materialType: 'Masterbatch',
    grade: 'Carbon Black MB-01 40% Loading',
    supplier: 'Clariant Polymers',
    standardPricePerKg: 240.0,
    unit: 'kg',
    status: 'active'
  },
  {
    id: 'mat-pc-01',
    materialCode: 'MAT-PC-01',
    materialName: 'PC Optical Clear 2805',
    materialType: 'Engineering Resin',
    grade: 'Covestro Makrolon 2805 UV',
    supplier: 'Covestro',
    standardPricePerKg: 320.0,
    unit: 'kg',
    status: 'active'
  },
];

export const INITIAL_WORK_ORDERS = [];

// Machine-Part Mapping (MC03 -> Part Codes)
// Future-ready structure: Machine Code | Mould Number | Part Code | Approved to Run
export const INITIAL_MACHINE_PART_MAPPINGS = [];

// Supervisor Master for Pilot
export const SUPERVISORS = [
  { id: 'sup-lokesh', fullName: 'Mr. Lokesh', name: 'Mr. Lokesh', role: 'supervisor', status: 'active' },
  { id: 'sup-akshay', fullName: 'Mr. Akshay', name: 'Mr. Akshay', role: 'supervisor', status: 'active' }
];

export const USERS = [
  { id: 'sup-lokesh', fullName: 'Mr. Lokesh', email: 'lokesh@radiancepolymers.com', role: 'supervisor', badgeId: 'SUP-01' },
  { id: 'sup-akshay', fullName: 'Mr. Akshay', email: 'akshay@radiancepolymers.com', role: 'supervisor', badgeId: 'SUP-02' },
];

export const SHIFT_A_HOURS_DEFINITIONS = [
  { index: 1, label: '08:00 - 09:00', startHour: 8 },
  { index: 2, label: '09:00 - 10:00', startHour: 9 },
  { index: 3, label: '10:00 - 11:00', startHour: 10 },
  { index: 4, label: '11:00 - 12:00', startHour: 11 },
  { index: 5, label: '12:00 - 13:00', startHour: 12 },
  { index: 6, label: '13:00 - 14:00', startHour: 13 },
  { index: 7, label: '14:00 - 15:00', startHour: 14 },
  { index: 8, label: '15:00 - 16:00', startHour: 15 },
  { index: 9, label: '16:00 - 17:00', startHour: 16 },
  { index: 10, label: '17:00 - 18:00', startHour: 17 },
  { index: 11, label: '18:00 - 19:00', startHour: 18 },
  { index: 12, label: '19:00 - 20:00', startHour: 19 },
];

export const SHIFT_B_HOURS_DEFINITIONS = [
  { index: 1, label: '20:00 - 21:00', startHour: 20 },
  { index: 2, label: '21:00 - 22:00', startHour: 21 },
  { index: 3, label: '22:00 - 23:00', startHour: 22 },
  { index: 4, label: '23:00 - 00:00', startHour: 23 },
  { index: 5, label: '00:00 - 01:00', startHour: 0 },
  { index: 6, label: '01:00 - 02:00', startHour: 1 },
  { index: 7, label: '02:00 - 03:00', startHour: 2 },
  { index: 8, label: '03:00 - 04:00', startHour: 3 },
  { index: 9, label: '04:00 - 05:00', startHour: 4 },
  { index: 10, label: '05:00 - 06:00', startHour: 5 },
  { index: 11, label: '06:00 - 07:00', startHour: 6 },
  { index: 12, label: '07:00 - 08:00', startHour: 7 },
];

export const SHIFT_HOURS_DEFINITIONS = SHIFT_A_HOURS_DEFINITIONS;

export function getShiftHours(shift = 'Shift A') {
  if (shift === 'Shift B' || shift === 'B' || shift === 'Shift 2') {
    return SHIFT_B_HOURS_DEFINITIONS;
  }
  return SHIFT_A_HOURS_DEFINITIONS;
}

export const DEFAULT_SYSTEM_SETTINGS = {
  shotCounterTolerancePercent: 3.0,
  materialVarianceTolerancePercent: 5.0,
  enableStrictCycleValidation: true,
  autoEmailRecipients: ['planthead@radiancepolymers.com', 'quality@radiancepolymers.com', 'production@radiancepolymers.com'],
  plantName: 'Radiance Polymers Pvt. Ltd.',
  unitLocation: 'Plot 42, Sector 7, Industrial Area, Pune',
};
