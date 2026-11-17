// Radiance Polymers - Production Shift Configurations & Master Data Defaults
// Production-Ready: Zero mock/seed data. All master data is sourced from Supabase.

export const INITIAL_REJECTION_CODES = [];
export const INITIAL_DOWNTIME_CODES = [];
export const INITIAL_OPERATORS = [];
export const INITIAL_MACHINES = [];
export const INITIAL_MOULDS = [];
export const INITIAL_PARTS = [];
export const INITIAL_MATERIALS = [];
export const INITIAL_WORK_ORDERS = [];
export const INITIAL_MACHINE_PART_MAPPINGS = [];
export const SUPERVISORS = [];
export const USERS = [];

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

// Auto-email recipient configuration from environment
const _envEmails = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTO_EMAIL_RECIPIENTS)
  ? import.meta.env.VITE_AUTO_EMAIL_RECIPIENTS.split(',').map(e => e.trim()).filter(Boolean)
  : [];

export const DEFAULT_SYSTEM_SETTINGS = {
  shotCounterTolerancePercent: 3.0,
  materialVarianceTolerancePercent: 5.0,
  enableStrictCycleValidation: true,
  autoEmailRecipients: _envEmails,
  plantName: 'Radiance Polymers Pvt. Ltd.',
  unitLocation: 'Plot 42, Sector 7, Industrial Area, Pune',
};
