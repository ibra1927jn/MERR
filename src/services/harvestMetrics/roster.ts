/**
 * harvestMetrics/roster.ts — Selectores puros de tripulación
 *
 * Módulo puro sin imports de React. Centraliza la lógica de filtrado
 * de crew para que Dashboard, OrchardMap y otros consumidores usen
 * exactamente la misma definición de "activo".
 */
import { Picker } from '@/types';

/** Pickers, TLs, and runners currently clocked in and active */
export function selectActiveCrew(crew: Picker[]): Picker[] {
    return crew.filter(p => p.status === 'active');
}

/** Pickers (harvesters) only — no TLs, no runners */
export function selectActivePickers(crew: Picker[]): Picker[] {
    return crew.filter(p => p.status === 'active' && p.role === 'picker');
}

/** All staff loaded — pickers + TLs + runners regardless of status */
export function selectAllStaff(crew: Picker[]): Picker[] {
    return crew;
}

/** Team Leaders only */
export function selectTeamLeaders(crew: Picker[]): Picker[] {
    return crew.filter(p => p.role === 'team_leader');
}

/** Runners only */
export function selectRunners(crew: Picker[]): Picker[] {
    return crew.filter(p => p.role === 'runner' || p.role === 'bucket_runner');
}
