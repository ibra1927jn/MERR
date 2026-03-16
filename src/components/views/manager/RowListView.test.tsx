/**
 * RowListView — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RowListView from './RowListView';

const makeRunner = (id: string, name: string, row: number, buckets: number) => ({
    id, name, role: 'runner',
    picker_id: `RN-${id}`,
    status: 'active' as const,
    current_row: row,
    total_buckets_today: buckets,
    hours: 4,
    team_leader_id: null,
    orchard_id: 'o1',
}) as any;

describe('RowListView', () => {
    const runners = [
        makeRunner('r1', 'Runner A', 1, 30),
        makeRunner('r2', 'Runner B', 3, 50),
        makeRunner('r3', 'Runner C', 1, 20), // same row as r1
    ];

    const defaultProps = {
        runners,
        setActiveTab: vi.fn(),
        blockName: 'Block Alpha',
        totalRows: 5,
        variety: 'Gala',
        targetYield: 500,
    };

    it('renders block name and variety', () => {
        render(<RowListView {...defaultProps} />);
        expect(screen.getByText('Block Alpha')).toBeTruthy();
        expect(screen.getByText('Gala')).toBeTruthy();
    });

    it('renders the correct number of rows', () => {
        render(<RowListView {...defaultProps} />);
        expect(screen.getByText('R01')).toBeTruthy();
        expect(screen.getByText('R02')).toBeTruthy();
        expect(screen.getByText('R03')).toBeTruthy();
        expect(screen.getByText('R04')).toBeTruthy();
        expect(screen.getByText('R05')).toBeTruthy();
    });

    it('shows Row Count in header', () => {
        render(<RowListView {...defaultProps} />);
        expect(screen.getByText('5')).toBeTruthy();
    });

    it('shows active status for rows with runners', () => {
        render(<RowListView {...defaultProps} />);
        const activeLabels = screen.getAllByText('Active');
        expect(activeLabels.length).toBe(2); // Row 1 and Row 3 have runners
    });

    it('shows idle status for rows without runners', () => {
        render(<RowListView {...defaultProps} />);
        const idleLabels = screen.getAllByText('Idle');
        expect(idleLabels.length).toBe(3); // Rows 2, 4, 5
    });

    it('shows LIVE indicator', () => {
        render(<RowListView {...defaultProps} />);
        expect(screen.getByText('LIVE')).toBeTruthy();
    });

    it('shows total yield against target', () => {
        render(<RowListView {...defaultProps} />);
        // Total: row1=30+20=50, row3=50 → total=100
        expect(screen.getByText(/100 \/ 500 BUCKETS/)).toBeTruthy();
    });

    it('shows pickers online count', () => {
        render(<RowListView {...defaultProps} />);
        expect(screen.getByText('Pickers Online')).toBeTruthy();
    });

    it('aggregates buckets for runners on the same row', () => {
        render(<RowListView {...defaultProps} />);
        // Row 1 has runner r1 (30) + r3 (20) = 50
        const all50 = screen.getAllByText('50');
        expect(all50.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onRowClick when a row is clicked', () => {
        const onRowClick = vi.fn();
        render(<RowListView {...defaultProps} onRowClick={onRowClick} />);
        fireEvent.click(screen.getByText('R03'));
        expect(onRowClick).toHaveBeenCalledWith(3);
    });

    it('uses default props when not provided', () => {
        render(<RowListView runners={[]} setActiveTab={vi.fn()} />);
        expect(screen.getByText('Unknown Block')).toBeTruthy();
        expect(screen.getByText('Mix')).toBeTruthy();
    });

    it('shows ETA --:-- for idle rows', () => {
        render(<RowListView {...defaultProps} />);
        const dashes = screen.getAllByText('--:--');
        expect(dashes.length).toBeGreaterThanOrEqual(3); // idle rows
    });

    it('handles totalRows=0 safely (defaults to 1)', () => {
        render(<RowListView {...defaultProps} totalRows={0} />);
        expect(screen.getByText('R01')).toBeTruthy();
    });

    it('renders column headers', () => {
        render(<RowListView {...defaultProps} />);
        expect(screen.getByText('ID')).toBeTruthy();
        expect(screen.getByText('Status')).toBeTruthy();
        expect(screen.getByText('Harvest Progress')).toBeTruthy();
        expect(screen.getByText('Units')).toBeTruthy();
        expect(screen.getByText('ETA')).toBeTruthy();
    });
});
