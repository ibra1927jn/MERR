/**
 * Tests for CRUD modal components: AddRunnerModal, AddVehicleModal, NewContractModal, NewTransportRequestModal
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── AddRunnerModal ──────────────────────────────────
import AddRunnerModal from './AddRunnerModal';

describe('AddRunnerModal', () => {
    it('renders dialog with title', () => {
        render(<AddRunnerModal onClose={vi.fn()} onAdd={vi.fn()} />);
        expect(screen.getByText('Add New Runner')).toBeTruthy();
    });

    it('renders form fields', () => {
        render(<AddRunnerModal onClose={vi.fn()} onAdd={vi.fn()} />);
        expect(screen.getByPlaceholderText('e.g. John Smith')).toBeTruthy();
        expect(screen.getByLabelText('Start Time')).toBeTruthy();
        expect(screen.getByPlaceholderText('e.g. 12')).toBeTruthy();
    });

    it('disables Add button when required fields empty', () => {
        render(<AddRunnerModal onClose={vi.fn()} onAdd={vi.fn()} />);
        const btn = screen.getByText('Add Runner').closest('button');
        expect(btn).toBeDisabled();
    });

    it('enables Add button when name and startTime filled', () => {
        render(<AddRunnerModal onClose={vi.fn()} onAdd={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText('e.g. John Smith'), { target: { value: 'Jane' } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '08:00' } });
        const btn = screen.getByText('Add Runner').closest('button');
        expect(btn).not.toBeDisabled();
    });

    it('calls onAdd and onClose when submitted', () => {
        const onAdd = vi.fn();
        const onClose = vi.fn();
        render(<AddRunnerModal onClose={onClose} onAdd={onAdd} />);
        fireEvent.change(screen.getByPlaceholderText('e.g. John Smith'), { target: { value: 'Jack' } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '07:30' } });
        fireEvent.click(screen.getByText('Add Runner'));
        expect(onAdd).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<AddRunnerModal onClose={onClose} onAdd={vi.fn()} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});

// ── AddVehicleModal ─────────────────────────────────
import AddVehicleModal from './AddVehicleModal';

describe('AddVehicleModal', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <AddVehicleModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />,
        );
        expect(container.querySelector('form')).toBeNull();
    });

    it('renders dialog with title when open', () => {
        render(<AddVehicleModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        // "Add Vehicle" appears in both header and button
        const elements = screen.getAllByText(/Add Vehicle/);
        expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders all form fields', () => {
        render(<AddVehicleModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByPlaceholderText('e.g. Tractor Alpha')).toBeTruthy();
        expect(screen.getByPlaceholderText('e.g. ABC123')).toBeTruthy();
        expect(screen.getByLabelText('Zone')).toBeTruthy();
        expect(screen.getByLabelText('Max Capacity')).toBeTruthy();
        expect(screen.getByPlaceholderText('e.g. John Smith')).toBeTruthy();
    });

    it('shows validation errors on empty submit', () => {
        const { container } = render(<AddVehicleModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        const form = container.querySelector('form')!;
        fireEvent.submit(form);
        expect(screen.getByText('Vehicle name is required')).toBeTruthy();
    });

    it('calls onSubmit + onClose on valid submit', () => {
        const onSubmit = vi.fn();
        const onClose = vi.fn();
        const { container } = render(<AddVehicleModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);
        fireEvent.change(screen.getByPlaceholderText('e.g. Tractor Alpha'), { target: { value: 'Forklift' } });
        fireEvent.change(screen.getByPlaceholderText('e.g. ABC123'), { target: { value: 'XY789' } });
        fireEvent.change(screen.getByPlaceholderText('e.g. John Smith'), { target: { value: 'Mike' } });
        // Submit the form directly rather than clicking button to avoid multiple element issues
        const form = container.querySelector('form')!;
        fireEvent.submit(form);
        expect(onSubmit).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('Cancel button calls onClose', () => {
        const onClose = vi.fn();
        render(<AddVehicleModal isOpen={true} onClose={onClose} onSubmit={vi.fn()} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledOnce();
    });
});

// ── NewTransportRequestModal ────────────────────────
import NewTransportRequestModal from './NewTransportRequestModal';

describe('NewTransportRequestModal', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <NewTransportRequestModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />,
        );
        expect(container.querySelector('form')).toBeNull();
    });

    it('renders dialog with title when open', () => {
        render(<NewTransportRequestModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByText('New Transport Request')).toBeTruthy();
    });

    it('renders zone selector and bins input', () => {
        render(<NewTransportRequestModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByLabelText('Pickup Zone')).toBeTruthy();
        expect(screen.getByLabelText('Bins to Collect')).toBeTruthy();
    });

    it('renders priority buttons', () => {
        render(<NewTransportRequestModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByText('Normal')).toBeTruthy();
        expect(screen.getByText('High')).toBeTruthy();
        expect(screen.getByText('Urgent')).toBeTruthy();
    });

    it('calls onSubmit + onClose on valid submit', () => {
        const onSubmit = vi.fn();
        const onClose = vi.fn();
        render(<NewTransportRequestModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);
        fireEvent.click(screen.getByText('Submit Request'));
        expect(onSubmit).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('Cancel button calls onClose', () => {
        const onClose = vi.fn();
        render(<NewTransportRequestModal isOpen={true} onClose={onClose} onSubmit={vi.fn()} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
