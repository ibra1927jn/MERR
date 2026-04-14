/**
 * RowAssignmentModal — Row assignment orchestrator tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

const mockAssignRows = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: (selectorOrUndefined?: any) => {
        const state = {
            assignRows: mockAssignRows,
            crew: [
                { id: 'tl1', name: 'Carlos TL', role: 'team_leader' },
                { id: 'p1', name: 'Ana Picker', role: 'picker', team_leader_id: 'tl1' },
                { id: 'p2', name: 'Luis Picker', role: 'picker', team_leader_id: 'tl1' },
            ],
            orchard: { id: 'o1', name: 'Hawke Bay' },
            rowAssignments: [],
            orchardBlocks: [
                { id: 'b1', name: 'Block A', totalRows: 10, startRow: 1, status: 'active', rowVarieties: {} },
            ],
            selectedBlockId: 'b1',
            selectedVariety: 'ALL',
        };
        if (typeof selectorOrUndefined === 'function') return selectorOrUndefined(state);
        return state;
    },
}));

import RowAssignmentModal from './RowAssignmentModal';

describe('RowAssignmentModal', () => {
    const onClose = vi.fn();
    beforeEach(() => vi.clearAllMocks());

    it('renders Row heading with initial row', () => {
        render(<RowAssignmentModal onClose={onClose} initialRow={5} />);
        expect(screen.getByText('Row 5')).toBeTruthy();
    });

    it('renders block info in subtitle', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        expect(screen.getByText(/rows assigned/)).toBeTruthy();
    });

    it('renders team leader select', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        expect(screen.getByLabelText('Assign team leader to row')).toBeTruthy();
    });

    it('renders team leader option', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        expect(screen.getByText(/Carlos TL/)).toBeTruthy();
    });

    it('renders side toggle buttons', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        expect(screen.getByText('North')).toBeTruthy();
        expect(screen.getByText('South')).toBeTruthy();
    });

    it('renders confirm button', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        expect(screen.getByText('Confirm Assignment')).toBeTruthy();
    });

    it('confirm button is disabled without leader', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        const btn = screen.getByText('Confirm Assignment').closest('button')!;
        expect(btn.disabled).toBe(true);
    });

    it('calls onClose when backdrop clicked', () => {
        const { container } = render(<RowAssignmentModal onClose={onClose} />);
        const backdrop = container.firstChild as HTMLElement;
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button clicked', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        fireEvent.click(screen.getByText('close'));
        expect(onClose).toHaveBeenCalled();
    });

    it('shows rows assigned count', () => {
        render(<RowAssignmentModal onClose={onClose} />);
        expect(screen.getByText(/rows assigned/)).toBeTruthy();
    });
});
