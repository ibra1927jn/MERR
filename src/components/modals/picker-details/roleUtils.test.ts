/**
 * roleUtils — helpers puros de rol/status/badge para PickerDetailsModal.
 */
import { describe, it, expect } from 'vitest';
import {
    isPicker,
    isTeamLeader,
    isRunner,
    roleLabel,
    roleGradient,
    roleIcon,
    roleAccent,
    getStatusConfig,
} from './roleUtils';

describe('role type checks', () => {
    it('isPicker matches "picker" only', () => {
        expect(isPicker('picker')).toBe(true);
        expect(isPicker('team_leader')).toBe(false);
        expect(isPicker('')).toBe(false);
    });

    it('isTeamLeader matches "team_leader" only', () => {
        expect(isTeamLeader('team_leader')).toBe(true);
        expect(isTeamLeader('picker')).toBe(false);
    });

    it('isRunner matches "runner" OR "bucket_runner"', () => {
        expect(isRunner('runner')).toBe(true);
        expect(isRunner('bucket_runner')).toBe(true);
        expect(isRunner('picker')).toBe(false);
    });
});

describe('roleLabel', () => {
    it('team_leader → "Team Leader"', () => {
        expect(roleLabel('team_leader')).toBe('Team Leader');
    });

    it('runner / bucket_runner → "Bucket Runner"', () => {
        expect(roleLabel('runner')).toBe('Bucket Runner');
        expect(roleLabel('bucket_runner')).toBe('Bucket Runner');
    });

    it('picker (o desconocido) → "Picker"', () => {
        expect(roleLabel('picker')).toBe('Picker');
        expect(roleLabel('unknown_role')).toBe('Picker');
    });
});

describe('roleGradient + roleIcon', () => {
    it('team_leader → emerald gradient + shield icon', () => {
        expect(roleGradient('team_leader')).toContain('emerald');
        expect(roleIcon('team_leader')).toBe('shield_person');
    });

    it('runner → amber gradient + shipping icon', () => {
        expect(roleGradient('runner')).toContain('amber');
        expect(roleIcon('bucket_runner')).toBe('local_shipping');
    });

    it('picker default → indigo + agriculture', () => {
        expect(roleGradient('picker')).toContain('indigo');
        expect(roleIcon('picker')).toBe('agriculture');
    });
});

describe('roleAccent', () => {
    it('team_leader devuelve btn/light/focus con emerald', () => {
        const a = roleAccent('team_leader');
        expect(a.btn).toContain('emerald');
        expect(a.light).toContain('emerald');
        expect(a.focus).toContain('emerald');
    });

    it('runner devuelve amber', () => {
        const a = roleAccent('runner');
        expect(a.btn).toContain('amber');
        expect(a.light).toContain('amber');
    });

    it('picker devuelve indigo', () => {
        const a = roleAccent('picker');
        expect(a.btn).toContain('indigo');
    });
});

describe('getStatusConfig', () => {
    it('active → emerald', () => {
        expect(getStatusConfig('active')).toMatchObject({
            label: 'Active',
            bg: 'bg-emerald-100',
            text: 'text-emerald-700',
            dot: 'bg-emerald-500',
        });
    });

    it('on_break → amber', () => {
        expect(getStatusConfig('on_break').label).toBe('On Break');
        expect(getStatusConfig('on_break').dot).toContain('amber');
    });

    it('anything else → inactive slate', () => {
        expect(getStatusConfig('inactive').label).toBe('Inactive');
        expect(getStatusConfig('foo').label).toBe('Inactive');
        expect(getStatusConfig('').dot).toContain('slate');
    });
});
