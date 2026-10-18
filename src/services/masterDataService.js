// ==============================================================================
// RADIANCE POLYMERS - MASTER DATA SERVICE (LIVE DATABASE)
// Direct Supabase data-access layer for Machines, Parts, Materials, and Codes
// ==============================================================================
import { supabase, isSupabaseConfigured, formatDatabaseError } from '../lib/supabaseClient';

/**
 * Normalizes machine row for frontend component consumption.
 */
function normalizeMachine(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    machineNumber: row.machine_number,
    machineCode: row.machine_number,
    machineName: row.machine_name,
    capacityTon: Number(row.capacity_ton) || 450,
    tonnage: Number(row.capacity_ton) || 450,
    hourlyCostRate: Number(row.hourly_cost_rate) || 1500,
    status: row.status || 'active'
  };
}

/**
 * Normalizes part row for frontend component consumption.
 */
function normalizePart(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    partNumber: row.part_number,
    partCode: row.part_number,
    partName: row.part_name,
    customer: row.customer || '',
    standardCycleTimeSeconds: Number(row.standard_cycle_time_seconds) || 20,
    cycleTime: Number(row.standard_cycle_time_seconds) || 20,
    cavityCount: Number(row.cavity_count) || 1,
    partWeightGrams: Number(row.part_weight_grams) || 0,
    runnerWeightGrams: Number(row.runner_weight_grams) || 0,
    rawMaterialGrade: row.raw_material_grade || '',
    materialGrade: row.raw_material_grade || '',
    status: row.status || 'active'
  };
}

/**
 * 1. Fetch all machines from Supabase
 */
export async function getMachines() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('machine_number', { ascending: true });

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error, 'Failed to fetch machines.') };
    }

    const normalized = (data || []).map(normalizeMachine);
    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err, 'Network error fetching machines.') };
  }
}

/**
 * 2. Fetch all parts from Supabase
 */
export async function getParts() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('part_number', { ascending: true });

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error, 'Failed to fetch parts.') };
    }

    const normalized = (data || []).map(normalizePart);
    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err, 'Network error fetching parts.') };
  }
}

/**
 * 3. Fetch all raw materials & resins
 */
export async function getRawMaterials() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .order('material_code', { ascending: true });

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error, 'Failed to fetch raw materials.') };
    }

    const normalized = (data || []).map(m => ({
      ...m,
      id: m.id,
      materialCode: m.material_code,
      materialName: m.material_name,
      materialType: m.material_type,
      costPerKg: Number(m.cost_per_kg) || 0,
      standardPricePerKg: Number(m.cost_per_kg) || 0
    }));

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err, 'Network error fetching raw materials.') };
  }
}

/**
 * 4. Fetch machine-part tooling mappings
 */
export async function getMachinePartMappings() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('machine_part_mappings')
      .select(`
        id,
        mould_number,
        approved_to_run,
        machine:machines (id, machine_number, machine_name),
        part:parts (id, part_number, part_name)
      `);

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error, 'Failed to fetch mappings.') };
    }

    const normalized = (data || []).map(m => ({
      id: m.id,
      machineId: m.machine?.id,
      machineCode: m.machine?.machine_number,
      machineNumber: m.machine?.machine_number,
      machineName: m.machine?.machine_name,
      partId: m.part?.id,
      partCode: m.part?.part_number,
      partNumber: m.part?.part_number,
      partName: m.part?.part_name,
      mouldNumber: m.mould_number,
      approvedToRun: m.approved_to_run
    }));

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err, 'Network error fetching mappings.') };
  }
}

/**
 * 5. Fetch Rejection Defect Codes (A..Q)
 */
export async function getRejectionReasons() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('rejection_reasons')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error) };
    }

    const normalized = (data || []).map(r => ({
      code: r.code,
      description: r.description_en,
      descriptionEn: r.description_en,
      descriptionHi: r.description_hi,
      category: r.category,
      isActive: r.is_active
    }));

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err) };
  }
}

