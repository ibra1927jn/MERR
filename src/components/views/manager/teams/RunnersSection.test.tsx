/**
 * RunnersSection — Active runners list tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import RunnersSection from './RunnersSection';

const runners = [
    { id: 'r1', name: 'Juan Runner', avatar: 'JR', status: 'active', role: 'bucket_runner' } as any,
    { id: 'r2', name: 'Ana Runner', avatar: 'AR', status: 'break', role: 'runner' } as any,
];

describe('RunnersSection', () => {
    const onSelectUser = vi.fn();

    it('renders Active Runners heading', () => {
        render(<RunnersSection runners={runners} onSelectUser={onSelectUser} />);
        expect(screen.getByText('Active Runners')).toBeTruthy();
    });

    it('renders runner count badge', () => {
        render(<RunnersSection runners={runners} onSelectUser={onSelectUser} />);
        expect(screen.getByText('2 active')).toBeTruthy();
    });

    it('renders runner names', () => {
        render(<RunnersSection runners={runners} onSelectUser={onSelectUser} />);
        expect(screen.getByText('Juan Runner')).toBeTruthy();
        expect(screen.getByText('Ana Runner')).toBeTruthy();
    });

    it('renders status labels', () => {
        render(<RunnersSection runners={runners} onSelectUser={onSelectUser} />);
        expect(screen.getByText(/Active · Bucket Runner/)).toBeTruthy();
        expect(screen.getByText(/On Break · Bucket Runner/)).toBeTruthy();
    });

    it('calls onSelectUser when runner clicked', () => {
        render(<RunnersSection runners={runners} onSelectUser={onSelectUser} />);
        fireEvent.click(screen.getByText('Juan Runner'));
        expect(onSelectUser).toHaveBeenCalledWith(runners[0]);
    });

    it('shows empty state when no runners', () => {
        render(<RunnersSection runners={[]} onSelectUser={onSelectUser} />);
        expect(screen.getByText('No Bucket Runners Assigned')).toBeTruthy();
    });

    it('renders unlink button when onRemoveUser provided', () => {
        render(<RunnersSection runners={runners} onSelectUser={onSelectUser} onRemoveUser={vi.fn()} />);
        const unlinkBtns = screen.getAllByText('link_off');
        expect(unlinkBtns.length).toBe(2);
    });
});
