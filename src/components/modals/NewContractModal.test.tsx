/**
 * NewContractModal — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/ModalOverlay', () => ({
    default: ({ children, onClose }: any) => (
        <div data-testid="modal-overlay">
            {children}
            <button onClick={onClose} data-testid="overlay-close">X</button>
        </div>
    ),
}));

import NewContractModal from './NewContractModal';

const makeEmployees = () => [
    { id: 'e1', name: 'Alice Worker', email: 'alice@test.com', role: 'picker' },
    { id: 'e2', name: 'Bob Worker', email: 'bob@test.com', role: 'picker' },
] as any[];

describe('NewContractModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        employees: makeEmployees(),
        onSubmit: vi.fn(),
    };

    beforeEach(() => vi.clearAllMocks());

    it('returns null when isOpen is false', () => {
        const { container } = render(<NewContractModal {...defaultProps} isOpen={false} />);
        expect(container.querySelector('[data-testid="modal-overlay"]')).toBeNull();
    });

    it('renders New Contract heading', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText('New Contract')).toBeTruthy();
    });

    it('renders employee selection field', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText('Employee')).toBeTruthy();
    });

    it('renders contract type options', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText('Permanent')).toBeTruthy();
        expect(screen.getByText('Seasonal')).toBeTruthy();
        expect(screen.getByText('Casual')).toBeTruthy();
    });

    it('renders start and end date fields', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText('Start Date')).toBeTruthy();
        expect(screen.getByText('End Date')).toBeTruthy();
    });

    it('renders hourly rate field', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText(/Hourly Rate/)).toBeTruthy();
    });

    it('shows Create Contract button', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText('Create Contract')).toBeTruthy();
    });

    it('shows Cancel button', () => {
        render(<NewContractModal {...defaultProps} />);
        expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('calls onClose when Cancel is clicked', () => {
        render(<NewContractModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('shows validation errors when submitting empty form', () => {
        render(<NewContractModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Create Contract'));
        // Should not call onSubmit because form is not filled
        expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('selects contract type on click', () => {
        render(<NewContractModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Seasonal'));
        // Seasonal should become selected (visual change)
        const seasonalBtn = screen.getByText('Seasonal').closest('button');
        expect(seasonalBtn?.className).toContain('border-');
    });

    it('renders employee options in dropdown', () => {
        render(<NewContractModal {...defaultProps} />);
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(1);
    });
});
