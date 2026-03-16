/**
 * RowGrid — Interactive row selection grid tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RowGrid from './RowGrid';

describe('RowGrid', () => {
    const onToggleRow = vi.fn();
    const defaultProps = {
        blockRows: [1, 2, 3, 4, 5],
        selectedRows: [2, 4],
        teamsPerRow: { 3: [{ total: 4 }] } as any,
        selectedVariety: 'ALL',
        selectedBlock: null,
        blockName: 'Block A',
        onToggleRow,
    };

    it('renders block name label', () => {
        render(<RowGrid {...defaultProps} />);
        expect(screen.getByText('Block A Rows')).toBeTruthy();
    });

    it('renders selected row count', () => {
        render(<RowGrid {...defaultProps} />);
        expect(screen.getByText('2 selected')).toBeTruthy();
    });

    it('renders all row numbers', () => {
        render(<RowGrid {...defaultProps} />);
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
    });

    it('calls onToggleRow when row clicked', () => {
        render(<RowGrid {...defaultProps} />);
        fireEvent.click(screen.getByText('1'));
        expect(onToggleRow).toHaveBeenCalledWith(1);
    });

    it('disables variety-blocked rows', () => {
        const props = {
            ...defaultProps,
            selectedVariety: 'Gala',
            selectedBlock: { rowVarieties: { 1: 'Gala', 2: 'Fuji', 3: 'Gala' } },
        };
        render(<RowGrid {...props} />);
        const row2 = screen.getByText('2').closest('button')!;
        expect(row2.disabled).toBe(true);
    });
});
