/**
 * RunnersView — lista runners del team leader.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import RunnersView from './RunnersView';
import { useHarvestStore } from '@/stores/useHarvestStore';

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: vi.fn(),
}));

const setCrew = (crew: unknown[]) => {
    (useHarvestStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ crew });
};

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('RunnersView', () => {
    it('empty state cuando no hay runners', () => {
        setCrew([{ id: 'p1', name: 'Alice', role: 'picker' }]);
        const { getByText } = render(<RunnersView />);
        expect(getByText('No Runners Found')).toBeInTheDocument();
    });

    it('filtra role === "Runner" (case sensitive y case insensitive)', () => {
        setCrew([
            { id: 'p1', name: 'Alice', role: 'picker' },
            { id: 'r1', name: 'Bob', role: 'Runner', picker_id: 'R001', status: 'active' },
            { id: 'r2', name: 'Carol', role: 'runner', picker_id: 'R002', status: 'active' },
        ]);
        const { queryByText, getByText } = render(<RunnersView />);
        expect(queryByText('No Runners Found')).toBeNull();
        expect(getByText('Bob')).toBeInTheDocument();
        expect(getByText('Carol')).toBeInTheDocument();
    });

    it('count en header muestra N active runners', () => {
        setCrew([
            { id: 'r1', name: 'Bob', role: 'runner', picker_id: 'R001', status: 'active' },
            { id: 'r2', name: 'Carol', role: 'runner', picker_id: 'R002', status: 'active' },
            { id: 'r3', name: 'Dave', role: 'runner', picker_id: 'R003', status: 'offline' },
        ]);
        const { getByText } = render(<RunnersView />);
        expect(getByText('3 Active Runners')).toBeInTheDocument();
    });

    it('renderiza picker_id y role badge', () => {
        setCrew([
            { id: 'r1', name: 'Bob Smith', role: 'runner', picker_id: 'R042', status: 'active' },
        ]);
        const { getByText, getAllByText } = render(<RunnersView />);
        expect(getByText(/ID: R042/)).toBeInTheDocument();
        expect(getAllByText('Runner').length).toBeGreaterThan(0);
    });

    it('status badge green cuando active, slate cuando offline', () => {
        setCrew([
            { id: 'r1', name: 'X', role: 'runner', picker_id: 'R1', status: 'active' },
            { id: 'r2', name: 'Y', role: 'runner', picker_id: 'R2', status: 'offline' },
        ]);
        const { container } = render(<RunnersView />);
        expect(container.querySelector('.bg-green-100')).not.toBeNull();
        expect(container.querySelector('.bg-slate-100')).not.toBeNull();
    });

    it('avatar usa runner.avatar si presente', () => {
        setCrew([
            { id: 'r1', name: 'Custom', role: 'runner', picker_id: 'R1', status: 'active', avatar: 'XY' },
        ]);
        const { getByText } = render(<RunnersView />);
        expect(getByText('XY')).toBeInTheDocument();
    });

    it('fallback avatar a 2 letras del nombre si no avatar', () => {
        setCrew([
            { id: 'r1', name: 'Charlie', role: 'runner', picker_id: 'R1', status: 'active' },
        ]);
        const { getByText } = render(<RunnersView />);
        expect(getByText('CH')).toBeInTheDocument();
    });

    it('status undefined → OFFLINE', () => {
        setCrew([
            { id: 'r1', name: 'X', role: 'runner', picker_id: 'R1' },
        ]);
        const { getByText } = render(<RunnersView />);
        expect(getByText('OFFLINE')).toBeInTheDocument();
    });
});
