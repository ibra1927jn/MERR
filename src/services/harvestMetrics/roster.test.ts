/**
 * harvestMetrics/roster.test.ts — Tests para selectores puros de crew
 */
import { describe, it, expect } from 'vitest';
import type { Picker } from '@/types';
import {
    selectActiveCrew,
    selectActivePickers,
    selectAllStaff,
    selectTeamLeaders,
    selectRunners,
} from './roster';

// Fixture: 5 miembros con roles y estados variados
const fixtureCrew: Picker[] = [
    {
        id: 'p1', picker_id: '101', name: 'Alice', avatar: 'AL',
        current_row: 3, total_buckets_today: 10, hours: 4,
        status: 'active', safety_verified: true, qcStatus: [1],
        role: 'picker',
    },
    {
        id: 'p2', picker_id: '102', name: 'Bob', avatar: 'BO',
        current_row: 4, total_buckets_today: 8, hours: 4,
        status: 'active', safety_verified: true, qcStatus: [1],
        role: 'picker',
    },
    {
        id: 'tl1', picker_id: '201', name: 'Carlos', avatar: 'CA',
        current_row: 0, total_buckets_today: 0, hours: 4,
        status: 'active', safety_verified: true, qcStatus: [],
        role: 'team_leader',
    },
    {
        id: 'r1', picker_id: '301', name: 'Diana', avatar: 'DI',
        current_row: 0, total_buckets_today: 0, hours: 4,
        status: 'active', safety_verified: true, qcStatus: [],
        role: 'runner',
    },
    {
        id: 'p3', picker_id: '103', name: 'Eve', avatar: 'EV',
        current_row: 0, total_buckets_today: 2, hours: 2,
        status: 'inactive', safety_verified: true, qcStatus: [1],
        role: 'picker',
    },
];

describe('selectActiveCrew', () => {
    it('retorna todos los activos sin importar el rol (4)', () => {
        expect(selectActiveCrew(fixtureCrew)).toHaveLength(4);
    });

    it('excluye los inactivos', () => {
        const result = selectActiveCrew(fixtureCrew);
        expect(result.every(p => p.status === 'active')).toBe(true);
    });

    it('no muta el array original', () => {
        const copy = [...fixtureCrew];
        selectActiveCrew(fixtureCrew);
        expect(fixtureCrew).toHaveLength(copy.length);
    });

    it('retorna array vacío si no hay activos', () => {
        expect(selectActiveCrew([])).toHaveLength(0);
    });
});

describe('selectActivePickers', () => {
    it('retorna solo los pickers activos (2)', () => {
        expect(selectActivePickers(fixtureCrew)).toHaveLength(2);
    });

    it('excluye TLs y runners', () => {
        const result = selectActivePickers(fixtureCrew);
        expect(result.every(p => p.role === 'picker')).toBe(true);
    });

    it('excluye pickers inactivos', () => {
        const result = selectActivePickers(fixtureCrew);
        expect(result.every(p => p.status === 'active')).toBe(true);
    });
});

describe('selectAllStaff', () => {
    it('retorna todos los miembros sin filtro (5)', () => {
        expect(selectAllStaff(fixtureCrew)).toHaveLength(5);
    });

    it('retorna la misma referencia de objetos (no copia)', () => {
        const result = selectAllStaff(fixtureCrew);
        expect(result[0]).toBe(fixtureCrew[0]);
    });
});

describe('selectTeamLeaders', () => {
    it('retorna solo los team leaders (1)', () => {
        expect(selectTeamLeaders(fixtureCrew)).toHaveLength(1);
    });

    it('el TL devuelto tiene role team_leader', () => {
        const result = selectTeamLeaders(fixtureCrew);
        expect(result[0].role).toBe('team_leader');
    });
});

describe('selectRunners', () => {
    it('retorna solo los runners (1)', () => {
        expect(selectRunners(fixtureCrew)).toHaveLength(1);
    });

    it('acepta bucket_runner como rol válido', () => {
        const crewWithBucketRunner: Picker[] = [
            {
                id: 'br1', picker_id: '401', name: 'Frank', avatar: 'FR',
                current_row: 0, total_buckets_today: 0, hours: 4,
                status: 'active', safety_verified: true, qcStatus: [],
                role: 'bucket_runner',
            },
        ];
        expect(selectRunners(crewWithBucketRunner)).toHaveLength(1);
    });
});

describe('large fixture: 28 pickers + 2 TLs + 2 runners', () => {
    const makePicker = (id: string, role: string, status: string): Picker => ({
        id, picker_id: id, name: `Person ${id}`,
        avatar: id.slice(0, 2),
        current_row: 1, total_buckets_today: 5, hours: 4,
        status: status as Picker['status'],
        safety_verified: true, qcStatus: [1],
        role,
    });

    const bigCrew: Picker[] = [
        ...Array.from({ length: 28 }, (_, i) => makePicker(`p${i}`, 'picker', 'active')),
        makePicker('tl1', 'team_leader', 'active'),
        makePicker('tl2', 'team_leader', 'active'),
        makePicker('r1', 'runner', 'active'),
        makePicker('r2', 'runner', 'active'),
    ];

    it('selectActivePickers().length === 28', () => {
        expect(selectActivePickers(bigCrew)).toHaveLength(28);
    });

    it('selectAllStaff().length === 32', () => {
        expect(selectAllStaff(bigCrew)).toHaveLength(32);
    });

    it('selectActiveCrew().length === 32 (all 32 are active)', () => {
        expect(selectActiveCrew(bigCrew)).toHaveLength(32);
    });

    it('selectTeamLeaders().length === 2', () => {
        expect(selectTeamLeaders(bigCrew)).toHaveLength(2);
    });

    it('selectRunners().length === 2', () => {
        expect(selectRunners(bigCrew)).toHaveLength(2);
    });
});
