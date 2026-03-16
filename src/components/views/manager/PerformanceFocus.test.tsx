/**
 * PerformanceFocus — Top performers + Needs attention tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PerformanceFocus from './PerformanceFocus';

const crew = [
    { id: 'p1', name: 'Alice Top', role: 'picker' } as any,
    { id: 'p2', name: 'Bob Mid', role: 'picker' } as any,
    { id: 'p3', name: 'Carlos Low', role: 'picker' } as any,
    { id: 'r1', name: 'Dave Runner', role: 'runner' } as any,
];

const bucketRecords = [
    { picker_id: 'p1', picker_name: 'Alice Top' },
    { picker_id: 'p1', picker_name: 'Alice Top' },
    { picker_id: 'p1', picker_name: 'Alice Top' },
    { picker_id: 'p2', picker_name: 'Bob Mid' },
    { picker_id: 'p2', picker_name: 'Bob Mid' },
] as any[];

describe('PerformanceFocus', () => {
    const setActiveTab = vi.fn();

    it('renders top performers section', () => {
        render(<PerformanceFocus crew={crew} bucketRecords={bucketRecords} setActiveTab={setActiveTab} />);
        expect(screen.getAllByText(/Top/).length).toBeGreaterThan(0);
    });

    it('renders top performer names', () => {
        render(<PerformanceFocus crew={crew} bucketRecords={bucketRecords} setActiveTab={setActiveTab} />);
        expect(screen.getByText('Alice Top')).toBeTruthy();
    });

    it('renders needs attention section', () => {
        render(<PerformanceFocus crew={crew} bucketRecords={bucketRecords} setActiveTab={setActiveTab} />);
        expect(screen.getByText(/Below Average/)).toBeTruthy();
    });

    it('shows below-average pickers', () => {
        render(<PerformanceFocus crew={crew} bucketRecords={bucketRecords} setActiveTab={setActiveTab} />);
        expect(screen.getAllByText('Carlos Low').length).toBeGreaterThan(0);
    });

    it('renders View all in Teams link', () => {
        render(<PerformanceFocus crew={crew} bucketRecords={bucketRecords} setActiveTab={setActiveTab} />);
        expect(screen.getByText('View all in Teams →')).toBeTruthy();
    });

    it('navigates to teams when link clicked', () => {
        render(<PerformanceFocus crew={crew} bucketRecords={bucketRecords} setActiveTab={setActiveTab} />);
        fireEvent.click(screen.getByText('View all in Teams →'));
        expect(setActiveTab).toHaveBeenCalledWith('teams');
    });

    it('returns null when no data', () => {
        const { container } = render(<PerformanceFocus crew={[]} bucketRecords={[]} setActiveTab={setActiveTab} />);
        expect(container.innerHTML).toBe('');
    });
});
