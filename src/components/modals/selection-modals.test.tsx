/**
 * Tests for selection modal components: RunnerSelectionModal, TeamDetailsModal
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── RunnerSelectionModal ────────────────────────────
import RunnerSelectionModal from './RunnerSelectionModal';

const mockRunners = [
    { id: 'r1', full_name: 'Alice Runner', email: 'alice@test.com', role: 'runner' } as any,
    { id: 'r2', full_name: 'Bob Runner', email: 'bob@test.com', role: 'runner' } as any,
    { id: 'r3', full_name: 'Charlie Runner', email: 'charlie@test.com', role: 'runner' } as any,
];

describe('RunnerSelectionModal', () => {
    it('renders dialog with title', () => {
        render(
            <RunnerSelectionModal
                availableRunners={mockRunners}
                selectedRunnerIds={[]}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />,
        );
        expect(screen.getByText('Select Active Runners')).toBeTruthy();
    });

    it('renders all available runners', () => {
        render(
            <RunnerSelectionModal
                availableRunners={mockRunners}
                selectedRunnerIds={[]}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />,
        );
        expect(screen.getByText('Alice Runner')).toBeTruthy();
        expect(screen.getByText('Bob Runner')).toBeTruthy();
        expect(screen.getByText('Charlie Runner')).toBeTruthy();
    });

    it('pre-selects runners from selectedRunnerIds', () => {
        render(
            <RunnerSelectionModal
                availableRunners={mockRunners}
                selectedRunnerIds={['r1']}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />,
        );
        expect(screen.getByText('Confirm Selection (1)')).toBeTruthy();
    });

    it('toggles runner selection on click', () => {
        render(
            <RunnerSelectionModal
                availableRunners={mockRunners}
                selectedRunnerIds={[]}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByText('Alice Runner'));
        expect(screen.getByText('Confirm Selection (1)')).toBeTruthy();
        fireEvent.click(screen.getByText('Bob Runner'));
        expect(screen.getByText('Confirm Selection (2)')).toBeTruthy();
    });

    it('calls onSave and onClose on confirm', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();
        render(
            <RunnerSelectionModal
                availableRunners={mockRunners}
                selectedRunnerIds={['r1', 'r2']}
                onClose={onClose}
                onSave={onSave}
            />,
        );
        fireEvent.click(screen.getByText('Confirm Selection (2)'));
        expect(onSave).toHaveBeenCalledWith(['r1', 'r2']);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows empty state when no runners', () => {
        render(
            <RunnerSelectionModal
                availableRunners={[]}
                selectedRunnerIds={[]}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />,
        );
        expect(screen.getByText('No runners found.')).toBeTruthy();
    });
});

// ── TeamDetailsModal ────────────────────────────────
import TeamDetailsModal from './TeamDetailsModal';

const mockLeader = {
    id: 'tl1',
    full_name: 'Maria Leader',
    role: 'team_leader',
    email: 'maria@test.com',
} as any;

const mockTeamMembers = [
    {
        id: 'p1', name: 'Picker Juan', avatar: 'JU', picker_id: 'PK001',
        total_buckets_today: 25, hours: 4, current_row: 5, status: 'active',
        team_leader_id: 'tl1', role: 'picker',
    },
    {
        id: 'p2', name: 'Picker Ana', avatar: 'AN', picker_id: 'PK002',
        total_buckets_today: 30, hours: 4, current_row: 7, status: 'active',
        team_leader_id: 'tl1', role: 'picker',
    },
] as any[];

describe('TeamDetailsModal', () => {
    it('renders leader name in title', () => {
        render(<TeamDetailsModal leader={mockLeader} teamMembers={mockTeamMembers} onClose={vi.fn()} />);
        expect(screen.getByText("Maria Leader's Team")).toBeTruthy();
    });

    it('shows member count and total buckets', () => {
        render(<TeamDetailsModal leader={mockLeader} teamMembers={mockTeamMembers} onClose={vi.fn()} />);
        expect(screen.getByText('2 Members')).toBeTruthy();
        expect(screen.getByText('55 Total Buckets')).toBeTruthy();
    });

    it('renders all team members', () => {
        render(<TeamDetailsModal leader={mockLeader} teamMembers={mockTeamMembers} onClose={vi.fn()} />);
        expect(screen.getByText('Picker Juan')).toBeTruthy();
        expect(screen.getByText('Picker Ana')).toBeTruthy();
    });

    it('shows bucket counts', () => {
        render(<TeamDetailsModal leader={mockLeader} teamMembers={mockTeamMembers} onClose={vi.fn()} />);
        expect(screen.getByText('25')).toBeTruthy();
        expect(screen.getByText('30')).toBeTruthy();
    });

    it('shows empty state when no members', () => {
        render(<TeamDetailsModal leader={mockLeader} teamMembers={[]} onClose={vi.fn()} />);
        expect(screen.getByText('No pickers assigned to this team.')).toBeTruthy();
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<TeamDetailsModal leader={mockLeader} teamMembers={mockTeamMembers} onClose={onClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});
