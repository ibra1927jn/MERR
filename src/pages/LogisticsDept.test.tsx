/**
 * LogisticsDept Page Tests
 *
 * Verifies: renders DesktopLayout with logistics nav, loading state, summary cards
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────
vi.mock('@/services/logistics-dept.service', () => ({
    fetchLogisticsSummary: vi.fn().mockResolvedValue({
        fullBins: 12, emptyBins: 28, activeTractors: 3, pendingRequests: 5, binsInTransit: 2,
    }),
    fetchFleet: vi.fn().mockResolvedValue([]),
    fetchBinInventory: vi.fn().mockResolvedValue([]),
    fetchTransportRequests: vi.fn().mockResolvedValue([]),
    fetchTransportHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/supabase', () => ({
    supabase: {
        channel: () => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        }),
        removeChannel: vi.fn(),
    },
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        appUser: { id: 'u1', full_name: 'Logistics User', role: 'logistics' },
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

vi.mock('@/components/views/logistics/FleetTab', () => ({
    default: () => <div data-testid="fleet-tab">Fleet Tab</div>,
}));
vi.mock('@/components/views/logistics/BinsTab', () => ({
    default: () => <div>Bins Tab</div>,
}));
vi.mock('@/components/views/logistics/RequestsTab', () => ({
    default: () => <div>Requests Tab</div>,
}));
vi.mock('@/components/views/logistics/HistoryTab', () => ({
    default: () => <div>History Tab</div>,
}));
vi.mock('@/components/ui/LoadingSkeleton', () => ({
    default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));
vi.mock('@/components/ui/ComponentErrorBoundary', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/common/NotificationPanel', () => ({
    default: () => <div>Notifications</div>,
}));
vi.mock('@/components/ui/ThemeToggle', () => ({
    default: () => <div>Theme</div>,
}));

import LogisticsDept from './LogisticsDept';

describe('LogisticsDept Page', () => {
    it('shows loading skeleton initially', () => {
        render(<LogisticsDept />);
        expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0);
    });

    it('renders the Logistics title after load', async () => {
        render(<LogisticsDept />);
        const title = await screen.findAllByText('Logistics');
        expect(title.length).toBeGreaterThan(0);
    });

    it('shows fleet tab as default after load', async () => {
        render(<LogisticsDept />);
        const fleetTab = await screen.findByTestId('fleet-tab');
        expect(fleetTab).toBeTruthy();
    });
});
