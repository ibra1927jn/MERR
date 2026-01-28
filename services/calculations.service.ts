// =============================================
// CALCULATIONS SERVICE - Lógica de negocio
// =============================================
import { MINIMUM_WAGE, MAX_BUCKETS_PER_BIN, PIECE_RATE } from '../types';

export const calculationsService = {
  // Calcular estado del picker basado en productividad
  calculatePickerStatus(totalBuckets: number, hoursWorked: number): 'green' | 'orange' | 'red' {
    if (hoursWorked === 0) return 'orange';
    
    const hourlyEarnings = (totalBuckets * PIECE_RATE) / hoursWorked;
    
    if (hourlyEarnings >= MINIMUM_WAGE * 1.1) return 'green';  // 10% sobre mínimo
    if (hourlyEarnings >= MINIMUM_WAGE) return 'orange';       // En el mínimo
    return 'red';                                               // Bajo mínimo
  },

  // Calcular si un picker está bajo el mínimo
  isUnderMinimum(buckets: number, hours: number): boolean {
    if (hours === 0) return false;
    const bucketsPerHour = buckets / hours;
    const minBucketsPerHour = MINIMUM_WAGE / PIECE_RATE;
    return bucketsPerHour < minBucketsPerHour;
  },

  // Calcular buckets por hora
  getBucketsPerHour(buckets: number, hours: number): number {
    if (hours === 0) return 0;
    return Math.round((buckets / hours) * 10) / 10;
  },

  // Calcular minutos de exposición solar
  calculateSunExposure(startTimestamp: string | Date): number {
    const start = new Date(startTimestamp);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  },

  // Verificar si el bin está lleno
  isBinFull(bucketCount: number): boolean {
    return bucketCount >= MAX_BUCKETS_PER_BIN;
  },

  // Calcular porcentaje de llenado del bin
  getBinFillPercentage(bucketCount: number): number {
    return Math.min(100, Math.round((bucketCount / MAX_BUCKETS_PER_BIN) * 100));
  },

  // Calcular ganancias estimadas
  calculateEarnings(buckets: number): number {
    return buckets * PIECE_RATE;
  },

  // Calcular ganancias por hora
  calculateHourlyEarnings(buckets: number, hours: number): number {
    if (hours === 0) return 0;
    return (buckets * PIECE_RATE) / hours;
  },

  // Calcular buckets necesarios para alcanzar mínimo
  bucketsNeededForMinimum(currentBuckets: number, hoursWorked: number, hoursRemaining: number): number {
    const totalHours = hoursWorked + hoursRemaining;
    const totalNeeded = Math.ceil((MINIMUM_WAGE * totalHours) / PIECE_RATE);
    return Math.max(0, totalNeeded - currentBuckets);
  },

  // Calcular velocidad del equipo
  calculateTeamVelocity(crew: Array<{ buckets: number }>, hoursElapsed: number): number {
    if (hoursElapsed === 0 || crew.length === 0) return 0;
    const totalBuckets = crew.reduce((sum, p) => sum + p.buckets, 0);
    return Math.round(totalBuckets / hoursElapsed);
  },

  // Calcular ETA para completar objetivo
  calculateETA(currentTons: number, targetTons: number, velocity: number): number | null {
    if (velocity <= 0) return null;
    const remaining = targetTons - currentTons;
    if (remaining <= 0) return 0;
    // Asumiendo ~0.005 toneladas por bucket
    const tonsPerHour = velocity * 0.005;
    return remaining / tonsPerHour;
  },

  // Formatear tiempo de exposición solar
  formatSunExposure(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  },

  // Determinar si necesita alerta de hidratación
  needsHydrationAlert(lastBreakTime: string | null, minutesSinceStart: number): boolean {
    if (!lastBreakTime) {
      // Si no ha tenido break y han pasado más de 90 minutos
      return minutesSinceStart >= 90;
    }
    
    const lastBreak = new Date(lastBreakTime);
    const now = new Date();
    const minutesSinceBreak = (now.getTime() - lastBreak.getTime()) / 60000;
    
    return minutesSinceBreak >= 90;
  },

  // Calcular progreso de bloque
  calculateBlockProgress(rows: Array<{ completion_percentage: number }>): number {
    if (rows.length === 0) return 0;
    const total = rows.reduce((sum, r) => sum + r.completion_percentage, 0);
    return Math.round(total / rows.length);
  },

  // Obtener estado del inventario
  getInventoryStatus(emptyBins: number): 'ok' | 'low' | 'critical' {
    if (emptyBins >= 20) return 'ok';
    if (emptyBins >= 10) return 'low';
    return 'critical';
  },

  // Calcular pago diario estimado para todo el equipo
  calculateDailyPayroll(crew: Array<{ buckets: number; hours: number }>): {
    totalPiece: number;
    totalMinimum: number;
    finalTotal: number;
  } {
    let totalPiece = 0;
    let totalMinimum = 0;

    crew.forEach(picker => {
      const pieceEarnings = picker.buckets * PIECE_RATE;
      const minimumEarnings = picker.hours * MINIMUM_WAGE;
      
      totalPiece += pieceEarnings;
      totalMinimum += Math.max(minimumEarnings - pieceEarnings, 0);
    });

    return {
      totalPiece,
      totalMinimum,
      finalTotal: totalPiece + totalMinimum,
    };
  },
};

export default calculationsService;