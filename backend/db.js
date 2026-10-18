// ==============================================================================
// RADIANCE POLYMERS - DATABASE INITIALIZATION & ACCESS LAYER
// Powered by Node.js 24 native SQLite (node:sqlite) with WAL Mode
// ==============================================================================
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'radiance_production.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log(`[DB] Initializing Live Database at: ${DB_PATH}`);
const db = new DatabaseSync(DB_PATH);

// Performance & Concurrency PRAGMAs
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

// Execute DDL Schema
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

// Helper Wrappers for Prepared Statements
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params) || null;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params) || [];
}

function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

// Automatic Seed Data Initialization (Runs on first startup)
function seedInitialData() {
  const userCount = queryOne('SELECT COUNT(*) as count FROM users')?.count || 0;
  if (userCount === 0) {
    console.log('[DB] Seeding Initial Personnel...');
    const users = [
      { id: 'sup-lokesh', name: 'Mr. Lokesh', email: 'lokesh@radiancepolymers.com', role: 'supervisor', pin: '2026', badge: 'SUP-01' },
      { id: 'sup-akshay', name: 'Mr. Akshay', email: 'akshay@radiancepolymers.com', role: 'supervisor', pin: '2026', badge: 'SUP-02' },
      { id: 'u-admin', name: 'Production Manager', email: 'planthead@radiancepolymers.com', role: 'production_manager', pin: '2026', badge: 'MGR-01' },
      { id: 'op-01', name: 'Shreyank', email: 'shreyank@radiancepolymers.com', role: 'operator', pin: '2026', badge: 'EMP-101' },
      { id: 'op-02', name: 'Dheera', email: 'dheera@radiancepolymers.com', role: 'operator', pin: '2026', badge: 'EMP-102' },
      { id: 'op-03', name: 'Mahadev', email: 'mahadev@radiancepolymers.com', role: 'operator', pin: '2026', badge: 'EMP-103' },
      { id: 'op-04', name: 'Ravi', email: 'ravi@radiancepolymers.com', role: 'operator', pin: '2026', badge: 'EMP-104' },
      { id: 'op-05', name: 'Bipendar', email: 'bipendar@radiancepolymers.com', role: 'operator', pin: '2026', badge: 'EMP-105' },
      { id: 'op-06', name: 'Ramkesh', email: 'ramkesh@radiancepolymers.com', role: 'operator', pin: '2026', badge: 'EMP-106' }
    ];
    for (const u of users) {
      execute(
        `INSERT INTO users (id, full_name, email, role, pin_code, badge_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.role, u.pin, u.badge]
      );
    }
  }

  const machineCount = queryOne('SELECT COUNT(*) as count FROM machines')?.count || 0;
  if (machineCount === 0) {
    console.log('[DB] Seeding Standard Machine Fleet (MC01..MC14)...');
    const machines = [
      { id: 'm-mc-01', num: 'MC01', name: 'Milacron 150T', make: 'Milacron', model: '150T', ton: 150 },
      { id: 'm-mc-02', num: 'MC02', name: 'Milacron 200T', make: 'Milacron', model: '200T', ton: 200 },
      { id: 'm-mc-03', num: 'MC03', name: 'Milacron 450T (Pilot)', make: 'Milacron', model: '450T', ton: 450 },
      { id: 'm-mc-04', num: 'MC04', name: 'Milacron 350T', make: 'Milacron', model: '350T', ton: 350 },
      { id: 'm-mc-05', num: 'MC05', name: 'Milacron 250T', make: 'Milacron', model: '250T', ton: 250 },
      { id: 'm-mc-06', num: 'MC06', name: 'Milacron 180T', make: 'Milacron', model: '180T', ton: 180 },
      { id: 'm-mc-07', num: 'MC07', name: 'Toshiba 250T', make: 'Toshiba', model: 'IS250', ton: 250 },
      { id: 'm-mc-08', num: 'MC08', name: 'Toshiba 350T', make: 'Toshiba', model: 'IS350', ton: 350 },
      { id: 'm-mc-09', num: 'MC09', name: 'L&T 200T', make: 'L&T', model: 'De-Tech', ton: 200 },
      { id: 'm-mc-10', num: 'MC10', name: 'L&T 300T', make: 'L&T', model: 'De-Tech', ton: 300 },
      { id: 'm-mc-11', num: 'MC11', name: 'Windsor 180T', make: 'Windsor', model: 'Excel', ton: 180 },
      { id: 'm-mc-12', num: 'MC12', name: 'Windsor 280T', make: 'Windsor', model: 'Excel', ton: 280 },
      { id: 'm-mc-13', num: 'MC13', name: 'Milacron 550T', make: 'Milacron', model: '550T', ton: 550 },
      { id: 'm-mc-14', num: 'MC14', name: 'Milacron 650T', make: 'Milacron', model: '650T', ton: 650 }
    ];
    for (const m of machines) {
      execute(
        `INSERT INTO machines (id, machine_number, machine_name, make, model, capacity_ton, tonnage) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.num, m.name, m.make, m.model, m.ton, m.ton]
      );
    }
  }

  const bomCount = queryOne('SELECT COUNT(*) as count FROM bom_materials')?.count || 0;
  if (bomCount === 0) {
    console.log('[DB] Seeding BOM Materials (Resins & Masterbatch)...');
    const materials = [
      { id: 'mat-pp-01', code: 'MAT-PP-01', name: 'PP Copolymer 575P', type: 'Virgin Resin', grade: 'Sabic PP 575P Injection Grade', supplier: 'SABIC India', price: 115.0 },
      { id: 'mat-abs-02', code: 'MAT-ABS-02', name: 'ABS Hi-Impact AF312', type: 'Virgin Resin', grade: 'LG Chem AF312 Flame Retardant', supplier: 'LG Chem', price: 185.0 },
      { id: 'mat-pa6-01', code: 'MAT-PA6-01', name: 'Nylon 6 30% GF', type: 'Engineering Resin', grade: 'BASF Ultramid B3EG6 Heat Stab', supplier: 'BASF', price: 290.0 },
      { id: 'mat-r001', code: 'R001', name: 'Virgin Resin PP Natural (R001)', type: 'Virgin Resin', grade: 'Injection Grade PP R001', supplier: 'Reliance Industries', price: 120.0 },
      { id: 'mat-mb01', code: 'MB01', name: 'Black Color Masterbatch (MB01)', type: 'Masterbatch', grade: 'Carbon Black MB-01 40% Loading', supplier: 'Clariant Polymers', price: 240.0 },
      { id: 'mat-pc-01', code: 'MAT-PC-01', name: 'PC Optical Clear 2805', type: 'Engineering Resin', grade: 'Covestro Makrolon 2805 UV', supplier: 'Covestro', price: 320.0 }
    ];
    for (const b of materials) {
      execute(
        `INSERT INTO bom_materials (id, material_code, material_name, material_type, grade, supplier, standard_price_per_kg) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.code, b.name, b.type, b.grade, b.supplier, b.price]
      );
    }
  }

  const rulesCount = queryOne('SELECT COUNT(*) as count FROM system_rules')?.count || 0;
  if (rulesCount === 0) {
    console.log('[DB] Seeding System Rules & Validation Tolerances...');
    const rules = [
      { key: 'shot_counter_tolerance_percent', val: '3.0', desc: 'Max allowable variance between shot counters and produced pieces (%)' },
      { key: 'material_variance_tolerance_percent', val: '5.0', desc: 'Allowable discrepancy between theoretical and actual resin usage (%)' },
      { key: 'enable_strict_cycle_validation', val: 'true', desc: 'Enforce cycle time physical upper-bound checking on hourly production' },
      { key: 'pilot_machine', val: '"MC03"', desc: 'Primary pilot machine under live trial monitoring' },
      { key: 'plant_name', val: '"Radiance Polymers Pvt. Ltd."', desc: 'Registered operating factory unit title' },
      { key: 'auto_email_recipients', val: '["planthead@radiancepolymers.com", "quality@radiancepolymers.com"]', desc: 'Alert distribution list' }
    ];
    for (const r of rules) {
      execute(
        `INSERT INTO system_rules (key, value, description) VALUES (?, ?, ?)`,
        [r.key, r.val, r.desc]
      );
    }
  }

  const rejCount = queryOne('SELECT COUNT(*) as count FROM rejection_codes')?.count || 0;
  if (rejCount === 0) {
    console.log('[DB] Seeding Rejection Defect Codes (A-Q)...');
    const rejCodes = [
      { code: 'A', en: 'Flash / Extra Material', hi: 'फ़्लैश (अतिरिक्त सामग्री)', cat: 'Moulding Defect' },
      { code: 'B', en: 'Short Mould / Incomplete Fill', hi: 'शॉर्ट मोल्ड (अधूरा भरना)', cat: 'Moulding Defect' },
      { code: 'C', en: 'Sink Marks / Shrinkage', hi: 'सिंक मार्क (सतह पर गड्ढा)', cat: 'Cooling Defect' },
      { code: 'D', en: 'Silver Streaks / Moisture Marks', hi: 'सिल्वर स्ट्रीक्स (नमी के निशान)', cat: 'Material Defect' },
      { code: 'E', en: 'Burn Marks / Air Trap', hi: 'बर्न मार्क्स (जलने के निशान)', cat: 'Tooling Defect' },
      { code: 'F', en: 'Flow Marks / Weld Lines', hi: 'वेल्ड लाइन / फ्लो मार्क्स', cat: 'Moulding Defect' },
      { code: 'G', en: 'Warpage / Dimensional Distortion', hi: 'वारपेज (मुड़ जाना)', cat: 'Cooling Defect' },
      { code: 'H', en: 'Black Spots / Contamination', hi: 'काला धब्बा (संदूषण)', cat: 'Material Defect' },
      { code: 'I', en: 'Color Streaks / Poor Mixing', hi: 'रंग में असमानता', cat: 'Masterbatch Defect' },
      { code: 'J', en: 'Jetting Lines', hi: 'जेटिंग लाइनें', cat: 'Tooling Defect' },
      { code: 'K', en: 'Ejector Pin Marks / Push Indentations', hi: 'इजेक्टर पिन के निशान', cat: 'Tooling Defect' },
      { code: 'L', en: 'Cracking / Crazing / Brittleness', hi: 'क्रैकिंग / दरारें', cat: 'Material Defect' },
      { code: 'M', en: 'Bubbles / Blisters / Voids', hi: 'बुलबुले / छाले', cat: 'Material Defect' },
      { code: 'N', en: 'Gloss Variation / Dull Spots', hi: 'चमक में भिन्नता', cat: 'Surface Defect' },
      { code: 'O', en: 'Thread / Insert Damage', hi: 'थ्रेड या इंसर्ट क्षति', cat: 'Mechanical Defect' },
      { code: 'P', en: 'Degating Damage / Gate Tear', hi: 'गेट पर क्षति', cat: 'Trimming Defect' },
      { code: 'Q', en: 'Other Defect / Visual Flaw', hi: 'अन्य दोष', cat: 'General Defect' }
    ];
    for (const r of rejCodes) {
      execute(
        `INSERT INTO rejection_codes (code, description_en, description_hi, category) VALUES (?, ?, ?, ?)`,
        [r.code, r.en, r.hi, r.cat]
      );
    }
  }

  const dtCount = queryOne('SELECT COUNT(*) as count FROM downtime_codes')?.count || 0;
  if (dtCount === 0) {
    console.log('[DB] Seeding Downtime Stoppage Codes (DT-401..DT-409)...');
    const dtCodes = [
      { code: 'DT-401', en: 'Mould Change / Tool Setup', hi: 'मोल्ड बदलाव / टूल सेटअप', cat: 'Tooling' },
      { code: 'DT-402', en: 'Material Shortage / Raw Material Loading', hi: 'सामग्री की कमी / लोडिंग', cat: 'Operational' },
      { code: 'DT-403', en: 'Mechanical Breakdown / Machine Repair', hi: 'मैकेनिकल खराबी', cat: 'Maintenance' },
      { code: 'DT-404', en: 'Electrical Failure / Heater Problem', hi: 'विद्युत या हीटर खराबी', cat: 'Maintenance' },
      { code: 'DT-405', en: 'Quality Trial / Parameter Setting', hi: 'गुणवत्ता परीक्षण / पैरामीटर सेटिंग', cat: 'Quality' },
      { code: 'DT-406', en: 'Planned Maintenance / Greasing', hi: 'नियोजित रखरखाव / ग्रीसिंग', cat: 'Maintenance' },
      { code: 'DT-407', en: 'Power Outage / Utility Interruption', hi: 'बिजली कटौती', cat: 'Facility' },
      { code: 'DT-408', en: 'No Operator / Manpower Shortage', hi: 'ऑपरेटर की अनुपलब्धता', cat: 'Operational' },
      { code: 'DT-409', en: 'Other Stoppage / Waiting', hi: 'अन्य स्टॉपेज', cat: 'General' }
    ];
    for (const d of dtCodes) {
      execute(
        `INSERT INTO downtime_codes (code, description_en, description_hi, category) VALUES (?, ?, ?, ?)`,
        [d.code, d.en, d.hi, d.cat]
      );
    }
  }
}

// Run initial seed
seedInitialData();

console.log('[DB] Database tables, indexes and seed catalogs verified successfully.');

module.exports = {
  db,
  queryOne,
  queryAll,
  execute
};
