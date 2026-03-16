/**
 * BlockCard — Deep render tests  
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/utils/orchardMapUtils', () => ({
    getBlockStatusColor: () => '#f0f9ff',
    getBlockStatusBorder: () => '#bae6fd',
    getBlockTextColor: () => '#0c4a6e',
    getStatusLabel: (status: string) => ({
        label: status === 'active' ? 'Active' : status === 'complete' ? 'Complete' : 'Idle',
        icon: status === 'active' ? 'pending' : status === 'complete' ? 'check_circle' : 'pause',
    }),
    getVarietyStyle: () => ({ bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' }),
}));

vi.mock('@/hooks/useOrchardMap', () => ({}));

import BlockCard from './BlockCard';

const block = {
    id: 'b1',
    name: 'Block A',
    status: 'active',
    totalRows: 20,
} as any;

const stats = {
    activePickers: 5,
    buckets: 120,
    completedRows: 8,
    progress: 0.4,
} as any;

describe('BlockCard', () => {
    const onClick = vi.fn();

    it('renders block name', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        expect(screen.getByText('Block A')).toBeTruthy();
    });

    it('renders variety badges', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala', 'Fuji']} index={0} onClick={onClick} />);
        expect(screen.getByText('Gala')).toBeTruthy();
        expect(screen.getByText('Fuji')).toBeTruthy();
    });

    it('renders status label', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders row count', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        expect(screen.getByText('20')).toBeTruthy();
    });

    it('renders pickers count', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders progress text', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        expect(screen.getByText('8/20 rows')).toBeTruthy();
    });

    it('renders View Rows link', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        expect(screen.getByText('View Rows')).toBeTruthy();
    });

    it('calls onClick when clicked', () => {
        render(<BlockCard block={block} stats={stats} varieties={['Gala']} index={0} onClick={onClick} />);
        fireEvent.click(screen.getByText('Block A'));
        expect(onClick).toHaveBeenCalled();
    });
});
