/**
 * RunnerLeaderboard — tabla rendimiento runners.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RunnerLeaderboard from './RunnerLeaderboard';
import { I18nProvider } from '@/i18n';

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('RunnerLeaderboard', () => {
    it('empty state cuando runners=[]', () => {
        const { container } = renderWithI18n(<RunnerLeaderboard runners={[]} />);
        expect(container.querySelector('table')).toBeNull();
    });

    it('renderiza tabla con cols Runner/Ciclos/Avg Cycle', () => {
        const { container } = renderWithI18n(
            <RunnerLeaderboard runners={[{ runnerId: 'r1', name: 'Alice Smith', cyclesToday: 5, avgCycleSec: 120 }]} />,
        );
        expect(container.querySelector('table')).not.toBeNull();
        const headers = container.querySelectorAll('thead th');
        expect(headers).toHaveLength(3);
    });

    it('renderiza initials del nombre (2 primeras letras de 2 palabras)', () => {
        const { getByText } = renderWithI18n(
            <RunnerLeaderboard runners={[{ runnerId: 'r1', name: 'Alice Smith', cyclesToday: 5, avgCycleSec: 120 }]} />,
        );
        expect(getByText('AS')).toBeInTheDocument();
    });

    it('name de una palabra → initial de 1 letra', () => {
        const { getByText } = renderWithI18n(
            <RunnerLeaderboard runners={[{ runnerId: 'r1', name: 'Bob', cyclesToday: 3, avgCycleSec: 180 }]} />,
        );
        expect(getByText('B')).toBeInTheDocument();
    });

    it('cyclesToday rendered en columna emerald', () => {
        const { container } = renderWithI18n(
            <RunnerLeaderboard runners={[{ runnerId: 'r1', name: 'X', cyclesToday: 12, avgCycleSec: 90 }]} />,
        );
        const emeraldCell = container.querySelector('.text-emerald-600');
        expect(emeraldCell?.textContent).toBe('12');
    });

    it('avgCycleSec formateado mm:ss con padStart', () => {
        const { container } = renderWithI18n(
            <RunnerLeaderboard runners={[{ runnerId: 'r1', name: 'X', cyclesToday: 1, avgCycleSec: 65 }]} />,
        );
        expect(container.textContent).toContain('01:05');
    });

    it('ordena por cyclesToday desc', () => {
        const { container } = renderWithI18n(
            <RunnerLeaderboard
                runners={[
                    { runnerId: 'r1', name: 'Alice', cyclesToday: 5, avgCycleSec: 100 },
                    { runnerId: 'r2', name: 'Bob', cyclesToday: 10, avgCycleSec: 100 },
                    { runnerId: 'r3', name: 'Carol', cyclesToday: 2, avgCycleSec: 100 },
                ]}
            />,
        );
        const rows = container.querySelectorAll('tbody tr');
        expect(rows[0].textContent).toContain('Bob');
        expect(rows[1].textContent).toContain('Alice');
        expect(rows[2].textContent).toContain('Carol');
    });

    it('avatar bg class parte de una palette de 10 colores', () => {
        const { container } = renderWithI18n(
            <RunnerLeaderboard runners={[{ runnerId: 'r1', name: 'X', cyclesToday: 1, avgCycleSec: 0 }]} />,
        );
        const avatar = container.querySelector('.w-7.h-7.rounded-full');
        const cls = avatar?.className || '';
        const palette = ['blue', 'emerald', 'purple', 'rose', 'amber', 'cyan', 'indigo', 'fuchsia', 'teal', 'orange'];
        const match = palette.some((c) => cls.includes(`bg-${c}-500`));
        expect(match).toBe(true);
    });

    it('mismo nombre → mismo color (determinismo)', () => {
        const { container } = renderWithI18n(
            <RunnerLeaderboard
                runners={[
                    { runnerId: 'r1', name: 'SameName', cyclesToday: 1, avgCycleSec: 0 },
                    { runnerId: 'r2', name: 'SameName', cyclesToday: 1, avgCycleSec: 0 },
                ]}
            />,
        );
        const avatars = container.querySelectorAll('.w-7.h-7.rounded-full');
        expect(avatars[0].className).toBe(avatars[1].className);
    });
});
