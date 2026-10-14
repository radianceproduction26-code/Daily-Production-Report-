// Radiance Polymers Audit - Calculation Unit Tests
// Run: node _audit/tests/calc_unit_tests.mjs
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

import {
  calculateTheoreticalHourlyTarget,
  calculateMaxAllowedProduction,
  calculateOEEMetrics,
  validateCounters,
  validateMaterialConsumption
} from '../../src/services/validationEngine.js';

function calcRejectionRate(rej, prod) {
  const p = Number(prod) || 0;
  const r = Number(rej) || 0;
  if (p <= 0 || r <= 0) return 0.00;
  return Number(Math.min(100, (r / p) * 100).toFixed(2));
}

function calcEfficiency(prod, target) {
  const t = Number(target) || 0;
  const p = Number(prod) || 0;
  if (t <= 0 || p <= 0) return 0.00;
  return Number(Math.min(100, (p / t) * 100).toFixed(2));
}

let passed=0,failed=0;const results=[];
function test(name,fn){try{fn();console.log(`  PASS: ${name}`);passed++;results.push({name,status:'PASS'});}catch(e){console.log(`  FAIL: ${name} => ${e.message}`);failed++;results.push({name,status:'FAIL',error:e.message});}}
function eq(a,b,m){if(a!==b)throw new Error(`${m||''} Expected:${b} Got:${a}`);}
function approx(a,b,t,m){if(Math.abs(a-b)>t)throw new Error(`${m||''} Expected~${b} Got:${a}`);}
function ok(v,m){if(!v)throw new Error(m||`Expected true got ${v}`);}
function nok(v,m){if(v)throw new Error(m||`Expected false got ${v}`);}

console.log('\n=== RADIANCE QA AUDIT - Unit Tests ===');
console.log('A. Theoretical Hourly Target');
test('A1 CT=3.75s 4-cav -> 3840',()=>eq(calculateTheoreticalHourlyTarget(3.75,4),3840));
test('A2 CT=20s 2-cav -> 360',()=>eq(calculateTheoreticalHourlyTarget(20,2),360));
test('A3 CT=30s 1-cav -> 120',()=>eq(calculateTheoreticalHourlyTarget(30,1),120));
test('A4 CT=45s 2-cav -> 160',()=>eq(calculateTheoreticalHourlyTarget(45,2),160));
test('A5 CT=25s 4-cav -> 576',()=>eq(calculateTheoreticalHourlyTarget(25,4),576));
test('A6 CT=0 -> 0',()=>eq(calculateTheoreticalHourlyTarget(0,4),0));
test('A7 CT=3600s 1-cav -> 1',()=>eq(calculateTheoreticalHourlyTarget(3600,1),1));
test('A8 CT=0.001s 1-cav -> 3600000',()=>eq(calculateTheoreticalHourlyTarget(0.001,1),3600000));
test('A9 negative CT -> 0',()=>eq(calculateTheoreticalHourlyTarget(-5,2),0));
test('A10 cav=0 -> 0',()=>eq(calculateTheoreticalHourlyTarget(20,0),0));
test('A11 text CT -> 0',()=>eq(calculateTheoreticalHourlyTarget('abc',2),0));

console.log('B. Max Allowed Production');
test('B1 20s 2cav 0dt -> 360',()=>eq(calculateMaxAllowedProduction(20,2,0),360));
test('B2 20s 2cav 10dt -> 300',()=>eq(calculateMaxAllowedProduction(20,2,10),300));
test('B3 30s 1cav 15dt -> 90',()=>eq(calculateMaxAllowedProduction(30,1,15),90));
test('B4 25s 4cav 20dt -> 384',()=>eq(calculateMaxAllowedProduction(25,4,20),384));
test('B5 45s 2cav 30dt -> 80',()=>eq(calculateMaxAllowedProduction(45,2,30),80));
test('B6 dt=60 -> 0',()=>eq(calculateMaxAllowedProduction(20,2,60),0));
test('B7 dt=61 clamped -> 0',()=>eq(calculateMaxAllowedProduction(20,2,61),0));
test('B8 negative dt clamped -> 360',()=>eq(calculateMaxAllowedProduction(20,2,-10),360));
test('B9 CT=0 -> 0',()=>eq(calculateMaxAllowedProduction(0,2,10),0));
test('B10 dt=9999 clamped -> 0',()=>eq(calculateMaxAllowedProduction(20,2,9999),0));
test('B11 negative CT -> 0',()=>eq(calculateMaxAllowedProduction(-20,2,0),0));

