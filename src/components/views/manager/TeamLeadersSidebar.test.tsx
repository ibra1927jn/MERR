/**
 * TeamLeadersSidebar — Quick access team leader list tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import TeamLeadersSidebar from './TeamLeadersSidebar';

const teamLeaders = [
    { id: 'tl1', name: 'Carlos TL' } as any,
    { id: 'tl2', name: 'Maria TL' } as any,
];

const crew = [
    { id: 'p1', team_leader_id: 'tl1', role: 'picker' } as any,
    { id: 'p2', team_leader_id: 'tl1', role: 'picker' } as any,
    { id: 'p3', team_leader_id: 'tl2', role: 'picker' } as any,
];

describe('TeamLeadersSidebar', () => {
    const setActiveTab = vi.fn();

    it('renders Team Leaders heading', () => {
        render(<TeamLeadersSidebar teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} />);
        expect(screen.getByText('Team Leaders')).toBeTruthy();
    });

    it('renders leader names', () => {
        render(<TeamLeadersSidebar teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} />);
        expect(screen.getByText('Carlos TL')).toBeTruthy();
        expect(screen.getByText('Maria TL')).toBeTruthy();
    });

    it('renders team sizes', () => {
        render(<TeamLeadersSidebar teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} />);
        expect(screen.getByText('2 pickers')).toBeTruthy();
        expect(screen.getByText('1 pickers')).toBeTruthy();
    });

    it('renders Manage Teams button', () => {
        render(<TeamLeadersSidebar teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} />);
        expect(screen.getByText('Manage Teams')).toBeTruthy();
    });

    it('calls setActiveTab when Manage Teams clicked', () => {
        render(<TeamLeadersSidebar teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} />);
        fireEvent.click(screen.getByText('Manage Teams'));
        expect(setActiveTab).toHaveBeenCalledWith('teams');
    });

    it('shows empty message when no TLs', () => {
        render(<TeamLeadersSidebar teamLeaders={[]} crew={crew} setActiveTab={setActiveTab} />);
        expect(screen.getByText('No Team Leaders assigned.')).toBeTruthy();
    });

    it('calls onUserSelect when leader clicked', () => {
        const onUserSelect = vi.fn();
        render(<TeamLeadersSidebar teamLeaders={teamLeaders} crew={crew} setActiveTab={setActiveTab} onUserSelect={onUserSelect} />);
        fireEvent.click(screen.getByText('Carlos TL'));
        expect(onUserSelect).toHaveBeenCalledWith(teamLeaders[0]);
    });
});
