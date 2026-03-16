/**
 * Admin Page Tests
 *
 * Verifies: renders DesktopLayout with admin nav, loading state, content rendering
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────
vi.mock('@/services/admin.service', () => ({
    adminService: {
        getAllOrchards: vi.fn().mockResolvedValue([]),
        getAllUsers: vi.fn().mockResolvedValue([]),
    },
    OrchardOverview: {},
    UserRecord: {},
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        appUser: { id: 'u1', full_name: 'Admin User', role: 'admin' },
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

vi.mock('@/components/ui/LoadingSkeleton', () => ({
    default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

vi.mock('@/components/common/SetupWizard', () => ({
    default: () => <div>Setup Wizard</div>,
}));

vi.mock('@/components/ui/ComponentErrorBoundary', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/EmptyState', () => ({
    default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/AuditLogViewer', () => ({
    AuditLogViewer: () => <div>Audit Log</div>,
}));

vi.mock('@/components/common/NotificationPanel', () => ({
    default: () => <div>Notifications</div>,
}));

vi.mock('@/components/ui/ThemeToggle', () => ({
    default: () => <div>Theme</div>,
}));

import Admin from './Admin';

describe('Admin Page', () => {
    it('shows loading skeleton initially', () => {
        render(<Admin />);
        expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0);
    });

    it('renders the HarvestPro Admin title after load', async () => {
        render(<Admin />);
        const title = await screen.findAllByText('HarvestPro Admin');
        expect(title.length).toBeGreaterThan(0);
    });

    it('renders navigation items after load', async () => {
        render(<Admin />);
        const orchards = await screen.findAllByText('Orchards');
        expect(orchards.length).toBeGreaterThan(0);
        expect(screen.getAllByText('Users').length).toBeGreaterThan(0);
    });
});
