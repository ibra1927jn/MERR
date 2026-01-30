// =============================================
// QC SERVICE - Gestión de Calidad
// =============================================
import { db } from './db';
import { supabase } from './supabase';
import { Inspection } from '../types';

export const qcService = {
  // Crear una nueva inspección
  async createInspection(inspection: Omit<Inspection, 'id' | 'created_at'>): Promise<Inspection> {
    const newInspection: Inspection = {
      id: Math.random().toString(36).substring(2, 11),
      ...inspection,
      created_at: new Date().toISOString(),
    };

    // Guardar offline primero
    await db.offlineActions.add({
      actionId: newInspection.id,
      actionType: 'CREATE_INSPECTION',
      payload: newInspection,
      timestamp: newInspection.created_at,
      synced: false,
      retryCount: 0
    });

    // Intentar sincronizar si hay conexión (aquí iría la lógica de sync real)
    // Por ahora solo retornamos el objeto creado
    return newInspection;
  },

  // Obtener inspecciones por picker
  async getInspectionsByPicker(pickerId: string): Promise<Inspection[]> {
    // En una app real, esto combinaría datos locales y remotos
    // Por ahora simulamos
    return [];
  },

  // Calcular métricas de calidad
  calculateQualityScore(inspections: Inspection[]): number {
    if (inspections.length === 0) return 100;

    const weights = {
      excellent: 100,
      good: 85,
      warning: 60,
      reject: 0
    };

    const totalScore = inspections.reduce((sum, insp) => sum + weights[insp.result], 0);
    return Math.round(totalScore / inspections.length);
  }
};

export default qcService;
