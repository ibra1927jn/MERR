/**
 * QualityControl Page Tests
 *
 * Verifies: renders QC header, bottom nav, loading state
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────
vi.mock('@/stores/useHarvestStore', () => {
    const state = {
        crew: [{ id: 'p1', name: 'Picker A' }],
        orchard: { id: 'orch-1', name: 'Test Orchard' },
    };
    return {
        useHarvestStore: vi.fn((selector?: (s: typeof state) => unknown) => {
            if (typeof selector === 'function') return selector(state);
            return state;
        }),
    };
});

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        appUser: { id: 'u1', full_name: 'QC Inspector', role: 'qc_inspector' },
        signOut: vi.fn(),
        isAuthenticated: true,
    }),
}));

vi.mock('@/context/MessagingContext', () => ({
    useMessaging: () => ({ unreadCount: 0 }),
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('@/services/offline.service', () => ({
    offlineService: { getPendingCount: vi.fn().mockResolvedValue(0) },
}));

vi.mock('@/services/qc.service', () => ({
    qcService: {
        getInspections: vi.fn().mockResolvedValue([]),
        getGradeDistribution: vi.fn().mockResolvedValue({ A: 5, B: 3, C: 1, reject: 0, total: 9 }),
    },
}));

vi.mock('@/utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/views/qc/InspectTab', () => ({
    default: () => <div data-testid="inspect-tab">Inspect Tab</div>,
}));
vi.mock('@/components/views/qc/HistoryTab', () => ({
    default: () => <div>History Tab</div>,
}));
vi.mock('@/components/views/qc/StatsTab', () => ({
    default: () => <div>Stats Tab</div>,
}));
vi.mock('@/components/views/qc/TrendsTab', () => ({
    default: () => <div>Trends Tab</div>,
}));
vi.mock('@/components/ui/ComponentErrorBoundary', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/LoadingSkeleton', () => ({
    default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));
vi.mock('@/components/common/NotificationPanel', () => ({
    default: () => <div>Notifications</div>,
}));
vi.mock('@/components/ui/ThemeToggle', () => ({
    default: () => <div>Theme</div>,
}));

import QualityControl from './QualityControl';

describe('QualityControl Page', () => {
    it('renders without crashing', () => {
        const { container } = render(<QualityControl />);
        expect(container).toBeTruthy();
    });

    it('renders the header with Quality Control title after load', async () => {
        render(<QualityControl />);
        const titles = await screen.findAllByText('Quality Control');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('renders bottom navigation tabs after load', async () => {
        render(<QualityControl />);
        const inspectTab = await screen.findByText('Inspect');
        expect(inspectTab).toBeTruthy();
    });

    it('shows inspect tab content as default after load', async () => {
        render(<QualityControl />);
        const inspectContent = await screen.findByTestId('inspect-tab');
        expect(inspectContent).toBeTruthy();
    });
});
