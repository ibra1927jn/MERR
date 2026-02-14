import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
    items: T[];
    estimateSize: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    overscan?: number;
    getKey?: (item: T, index: number) => string | number;
}

/**
 * Generic virtual scroll wrapper powered by @tanstack/react-virtual.
 *
 * Usage:
 * ```tsx
 * <VirtualList
 *   items={pickers}
 *   estimateSize={72}
 *   renderItem={(picker) => <PickerCard picker={picker} />}
 * />
 * ```
 */
function VirtualList<T>({
    items,
    estimateSize,
    renderItem,
    className = '',
    overscan = 5,
    getKey,
}: VirtualListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
    });

    if (items.length === 0) return null;

    return (
        <div
            ref={parentRef}
            className={`overflow-auto contain-strict ${className}`}
        >
            <div
                className="virtual-list-inner"
                style={{ '--total-h': `${virtualizer.getTotalSize()}px` } as React.CSSProperties}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const item = items[virtualItem.index];
                    const key = getKey
                        ? getKey(item, virtualItem.index)
                        : virtualItem.index;

                    return (
                        <div
                            key={key}
                            className="virtual-list-item"
                            style={{
                                '--item-h': `${virtualItem.size}px`,
                                '--item-y': `${virtualItem.start}px`,
                            } as React.CSSProperties}
                        >
                            {renderItem(item, virtualItem.index)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default VirtualList;
