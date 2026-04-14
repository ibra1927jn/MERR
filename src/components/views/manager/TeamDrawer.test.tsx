import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TeamDrawer from './TeamDrawer';

const mockTeamData = {
    name: 'James Wilson',
    ranking: { name: 'James Wilson', buckets: 42, hours: 8.5, earnings: 273, count: 3, bpa: 4.9 },
    members: [
        { id: 'p1', name: 'Rawiri Henare', role: 'picker', status: 'active' as const, total_buckets_today: 18 },
        { id: 'p2', name: 'Ana Tuilagi', role: 'picker', status: 'active' as const, total_buckets_today: 12 },
        { id: 'tl1', name: 'James Wilson', role: 'team_leader', status: 'active' as const, total_buckets_today: 0 },
    ],
};

beforeEach(() => cleanup());

describe('TeamDrawer', () => {
    it('renders null when teamData is null', () => {
        const { container } = render(<TeamDrawer teamData={null} onClose={vi.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders team name in header', () => {
        render(<TeamDrawer teamData={mockTeamData} onClose={vi.fn()} />);
        expect(screen.getByText('James Wilson')).toBeInTheDocument();
    });

    it('shows Today tab by default with stats', () => {
        render(<TeamDrawer teamData={mockTeamData} onClose={vi.fn()} />);
        expect(screen.getByText('42')).toBeInTheDocument(); // buckets
    });

    it('switches to Members tab and shows member names', () => {
        render(<TeamDrawer teamData={mockTeamData} onClose={vi.fn()} />);
        const membersTab = screen.getByRole('button', { name: /members/i });
        fireEvent.click(membersTab);
        expect(screen.getByText('Rawiri Henare')).toBeInTheDocument();
        expect(screen.getByText('Ana Tuilagi')).toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn();
        render(<TeamDrawer teamData={mockTeamData} onClose={onClose} />);
        const backdrop = document.querySelector('.fixed.inset-0');
        fireEvent.click(backdrop!);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<TeamDrawer teamData={mockTeamData} onClose={onClose} />);
        fireEvent.click(screen.getByLabelText('Close team drawer'));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows empty state when members array is empty', () => {
        const emptyTeam = { ...mockTeamData, members: [] };
        render(<TeamDrawer teamData={emptyTeam} onClose={vi.fn()} />);
        const membersTab = screen.getByRole('button', { name: /members/i });
        fireEvent.click(membersTab);
        expect(screen.getByText(/no members/i)).toBeInTheDocument();
    });
});
