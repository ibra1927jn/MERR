/**
 * RunnerActivityLog — empty state y started shift entry.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RunnerActivityLog from './RunnerActivityLog';

const baseRunner = {
    id: 'r1',
    name: 'Bob',
    binsCompleted: 0,
    currentRow: null,
} as never;

describe('RunnerActivityLog', () => {
    it('muestra empty state cuando binsCompleted === 0', () => {
        const { getByText } = render(<RunnerActivityLog runner={baseRunner} />);
        expect(getByText(/No activity recorded yet/i)).toBeInTheDocument();
    });

    it('muestra activity con "Started shift" cuando binsCompleted > 0', () => {
        const { getByText } = render(
            <RunnerActivityLog runner={{ ...baseRunner, binsCompleted: 5, currentRow: 3 } as never} />,
        );
        expect(getByText('Started shift')).toBeInTheDocument();
    });

    it('currentRow populado → "Assigned to Row N"', () => {
        const { getByText } = render(
            <RunnerActivityLog runner={{ ...baseRunner, binsCompleted: 5, currentRow: 7 } as never} />,
        );
        expect(getByText(/Assigned to Row 7/)).toBeInTheDocument();
    });

    it('currentRow null → "No row assigned"', () => {
        const { getByText } = render(
            <RunnerActivityLog runner={{ ...baseRunner, binsCompleted: 5, currentRow: null } as never} />,
        );
        expect(getByText(/No row assigned/)).toBeInTheDocument();
    });

    it('heading "Recent Activity" siempre presente', () => {
        const { getByText } = render(<RunnerActivityLog runner={baseRunner} />);
        expect(getByText(/Recent Activity/i)).toBeInTheDocument();
    });
});
