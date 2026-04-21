/**
 * wizard.types — constants del setup wizard.
 */
import { describe, it, expect } from 'vitest';
import { STEPS, INITIAL_DATA, VARIETIES } from './wizard.types';

describe('STEPS', () => {
    it('expone 4 pasos con key/label/icon', () => {
        expect(STEPS).toHaveLength(4);
        for (const s of STEPS) {
            expect(s.key).toBeTruthy();
            expect(s.label).toBeTruthy();
            expect(s.icon).toBeTruthy();
        }
    });

    it('keys son orchard/teams/rates/summary', () => {
        expect(STEPS.map((s) => s.key)).toEqual(['orchard', 'teams', 'rates', 'summary']);
    });
});

describe('INITIAL_DATA', () => {
    it('orchard default con total_rows 20', () => {
        expect(INITIAL_DATA.orchard.total_rows).toBe(20);
        expect(INITIAL_DATA.orchard.code).toBe('');
        expect(INITIAL_DATA.orchard.name).toBe('');
    });

    it('teams default con 1 equipo "Team Alpha"', () => {
        expect(INITIAL_DATA.teams).toHaveLength(1);
        expect(INITIAL_DATA.teams[0].name).toBe('Team Alpha');
        expect(INITIAL_DATA.teams[0].max_pickers).toBe(15);
    });

    it('rates default variety=Lapin, piece_rate=1.80, start_time=06:30', () => {
        expect(INITIAL_DATA.rates.variety).toBe('Lapin');
        expect(INITIAL_DATA.rates.piece_rate).toBe(1.80);
        expect(INITIAL_DATA.rates.start_time).toBe('06:30');
    });
});

describe('VARIETIES', () => {
    it('cubre 12 varieties cherry', () => {
        expect(VARIETIES).toHaveLength(12);
    });

    it('incluye Lapin (default) + Sweetheart + Kordia', () => {
        expect(VARIETIES).toContain('Lapin');
        expect(VARIETIES).toContain('Sweetheart');
        expect(VARIETIES).toContain('Kordia');
    });

    it('todos los nombres son unique', () => {
        expect(new Set(VARIETIES).size).toBe(VARIETIES.length);
    });

    it('variety default INITIAL_DATA.rates.variety está en VARIETIES', () => {
        expect(VARIETIES).toContain(INITIAL_DATA.rates.variety);
    });
});
