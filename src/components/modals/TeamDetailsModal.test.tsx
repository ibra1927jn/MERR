/**
 * TeamDetailsModal — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/ModalOverlay', () => ({
    default: ({ children, onClose }: any) => (
        <div data-testid="modal-overlay">
            {children}
            <button onClick={onClose} data-testid="overlay-close">X</button>
        </div>
    ),
}));

import TeamDetailsModal from './TeamDetailsModal';

const makeLeader = (name = 'John Leader') => ({
    id: 'leader1',
    full_name: name,
    email: 'john@test.com',
    role: 'team_leader',
}) as any;

const makePicker = (id: string, name: string, buckets: number, hours = 4, row = 1) => ({
    id,
    name,
    picker_id: `PK-${id}`,
    avatar: name.substring(0, 2).toUpperCase(),
    status: 'active' as const,
    current_row: row,
    total_buckets_today: buckets,
    hours,
    team_leader_id: 'leader1',
    orchard_id: 'o1',
}) as any;

describe('TeamDetailsModal', () => {
    const leader = makeLeader();
    const teamMembers = [
        makePicker('p1', 'Alice Smith', 15, 4, 3),
        makePicker('p2', 'Bob Jones', 8, 5, 1),
        makePicker('p3', 'Charlie Brown', 0, 0, 0),
    ];

    const defaultProps = {
        leader,
        teamMembers,
        onClose: vi.fn(),
    };

    it('renders team leader name in heading', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText("John Leader's Team")).toBeTruthy();
    });

    it('shows team member count', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('3 Members')).toBeTruthy();
    });

    it('shows total team buckets', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        // 15 + 8 + 0 = 23
        expect(screen.getByText('23 Total Buckets')).toBeTruthy();
    });

    it('shows leader initials avatar', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('JO')).toBeTruthy();
    });

    it('renders column headers', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('Picker')).toBeTruthy();
        expect(screen.getByText('Buckets')).toBeTruthy();
        expect(screen.getByText('Performance')).toBeTruthy();
    });

    it('renders picker names', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('Alice Smith')).toBeTruthy();
        expect(screen.getByText('Bob Jones')).toBeTruthy();
        expect(screen.getByText('Charlie Brown')).toBeTruthy();
    });

    it('renders picker IDs', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('PK-p1')).toBeTruthy();
        expect(screen.getByText('PK-p2')).toBeTruthy();
    });

    it('shows bucket counts for each picker', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('15')).toBeTruthy();
        expect(screen.getByText('8')).toBeTruthy();
    });

    it('shows row assignments', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        expect(screen.getByText('R3')).toBeTruthy();
        expect(screen.getByText('R1')).toBeTruthy();
        expect(screen.getByText('--')).toBeTruthy(); // Charlie has no row
    });

    it('renders hourly rate per picker', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        // Rate is shown as "$X.XX/hr" — verify the /hr suffix exists
        const rateTexts = screen.getAllByText(/\/hr/);
        expect(rateTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('shows empty state when no team members', () => {
        render(<TeamDetailsModal {...defaultProps} teamMembers={[]} />);
        expect(screen.getByText('No pickers assigned to this team.')).toBeTruthy();
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<TeamDetailsModal {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText('close'));
        expect(onClose).toHaveBeenCalled();
    });

    it('shows hours worked per picker', () => {
        render(<TeamDetailsModal {...defaultProps} />);
        // Hours are displayed as "X.Xh" format
        const hoursText = screen.getAllByText(/h$/);
        expect(hoursText.length).toBeGreaterThanOrEqual(2);
    });
});
