/**
 * harvestMetrics/perTeam.ts — Roll-up por equipo (Team Leader)
 *
 * Pure helper — sin React.
 */
import type { Picker } from '@/types';
import type { PickerMetrics } from './perPicker';

export interface TeamMetrics {
    teamLeaderName: string;
    teamLeaderId: string;
    pickerCount: number;
    totalBins: number;
    totalHours: number;
    totalEarnings: number;
    costPerBin: number;
}

/**
 * Agrupa PickerMetrics por team leader.
 * Devuelve array ordenado por costPerBin ascendente (más eficiente primero).
 */
export function computePerTeam(
    pickerMetrics: PickerMetrics[],
    crew: Picker[]
): TeamMetrics[] {
    // Construir mapa leaderId → Picker para lookups rápidos
    const leaderMap = new Map<string, Picker>();
    for (const c of crew) {
        if (c.role === 'team_leader' || c.role === 'runner') leaderMap.set(c.id, c);
    }

    const teamMap = new Map<string, PickerMetrics[]>();
    for (const pm of pickerMetrics) {
        const key = pm.teamLeaderId ?? 'unassigned';
        if (!teamMap.has(key)) teamMap.set(key, []);
        teamMap.get(key)!.push(pm);
    }

    const teams: TeamMetrics[] = [];
    for (const [leaderId, members] of teamMap) {
        const leader = leaderMap.get(leaderId);
        const teamLeaderName = leader?.name ?? 'Unassigned';
        const totalBins = members.reduce((s, m) => s + m.bins, 0);
        const totalHours = members.reduce((s, m) => s + m.hoursWorked, 0);
        const totalEarnings = members.reduce((s, m) => s + m.earned, 0);
        const costPerBin = totalBins > 0 ? totalEarnings / totalBins : 0;

        teams.push({
            teamLeaderName,
            teamLeaderId: leaderId,
            pickerCount: members.length,
            totalBins,
            totalHours,
            totalEarnings,
            costPerBin,
        });
    }

    return teams.sort((a, b) => a.costPerBin - b.costPerBin);
}
