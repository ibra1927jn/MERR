import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import EntityId from './EntityId';

// Mock i18n
vi.mock('@/i18n', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'common.copy' ? 'Copy' : key === 'common.copied' ? 'Copied!' : key),
        locale: 'en',
        setLocale: vi.fn(),
    }),
}));

// Mock clipboard
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
});

beforeEach(() => {
    cleanup();
    writeText.mockResolvedValue(undefined);
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('EntityId', () => {
    it('truncates long IDs to chars + ellipsis', () => {
        render(<EntityId id="abc123def456" chars={6} />);
        expect(screen.getByText('abc123…')).toBeInTheDocument();
    });

    it('shows full ID when shorter than chars limit', () => {
        render(<EntityId id="abc" chars={6} />);
        expect(screen.getByText('abc')).toBeInTheDocument();
    });

    it('shows copy button with aria-label "Copy" initially', () => {
        render(<EntityId id="some-uuid-here" />);
        const btn = screen.getByTestId('entity-id-copy-btn');
        expect(btn).toHaveAttribute('aria-label', 'Copy');
    });

    it('exposes full ID as title for hover tooltip', () => {
        const fullId = 'full-uuid-1234-5678';
        render(<EntityId id={fullId} />);
        expect(screen.getByTestId('entity-id')).toHaveAttribute('title', fullId);
    });

    it('calls navigator.clipboard.writeText with full ID on click', async () => {
        render(<EntityId id="copy-me-uuid" />);
        fireEvent.click(screen.getByTestId('entity-id-copy-btn'));
        expect(writeText).toHaveBeenCalledWith('copy-me-uuid');
    });

    it('shows "Copied!" feedback after click and restores after 1.5s', async () => {
        render(<EntityId id="copy-me-uuid" />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('entity-id-copy-btn'));
            // esperar la promesa de clipboard
            await Promise.resolve();
        });

        expect(screen.getByTestId('entity-id-copied')).toBeInTheDocument();
        expect(screen.getByTestId('entity-id-copy-btn')).toHaveAttribute('aria-label', 'Copied!');

        // avanzar 1500ms → debe volver al estado original
        act(() => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.queryByTestId('entity-id-copied')).not.toBeInTheDocument();
        expect(screen.getByTestId('entity-id-copy-btn')).toHaveAttribute('aria-label', 'Copy');
    });

    it('does not show "Copied!" if clipboard rejects', async () => {
        writeText.mockRejectedValueOnce(new Error('permission denied'));
        render(<EntityId id="fail-me" />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('entity-id-copy-btn'));
            await Promise.resolve();
        });

        expect(screen.queryByTestId('entity-id-copied')).not.toBeInTheDocument();
    });

    it('applies custom className to root span', () => {
        render(<EntityId id="x" className="text-slate-400 custom-cls" />);
        expect(screen.getByTestId('entity-id')).toHaveClass('custom-cls');
    });

    it('uses default chars=6 when not specified', () => {
        render(<EntityId id="abcdef7890" />);
        // primeros 6 chars + ellipsis
        expect(screen.getByText('abcdef…')).toBeInTheDocument();
    });
});
