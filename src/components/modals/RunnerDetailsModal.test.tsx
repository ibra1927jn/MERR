/**
 * RunnerDetailsModal — Deep render + interaction tests
 * The component has tab navigation (Info/Schedule/History) and embeds
 * RunnerStatusPanel + RunnerActivityLog sub-components.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/runner/RunnerStatusPanel', () => ({
    default: ({ runner, onStatusChange }: any) => (
        <div data-testid="status-panel">
            <span>{runner.status}</span>
            <button onClick={() => onStatusChange('Break')}>Set Break</button>
        </div>
    ),
}));

vi.mock('@/components/runner/RunnerActivityLog', () => ({
    default: ({ runner }: any) => (
        <div data-testid="activity-log">{runner.name} Activity</div>
    ),
}));

vi.mock('@/components/ui/ModalOverlay', () => ({
    default: ({ children, onClose }: any) => (
        <div data-testid="modal-overlay">
            {children}
            <button onClick={onClose} data-testid="overlay-close">X</button>
        </div>
    ),
}));

import RunnerDetailsModal from './RunnerDetailsModal';

const makeRunner = () => ({
    id: 'runner1',
    name: 'Jane Runner',
    avatar: 'JR',
    status: 'Active' as const,
    startTime: '2026-03-10T07:00:00',
    breakTime: '15 min',
    currentRow: 5,
    bucketsHandled: 42,
    binsCompleted: 8,
});

describe('RunnerDetailsModal', () => {
    const runner = makeRunner();
    const defaultProps = {
        runner,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders runner name', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        expect(screen.getByText('Jane Runner')).toBeTruthy();
    });

    it('renders runner avatar initials', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        expect(screen.getByText('JR')).toBeTruthy();
    });

    it('shows "Bucket Runner" subtitle', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        expect(screen.getByText('Bucket Runner')).toBeTruthy();
    });

    it('renders status panel', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        expect(screen.getByTestId('status-panel')).toBeTruthy();
    });

    it('shows runner status', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders tab navigation buttons', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        expect(screen.getByText('Info')).toBeTruthy();
        expect(screen.getByText('Schedule')).toBeTruthy();
        expect(screen.getByText('History')).toBeTruthy();
    });

    it('calls onClose when overlay close is clicked', () => {
        render(<RunnerDetailsModal {...defaultProps} />);
        fireEvent.click(screen.getByTestId('overlay-close'));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

});
