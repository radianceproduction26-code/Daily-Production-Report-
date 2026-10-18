// ==============================================================================
// RADIANCE POLYMERS - BOM (BILL OF MATERIALS) SERVICE
// Manages Part-to-Raw-Material resin formulas, ratios, and shot weights
// ==============================================================================
import { supabase, isSupabaseConfigured, formatDatabaseError } from '../lib/supabaseClient';

/**
 * 1. Fetch all BOM linkages across parts with material details
 */
export async function getAllBom() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], error: 'Database is not connected.' };
  }

  try {
    const { data, error } = await supabase
      .from('part_bom')
      .select(`
        id,
        percentage,
        quantity_per_shot_grams,
        is_active,
        created_at,
        part:parts (id, part_number, part_name, customer, part_weight_grams, runner_weight_grams),
        material:raw_materials (id, material_code, material_name, material_type, grade, cost_per_kg, unit)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error, 'Failed to fetch BOM.') };
    }

    const normalized = (data || []).map(b => ({
      id: b.id,
      partId: b.part?.id,
      partNumber: b.part?.part_number,
      partName: b.part?.part_name,
      materialId: b.material?.id,
      materialCode: b.material?.material_code,
      materialName: b.material?.material_name,
      materialType: b.material?.material_type,
      grade: b.material?.grade,
      percentage: Number(b.percentage) || 100,
      quantityPerShotGrams: Number(b.quantity_per_shot_grams) || 0,
      costPerKg: Number(b.material?.cost_per_kg) || 0,
      isActive: b.is_active
    }));

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err) };
  }
}

/**
 * 2. Fetch BOM lines for a specific Part
 */
export async function getBomByPartId(partId) {
  if (!isSupabaseConfigured || !supabase || !partId) {
    return { success: false, data: [], error: 'Part ID is required.' };
  }

  try {
    const { data, error } = await supabase
      .from('part_bom')
      .select(`
        id,
        percentage,
        quantity_per_shot_grams,
        is_active,
        material:raw_materials (id, material_code, material_name, material_type, grade, cost_per_kg, unit)
      `)
      .eq('part_id', partId)
      .eq('is_active', true);

    if (error) {
      return { success: false, data: [], error: formatDatabaseError(error) };
    }

    const normalized = (data || []).map(b => ({
      id: b.id,
      materialId: b.material?.id,
      materialCode: b.material?.material_code,
      materialName: b.material?.material_name,
      materialType: b.material?.material_type,
      grade: b.material?.grade,
      percentage: Number(b.percentage) || 100,
      quantityPerShotGrams: Number(b.quantity_per_shot_grams) || 0,
      costPerKg: Number(b.material?.cost_per_kg) || 0
    }));

    return { success: true, data: normalized };
  } catch (err) {
    return { success: false, data: [], error: formatDatabaseError(err) };
  }
}

/**
 * 3. Add a new BOM Line
 */
export async function addBomLine({ partId, materialId, percentage = 100, quantityPerShotGrams = 0 }) {
  if (!supabase) return { success: false, error: 'Database not connected.' };

  const pct = Number(percentage);
  const qty = Number(quantityPerShotGrams);

  if (!partId || !materialId) {
    return { success: false, error: 'Both Part and Raw Material must be selected.' };
  }
  if (isNaN(pct) || pct <= 0 || pct > 100) {
    return { success: false, error: 'BOM percentage must be between 0.1% and 100%.' };
  }

  try {
    const { data, error } = await supabase
      .from('part_bom')
      .insert({
        part_id: partId,
        material_id: materialId,
        percentage: pct,
        quantity_per_shot_grams: qty,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: formatDatabaseError(error, 'Failed to save BOM line.') };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

/**
 * 4. Update an existing BOM Line
 */
export async function updateBomLine(id, updates) {
  if (!supabase) return { success: false, error: 'Database not connected.' };

  try {
    const payload = {};
    if (updates.percentage !== undefined) payload.percentage = Number(updates.percentage);
    if (updates.quantityPerShotGrams !== undefined) payload.quantity_per_shot_grams = Number(updates.quantityPerShotGrams);
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('part_bom')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}

/**
 * 5. Delete a BOM Line
 */
export async function deleteBomLine(id) {
  if (!supabase) return { success: false, error: 'Database not connected.' };

  try {
    const { error } = await supabase
      .from('part_bom')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: formatDatabaseError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
}
