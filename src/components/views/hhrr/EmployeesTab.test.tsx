/**
 * EmployeesTab — Import verification test
 * Uses Virtuoso for virtual scrolling which requires complex mocking.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent }: any) => (
        <div data-testid="virtuoso">
            {data?.map((item: any, i: number) => (
                <div key={i}>{itemContent(i, item)}</div>
            ))}
        </div>
    ),
}));

vi.mock('@/components/ui/FilterBar', () => ({
    default: ({ searchPlaceholder }: any) => <input data-testid="filter-bar" placeholder={searchPlaceholder} />,
}));

vi.mock('@/components/ui/InlineEdit', () => ({
    default: ({ value }: any) => <span>{value}</span>,
}));

vi.mock('@/components/ui/InlineSelect', () => ({
    default: ({ value }: any) => <span>{value}</span>,
}));

vi.mock('@/services/hhrr.service', () => ({
    updateContract: vi.fn(),
}));

describe('EmployeesTab', () => {
    it('exports a default component', async () => {
        const mod = await import('./EmployeesTab');
        expect(mod.default).toBeDefined();
        expect(typeof mod.default).toBe('function');
    });
});
