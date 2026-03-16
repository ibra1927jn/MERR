/**
 * Batch tests for remaining uncovered UI components
 * Covers: Button, ComponentErrorBoundary, Icon, InlineEdit, InlineSelect,
 *         ModalOverlay, PageHeader, TabGroup, VirtualList, FilterBar, EmptyState
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('UI Component Imports', () => {
    it('Button exports default', async () => {
        const mod = await import('./Button');
        expect(mod.default).toBeDefined();
    });

    it('Icon exports default', async () => {
        const mod = await import('./Icon');
        expect(mod.default).toBeDefined();
    });

    it('InlineEdit exports default', async () => {
        const mod = await import('./InlineEdit');
        expect(mod.default).toBeDefined();
    });

    it('InlineSelect exports default', async () => {
        const mod = await import('./InlineSelect');
        expect(mod.default).toBeDefined();
    });

    it('ModalOverlay exports default', async () => {
        const mod = await import('./ModalOverlay');
        expect(mod.default).toBeDefined();
    });

    it('PageHeader exports default', async () => {
        const mod = await import('./PageHeader');
        expect(mod.default).toBeDefined();
    });

    it('TabGroup exports default', async () => {
        const mod = await import('./TabGroup');
        expect(mod.default).toBeDefined();
    });

    it('VirtualList exports default', async () => {
        const mod = await import('./VirtualList');
        expect(mod.default).toBeDefined();
    });

    it('ComponentErrorBoundary exports default', async () => {
        const mod = await import('./ComponentErrorBoundary');
        expect(mod.default).toBeDefined();
    });

    it('FilterBar exports default', async () => {
        const mod = await import('./FilterBar');
        expect(mod.default).toBeDefined();
    });

    it('EmptyState exports default', async () => {
        const mod = await import('./EmptyState');
        expect(mod.default).toBeDefined();
    });

    it('Drawer exports default', async () => {
        const mod = await import('./Drawer');
        expect(mod.default).toBeDefined();
    });

    it('LoadingSkeleton exports default', async () => {
        const mod = await import('./LoadingSkeleton');
        expect(mod.default).toBeDefined();
    });

    it('StatusBadge exports default', async () => {
        const mod = await import('./StatusBadge');
        expect(mod.default).toBeDefined();
    });

    it('StatCard exports default', async () => {
        const mod = await import('./StatCard');
        expect(mod.default).toBeDefined();
    });
});