/**
 * 6. Fetch Downtime Stoppage Codes (DT-401..DT-409)
 */
export async function getDowntimeReasons() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('downtime_reasons')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error) };
    }

    const normalized = (data || []).map(d => ({
      code: d.code,
      description: d.description_en,
      descriptionEn: d.description_en,
      descriptionHi: d.description_hi,
      category: d.category,
      isActive: d.is_active
    }));

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err) };
  }
}

/**
 * ─── ADMIN MUTATIONS ────────────────────────────────────────────────────────
 */

export async function createPart(partData) {
  if (!supabase) return { success: false, error: 'Database not connected.' };
  try {
    const { data, error } = await supabase
      .from('parts')
      .insert({
        part_number: String(partData.partNumber || partData.partCode).trim(),
        part_name: String(partData.partName || '').trim(),
        customer: String(partData.customer || '').trim(),
        standard_cycle_time_seconds: Number(partData.standardCycleTimeSeconds || partData.cycleTime) || 20,
        cavity_count: Number(partData.cavityCount) || 1,
        part_weight_grams: Number(partData.partWeightGrams) || 0,
        runner_weight_grams: Number(partData.runnerWeightGrams) || 0,
        raw_material_grade: String(partData.rawMaterialGrade || partData.materialGrade || '').trim(),
        status: partData.status || 'active'
      })
      .select()
      .single();

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true, data: normalizePart(data) };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

export async function updatePart(id, partData) {
  if (!supabase) return { success: false, error: 'Database not connected.' };
  try {
    const payload = {};
    if (partData.partNumber !== undefined) payload.part_number = partData.partNumber;
    if (partData.partName !== undefined) payload.part_name = partData.partName;
    if (partData.customer !== undefined) payload.customer = partData.customer;
    if (partData.standardCycleTimeSeconds !== undefined) payload.standard_cycle_time_seconds = partData.standardCycleTimeSeconds;
    if (partData.cavityCount !== undefined) payload.cavity_count = partData.cavityCount;
    if (partData.partWeightGrams !== undefined) payload.part_weight_grams = partData.partWeightGrams;
    if (partData.runnerWeightGrams !== undefined) payload.runner_weight_grams = partData.runnerWeightGrams;
    if (partData.rawMaterialGrade !== undefined) payload.raw_material_grade = partData.rawMaterialGrade;
    if (partData.status !== undefined) payload.status = partData.status;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('parts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true, data: normalizePart(data) };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

export async function createMachine(machineData) {
  if (!supabase) return { success: false, error: 'Database not connected.' };
  try {
    const { data, error } = await supabase
      .from('machines')
      .insert({
        machine_number: String(machineData.machineNumber || machineData.machineCode).trim().toUpperCase(),
        machine_name: String(machineData.machineName || '').trim(),
        make: String(machineData.make || 'Milacron').trim(),
        model: String(machineData.model || '').trim(),
        capacity_ton: Number(machineData.capacityTon || machineData.tonnage) || 450,
        hourly_cost_rate: Number(machineData.hourlyCostRate) || 1500,
        status: machineData.status || 'active'
      })
      .select()
      .single();

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true, data: normalizeMachine(data) };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

export async function updateMachine(id, machineData) {
  if (!supabase) return { success: false, error: 'Database not connected.' };
  try {
    const payload = {};
    if (machineData.machineNumber !== undefined) payload.machine_number = machineData.machineNumber;
    if (machineData.machineName !== undefined) payload.machine_name = machineData.machineName;
    if (machineData.capacityTon !== undefined) payload.capacity_ton = machineData.capacityTon;
    if (machineData.hourlyCostRate !== undefined) payload.hourly_cost_rate = machineData.hourlyCostRate;
    if (machineData.status !== undefined) payload.status = machineData.status;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('machines')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true, data: normalizeMachine(data) };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}
