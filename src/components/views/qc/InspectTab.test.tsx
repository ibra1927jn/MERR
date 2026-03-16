/**
 * InspectTab — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./DistributionBar', () => ({
    default: ({ distribution }: any) => (
        <div data-testid="distribution-bar">Total: {distribution.total}</div>
    ),
}));

vi.mock('@/hooks/usePhotoCapture', () => ({
    usePhotoCapture: () => ({
        photoBlob: null,
        capturePhoto: vi.fn(),
        resetPhoto: vi.fn(),
        isCapturing: false,
    }),
}));

import InspectTab from './InspectTab';

const makePicker = (id: string, name: string) => ({
    id, name, picker_id: `PK-${id}`,
    status: 'active' as const,
    current_row: 1,
    total_buckets_today: 10,
    hours: 4,
    team_leader_id: null,
    orchard_id: 'o1',
    avatar: name.substring(0, 2).toUpperCase(),
}) as any;

describe('InspectTab', () => {
    const crew = [
        makePicker('p1', 'Alice'),
        makePicker('p2', 'Bob'),
        makePicker('p3', 'Charlie'),
    ];

    const distribution = { A: 10, B: 5, C: 2, reject: 1, total: 18 };

    const defaultProps = {
        crew,
        distribution,
        selectedPicker: null as any,
        setSelectedPicker: vi.fn(),
        notes: '',
        setNotes: vi.fn(),
        isSubmitting: false,
        lastGrade: null as any,
        onGrade: vi.fn(),
        onAutoAdvance: vi.fn(),
    };

    it('renders grade buttons', () => {
        render(<InspectTab {...defaultProps} />);
        expect(screen.getByText('Grade A')).toBeTruthy();
        expect(screen.getByText('Grade B')).toBeTruthy();
        expect(screen.getByText('Grade C')).toBeTruthy();
    });

    it('renders Reject grade option', () => {
        render(<InspectTab {...defaultProps} />);
        expect(screen.getByText('Reject')).toBeTruthy();
    });

    it('renders distribution bar', () => {
        render(<InspectTab {...defaultProps} />);
        expect(screen.getByTestId('distribution-bar')).toBeTruthy();
    });

    it('shows distribution total', () => {
        render(<InspectTab {...defaultProps} />);
        expect(screen.getByText('Total: 18')).toBeTruthy();
    });

    it('calls onGrade when grade button is clicked with selected picker', () => {
        render(<InspectTab {...defaultProps} selectedPicker={crew[0]} />);
        fireEvent.click(screen.getByText('Grade A'));
        expect(defaultProps.onGrade).toHaveBeenCalled();
    });

    it('disables grades when submitting', () => {
        render(<InspectTab {...defaultProps} isSubmitting={true} selectedPicker={crew[0]} />);
        const gradeA = screen.getByText('Grade A').closest('button');
        expect(gradeA?.hasAttribute('disabled')).toBe(true);
    });
});
