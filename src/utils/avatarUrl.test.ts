/**
 * avatarUrl — genera URL para servicio ui-avatars.com.
 */
import { describe, it, expect } from 'vitest';
import { avatarUrl } from './avatarUrl';

describe('avatarUrl', () => {
    it('base URL apunta a ui-avatars.com/api/', () => {
        const url = avatarUrl('John');
        expect(url.startsWith('https://ui-avatars.com/api/')).toBe(true);
    });

    it('incluye name como query param encoded', () => {
        const url = avatarUrl('Ana Pérez');
        const u = new URL(url);
        expect(u.searchParams.get('name')).toBe('Ana Pérez');
    });

    it('background defecto "random" si no se pasa opciones', () => {
        const url = avatarUrl('Jane');
        const u = new URL(url);
        expect(u.searchParams.get('background')).toBe('random');
    });

    it('respeta background custom cuando se pasa', () => {
        const url = avatarUrl('Jane', { background: '0D8ABC' });
        const u = new URL(url);
        expect(u.searchParams.get('background')).toBe('0D8ABC');
    });

    it('color custom añade param color', () => {
        const url = avatarUrl('Jane', { color: 'fff' });
        const u = new URL(url);
        expect(u.searchParams.get('color')).toBe('fff');
    });

    it('combina background + color sin perder name', () => {
        const url = avatarUrl('Jane', { background: '000', color: 'fff' });
        const u = new URL(url);
        expect(u.searchParams.get('name')).toBe('Jane');
        expect(u.searchParams.get('background')).toBe('000');
        expect(u.searchParams.get('color')).toBe('fff');
    });

    it('name vacío sigue siendo URL válida', () => {
        expect(() => new URL(avatarUrl(''))).not.toThrow();
    });

    it('name con espacios/acentos se URL-encoda (no rompe)', () => {
        const url = avatarUrl('José María');
        expect(url).toMatch(/Jos/);
        expect(() => new URL(url)).not.toThrow();
    });
});
