/**
 * Tests for UI feedback components: LoadingSkeleton, VirtualList
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock react-virtuoso since it requires DOM measurements
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent, className }: {
        data: unknown[];
        itemContent: (index: number, item: unknown) => React.ReactNode;
        className?: string;
    }) => (
        <div data-testid="virtuoso" className={className}>
            {data.map((item, index) => (
                <div key={index}>{itemContent(index, item)}</div>
            ))}
        </div>
    ),
}));

// ── LoadingSkeleton ─────────────────────────────────
import LoadingSkeleton from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
    it('renders 1 skeleton by default', () => {
        const { container } = render(<LoadingSkeleton />);
        const shimmers = container.querySelectorAll('.animate-shimmer');
        expect(shimmers.length).toBeGreaterThan(0);
    });

    it('renders multiple skeletons when count > 1', () => {
        const { container } = render(<LoadingSkeleton count={3} type="text" />);
        const shimmers = container.querySelectorAll('.animate-shimmer');
        expect(shimmers.length).toBe(3);
    });

    it('renders card variant with correct structure', () => {
        const { container } = render(<LoadingSkeleton type="card" />);
        expect(container.querySelector('.shadow')).toBeTruthy();
    });

    it('renders list variant with circular avatar placeholder', () => {
        const { container } = render(<LoadingSkeleton type="list" />);
        expect(container.querySelector('.rounded-full')).toBeTruthy();
    });

    it('renders table variant with row-like layout', () => {
        const { container } = render(<LoadingSkeleton type="table" />);
        expect(container.querySelector('.border-b')).toBeTruthy();
    });

    it('renders metric variant', () => {
        const { container } = render(<LoadingSkeleton type="metric" />);
        const shimmers = container.querySelectorAll('.animate-shimmer');
        expect(shimmers.length).toBe(2); // label + value
    });

    it('renders text variant', () => {
        const { container } = render(<LoadingSkeleton type="text" />);
        const shimmers = container.querySelectorAll('.animate-shimmer');
        expect(shimmers.length).toBe(1);
    });

    it('applies custom className', () => {
        const { container } = render(<LoadingSkeleton type="text" className="my-custom-class" />);
        expect(container.querySelector('.my-custom-class')).toBeTruthy();
    });
});

// ── VirtualList ─────────────────────────────────────
import VirtualList from './VirtualList';

describe('VirtualList', () => {
    it('renders nothing when items array is empty', () => {
        const { container } = render(
            <VirtualList
                items={[]}
                estimateSize={40}
                renderItem={() => <div>Item</div>}
            />,
        );
        expect(container.innerHTML).toBe('');
    });

    it('renders items when array is not empty', () => {
        render(
            <VirtualList
                items={['Apple', 'Banana', 'Cherry']}
                estimateSize={40}
                renderItem={(item) => <span>{item}</span>}
            />,
        );
        expect(screen.getByText('Apple')).toBeTruthy();
        expect(screen.getByText('Banana')).toBeTruthy();
        expect(screen.getByText('Cherry')).toBeTruthy();
    });

    it('passes index to renderItem', () => {
        render(
            <VirtualList
                items={['A', 'B']}
                estimateSize={40}
                renderItem={(item, index) => <span>{`${index}-${item}`}</span>}
            />,
        );
        expect(screen.getByText('0-A')).toBeTruthy();
        expect(screen.getByText('1-B')).toBeTruthy();
    });

    it('applies className to container', () => {
        render(
            <VirtualList
                items={['X']}
                estimateSize={40}
                renderItem={(item) => <span>{item}</span>}
                className="test-class"
            />,
        );
        expect(screen.getByTestId('virtuoso').className).toContain('test-class');
    });
});
