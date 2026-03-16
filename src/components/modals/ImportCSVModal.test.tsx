/**
 * ImportCSVModal — Deep render + interaction tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockParseCSV = vi.fn();
const mockGenerateCSVTemplate = vi.fn();
const mockAddPickersBulk = vi.fn();
const mockShowToast = vi.fn();

vi.mock('@/utils/csvParser', () => ({
    parseCSV: (...args: unknown[]) => mockParseCSV(...args),
    generateCSVTemplate: () => mockGenerateCSVTemplate(),
}));

vi.mock('@/services/picker.service', () => ({
    pickerService: {
        addPickersBulk: (...args: unknown[]) => mockAddPickersBulk(...args),
    },
}));

vi.mock('@/hooks/useToast', () => ({
    useToast: () => ({
        toast: null,
        showToast: (...args: unknown[]) => mockShowToast(...args),
        hideToast: vi.fn(),
    }),
}));

vi.mock('@/components/ui/ModalOverlay', () => ({
    default: ({ children, onClose }: any) => (
        <div data-testid="modal-overlay">
            {children}
            <button onClick={onClose} data-testid="modal-close">X</button>
        </div>
    ),
}));

import ImportCSVModal from './ImportCSVModal';

describe('ImportCSVModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        orchardId: 'o1',
        existingPickers: [{ picker_id: 'PK-001', name: 'Existing Alice' }],
        onImportComplete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGenerateCSVTemplate.mockReturnValue('Name,Email,Phone,PickerID\n');
    });

    it('returns null when isOpen is false', () => {
        const { container } = render(<ImportCSVModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders Import Pickers heading', () => {
        render(<ImportCSVModal {...defaultProps} />);
        expect(screen.getByText('Import Pickers')).toBeTruthy();
    });

    it('shows upload step initially', () => {
        render(<ImportCSVModal {...defaultProps} />);
        expect(screen.getByText('Upload a CSV file')).toBeTruthy();
    });

    it('shows drag & drop zone', () => {
        render(<ImportCSVModal {...defaultProps} />);
        expect(screen.getByText(/Drag & drop your CSV file here/)).toBeTruthy();
    });

    it('shows Download CSV Template button', () => {
        render(<ImportCSVModal {...defaultProps} />);
        expect(screen.getByText('Download CSV Template')).toBeTruthy();
    });

    it('shows expected columns', () => {
        render(<ImportCSVModal {...defaultProps} />);
        expect(screen.getByText('Name *')).toBeTruthy();
        expect(screen.getByText('Email')).toBeTruthy();
        expect(screen.getByText('Phone')).toBeTruthy();
        expect(screen.getByText('PickerID')).toBeTruthy();
    });

    it('shows Cancel button', () => {
        render(<ImportCSVModal {...defaultProps} />);
        expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('shows warning when non-CSV file is selected', async () => {
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['data'], 'test.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        expect(mockShowToast).toHaveBeenCalledWith('Please select a CSV file (.csv)', 'warning');
    });

    it('transitions to preview step after parsing CSV', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [{ name: 'Alice', picker_id: 'PK-NEW', email: 'alice@test.com' }],
            duplicates: [],
            errors: [],
        });
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name\nAlice'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => expect(screen.getByText('Ready to import')).toBeTruthy());
    });

    it('shows import button with count in preview', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [{ name: 'Alice', picker_id: 'PK-NEW', email: '' }],
            duplicates: [],
            errors: [],
        });
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name\nAlice'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => expect(screen.getByText(/Import 1 Pickers/)).toBeTruthy());
    });

    it('shows validation errors in preview', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [],
            duplicates: [],
            errors: [{ row: 2, message: 'Name is required' }],
        });
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name\n'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => expect(screen.getByText(/Validation Errors/)).toBeTruthy());
    });

    it('shows duplicate warnings in preview', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [],
            duplicates: [{ picker_id: 'PK-001', existingName: 'Existing Alice' }],
            errors: [],
        });
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name,PickerID\nAlice,PK-001'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => expect(screen.getByText(/Skipped Duplicates/)).toBeTruthy());
    });

    it('runs import and shows success', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [{ name: 'Alice', picker_id: 'PK-NEW', email: '' }],
            duplicates: [],
            errors: [],
        });
        mockAddPickersBulk.mockResolvedValue({ created: 1, skipped: 0, errors: [] });
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name\nAlice'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => screen.getByText(/Import 1 Pickers/));
        fireEvent.click(screen.getByText(/Import 1 Pickers/));
        await waitFor(() => expect(screen.getByText('Import Successful!')).toBeTruthy());
        expect(defaultProps.onImportComplete).toHaveBeenCalledWith(1);
    });

    it('shows import failure state', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [{ name: 'Alice', picker_id: 'PK-NEW', email: '' }],
            duplicates: [],
            errors: [],
        });
        mockAddPickersBulk.mockRejectedValue(new Error('Network error'));
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name\nAlice'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => screen.getByText(/Import 1 Pickers/));
        fireEvent.click(screen.getByText(/Import 1 Pickers/));
        await waitFor(() => expect(screen.getByText('Import Failed')).toBeTruthy());
    });

    it('calls onClose when Close button clicked on done step', async () => {
        mockParseCSV.mockResolvedValue({
            valid: [{ name: 'Alice', picker_id: 'PK-NEW', email: '' }],
            duplicates: [],
            errors: [],
        });
        mockAddPickersBulk.mockResolvedValue({ created: 1, skipped: 0, errors: [] });
        render(<ImportCSVModal {...defaultProps} />);
        const fileInput = screen.getByTitle('Select CSV file');
        const file = new File(['Name\nAlice'], 'test.csv', { type: 'text/csv' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await waitFor(() => screen.getByText(/Import 1 Pickers/));
        fireEvent.click(screen.getByText(/Import 1 Pickers/));
        await waitFor(() => screen.getByText('Close'));
        fireEvent.click(screen.getByText('Close'));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
