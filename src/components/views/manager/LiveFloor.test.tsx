/**
 * LiveFloor — Real-time scan activity feed tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveFloor from './LiveFloor';

const records = [
    { picker_id: 'p1', picker_name: 'Alice Picker', row_number: 5, created_at: new Date().toISOString() },
    { picker_id: 'p2', picker_name: 'Bob Picker', row_number: 8, created_at: new Date().toISOString() },
] as any[];

describe('LiveFloor', () => {
    it('renders Live Floor heading', () => {
        render(<LiveFloor bucketRecords={[]} />);
        expect(screen.getByText('Live Floor')).toBeTruthy();
    });

    it('shows empty state when no records', () => {
        render(<LiveFloor bucketRecords={[]} />);
        expect(screen.getByText('No scans recorded yet today.')).toBeTruthy();
    });

    it('renders picker names', () => {
        render(<LiveFloor bucketRecords={records} />);
        expect(screen.getByText('Alice Picker')).toBeTruthy();
        expect(screen.getByText('Bob Picker')).toBeTruthy();
    });

    it('renders row numbers', () => {
        render(<LiveFloor bucketRecords={records} />);
        expect(screen.getByText('Row 5')).toBeTruthy();
        expect(screen.getByText('Row 8')).toBeTruthy();
    });

    it('renders Bucket +1 badges', () => {
        render(<LiveFloor bucketRecords={records} />);
        const badges = screen.getAllByText('Bucket +1');
        expect(badges.length).toBe(2);
    });

    it('calls onUserSelect when record clicked', () => {
        const onUserSelect = vi.fn();
        render(<LiveFloor bucketRecords={records} onUserSelect={onUserSelect} />);
        fireEvent.click(screen.getByText('Alice Picker'));
        expect(onUserSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', name: 'Alice Picker' }));
    });
});