console.log('C. OEE Metrics');
test('C1 Perfect shift OEE=100%',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:480,totalDowntimeMinutes:0,totalProductionQty:2880,acceptedQty:2880,standardCycleTimeSeconds:20,cavityCount:2});eq(r.oeePercent,'100.0');});
test('C2 50% DT -> OEE=50%',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:480,totalDowntimeMinutes:240,totalProductionQty:1440,acceptedQty:1440,standardCycleTimeSeconds:20,cavityCount:2});eq(r.oeePercent,'50.0');});
test('C3 10% rejection OEE=90%',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:480,totalDowntimeMinutes:0,totalProductionQty:2880,acceptedQty:2592,standardCycleTimeSeconds:20,cavityCount:2});eq(r.oeePercent,'90.0');});
test('C4 Real-world OEE plausible',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:480,totalDowntimeMinutes:30,totalProductionQty:2200,acceptedQty:2100,standardCycleTimeSeconds:20,cavityCount:2});const o=parseFloat(r.oeePercent);ok(o>60&&o<95,`OEE ${o}% out of range`);});
test('C5 Multi-session positive OEE',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:720,totalDowntimeMinutes:60,totalProductionQty:4000,acceptedQty:3800,standardCycleTimeSeconds:25,cavityCount:4});ok(parseFloat(r.oeePercent)>0);});
test('C6 Zero prod -> OEE 0%',()=>{const r=calculateOEEMetrics({totalProductionQty:0,acceptedQty:0,standardCycleTimeSeconds:20,cavityCount:2});eq(r.oeePercent,'0.0');});
test('C7 Zero planned time no crash',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:0,totalProductionQty:100,acceptedQty:90,standardCycleTimeSeconds:20,cavityCount:2});ok(typeof r.oeePercent==='string');});
test('C8 Overproduction capped at 100%',()=>{const r=calculateOEEMetrics({totalProductionQty:99999,acceptedQty:99999,standardCycleTimeSeconds:20,cavityCount:2});eq(r.performancePercent,'100.0');});
test('C9 Negative DT -> avail 100%',()=>{const r=calculateOEEMetrics({totalDowntimeMinutes:-100,totalProductionQty:2880,acceptedQty:2880,standardCycleTimeSeconds:20,cavityCount:2});eq(r.availabilityPercent,'100.0');});
test('C10: acc>prod quality clamped to 100%',()=>{const r=calculateOEEMetrics({totalProductionQty:100,acceptedQty:200,standardCycleTimeSeconds:20,cavityCount:2});eq(r.qualityPercent,'100.0');});
test('C11 String inputs no crash',()=>{const r=calculateOEEMetrics({plannedProductionTimeMinutes:'abc',totalDowntimeMinutes:'xyz',totalProductionQty:0,acceptedQty:0,standardCycleTimeSeconds:20,cavityCount:2});ok(typeof r.oeePercent==='string');});

console.log('D. Counter Validation');
test('D1 Exact match 0 variance',()=>{const r=validateCounters({startCounter:1000,endCounter:1400,cavityCount:2,actualTotalProduction:800});ok(r.isValid);eq(r.variancePcs,0);});
test('D2 1.5% variance no warning',()=>{const r=validateCounters({startCounter:0,endCounter:400,cavityCount:2,actualTotalProduction:812});ok(r.isValid);eq(r.warnings.length,0);});
test('D3 5% variance warning',()=>{const r=validateCounters({startCounter:0,endCounter:400,cavityCount:2,actualTotalProduction:840});ok(r.warnings.length>0);});
test('D4 Industrial counter range',()=>{const r=validateCounters({startCounter:142500,endCounter:143335,cavityCount:2,actualTotalProduction:1670});eq(r.totalShots,835);});
test('D5 Single cavity check',()=>{const r=validateCounters({startCounter:5000,endCounter:5100,cavityCount:1,actualTotalProduction:100});ok(r.isValid);eq(r.variancePcs,0);});
test('D6 End=Start invalid',()=>{const r=validateCounters({startCounter:1000,endCounter:1000,cavityCount:2,actualTotalProduction:0});nok(r.isValid);});
test('D7 End<Start invalid',()=>{const r=validateCounters({startCounter:1000,endCounter:999,cavityCount:2,actualTotalProduction:0});nok(r.isValid);});
test('D8 Zero actual 100% variance warn',()=>{const r=validateCounters({startCounter:0,endCounter:100,cavityCount:2,actualTotalProduction:0});ok(r.warnings.length>0);});
test('D9 Negative counters valid if end>start',()=>{const r=validateCounters({startCounter:-200,endCounter:-100,cavityCount:2,actualTotalProduction:200});ok(r.isValid);eq(r.totalShots,100);});
test('D10 String counters invalid',()=>{const r=validateCounters({startCounter:'abc',endCounter:'xyz',cavityCount:2,actualTotalProduction:0});nok(r.isValid);});
test('D11 MAX_SAFE_INTEGER valid',()=>{const r=validateCounters({startCounter:0,endCounter:Number.MAX_SAFE_INTEGER,cavityCount:1,actualTotalProduction:Number.MAX_SAFE_INTEGER});ok(r.isValid);eq(r.variancePcs,0);});

