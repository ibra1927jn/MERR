import { qcRepository } from '@/repositories/qc.repository';
import type { QCInspectionPayload } from './types';

/**
 * Procesa items de sync tipo QC_INSPECTION — inserta inspecciones en Supabase.
 */
export async function processQCInspection(payload: QCInspectionPayload): Promise<void> {
  const { error } = await qcRepository.insert({
    orchard_id: payload.orchard_id,
    picker_id: payload.picker_id,
    inspector_id: payload.inspector_id,
    grade: payload.grade,
    notes: payload.notes || null,
    photo_url: payload.photo_url || null,
  });

  if (error) {
    throw new Error(`Failed to sync QC inspection: ${error.message}`);
  }
}
