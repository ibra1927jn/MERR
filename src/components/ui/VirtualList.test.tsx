/**
 * VirtualList — generic virtual scroll wrapper sobre react-virtuoso.
 * Mockeamos Virtuoso porque su jsdom behavior es complejo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import VirtualList from './VirtualList';

vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent, className }: {
        data: unknown[];
        itemContent: (idx: number, item: unknown) => React.ReactNode;
        className?: string;
    }) => (
        <div data-testid="virtuoso-mock" className={className}>
            {data.map((item, i) => (
                <div key={i} data-testid={`item-${i}`}>{itemContent(i, item)}</div>
            ))}
        </div>
    ),
}));

describe('VirtualList', () => {
    it('null cuando items vacío', () => {
        const { container } = render(
            <VirtualList items={[]} estimateSize={50} renderItem={() => null} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza items via renderItem', () => {
        const items = ['A', 'B', 'C'];
        const { getByText } = render(
            <VirtualList items={items} estimateSize={50} renderItem={(x) => <span>{x}</span>} />,
        );
        expect(getByText('A')).toBeInTheDocument();
        expect(getByText('B')).toBeInTheDocument();
        expect(getByText('C')).toBeInTheDocument();
    });

    it('renderItem recibe (item, index)', () => {
        const rendered: Array<[string, number]> = [];
        render(
            <VirtualList
                items={['X', 'Y']}
                estimateSize={50}
                renderItem={(item, idx) => {
                    rendered.push([item, idx]);
                    return null;
                }}
            />,
        );
        expect(rendered).toEqual([['X', 0], ['Y', 1]]);
    });

    it('className prop passed to wrapper', () => {
        const { container } = render(
            <VirtualList
                items={['A']}
                estimateSize={50}
                renderItem={(x) => <span>{x}</span>}
                className="custom-vl"
            />,
        );
        expect(container.querySelector('.custom-vl')).not.toBeNull();
    });

    it('renderiza typed items (object)', () => {
        type Row = { id: string; label: string };
        const items: Row[] = [{ id: 'r1', label: 'Row 1' }, { id: 'r2', label: 'Row 2' }];
        const { getByText } = render(
            <VirtualList
                items={items}
                estimateSize={60}
                renderItem={(item) => <span>{item.label}</span>}
            />,
        );
        expect(getByText('Row 1')).toBeInTheDocument();
        expect(getByText('Row 2')).toBeInTheDocument();
    });
});