console.log('E. Material Consumption');
test('E1 Exact match 0 variance',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:49.5});approx(r.expectedUsageKg,49.5,0.01);nok(r.isAbnormal);});
test('E2 3% variance within tolerance',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:51.0});nok(r.isAbnormal);});
test('E3 8% variance flagged',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:53.5});ok(r.isAbnormal);});
test('E4 1670 pcs material check',()=>{const r=validateMaterialConsumption({actualTotalProduction:1670,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:82.67});approx(r.expectedUsageKg,82.665,0.1);});
test('E5 Zero runner weight',()=>{const r=validateMaterialConsumption({actualTotalProduction:500,partWeightGrams:100,runnerWeightGrams:0,totalMaterialUsedKg:50.0});approx(r.expectedUsageKg,50.0,0.01);});
test('E6 Zero prod expected=0',()=>{const r=validateMaterialConsumption({actualTotalProduction:0,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:5.0});eq(r.expectedUsageKg,0);nok(r.isAbnormal);});
test('E7: 0 material when expected>0 flags abnormal',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:0});ok(r.isAbnormal);ok(r.warnings.length>0);});
test('E8 1M pcs no crash',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000000,partWeightGrams:10,runnerWeightGrams:2,totalMaterialUsedKg:12000});approx(r.expectedUsageKg,12000,1);});
test('E9 Negative prod -> 0',()=>{const r=validateMaterialConsumption({actualTotalProduction:-100,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:5.0});eq(r.expectedUsageKg,0);});
test('E10 Text in weight NaN->0',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000,partWeightGrams:'abc',runnerWeightGrams:7.0,totalMaterialUsedKg:50.0});approx(r.expectedUsageKg,7,0.01);});
test('E11 Undefined material no crash',()=>{const r=validateMaterialConsumption({actualTotalProduction:1000,partWeightGrams:42.5,runnerWeightGrams:7.0,totalMaterialUsedKg:undefined});nok(r.isAbnormal);});

console.log('F. Rejection Rate & Efficiency');
test('F1 25/800 = 3.13%',()=>approx(calcRejectionRate(25,800),3.13,0.01));
test('F2 0 rej = 0%',()=>eq(calcRejectionRate(0,800),0));
test('F3 800/900 eff = 88.89%',()=>approx(calcEfficiency(800,900),88.89,0.01));
test('F4 100% efficiency',()=>eq(calcEfficiency(900,900),100.00));
test('F5: over-prod eff clamped to 100%',()=>{const e=calcEfficiency(1000,900);eq(e,100.00);});
test('F6 Zero target no divzero',()=>eq(calcEfficiency(800,0),0.00));
test('F7 All rejected = 100%',()=>eq(calcRejectionRate(800,800),100.00));
test('F8: rej>prod clamped to 100%',()=>{const r=calcRejectionRate(1000,800);eq(r,100.00);});

console.log(`\n=== RESULTS: ${passed} PASS | ${failed} FAIL | Total: ${passed+failed} ===\n`);
const out=join(__dir,'..','logs','unit_test_results.json');
writeFileSync(out,JSON.stringify({runAt:new Date().toISOString(),passed,failed,total:passed+failed,results},null,2));
console.log('Results saved to _audit/logs/unit_test_results.json');
if(failed>0)process.exit(1);
