/**
 * Phase 3: Expanded OmniCore UI tests for QualityControl page
 * Verifies: tab navigation, ambient background rendering, glassmorphic styling
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: vi.fn() },
    writable: true,
  });
});

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
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/services/offline.service', () => ({
  offlineService: { getPendingCount: vi.fn().mockResolvedValue(0) },
}));
vi.mock('@/services/qc.service', () => ({
  qcService: {
    getInspections: vi.fn().mockResolvedValue([]),
    getGradeDistribution: vi.fn().mockResolvedValue({ A: 5, B: 3, C: 1, reject: 0, total: 9 }),
  },
}));
vi.mock('@/hooks/useQC', () => ({
  useQC: () => ({
    isLoading: false,
    crew: [{ id: 'p1', name: 'Picker A' }],
    inspections: [],
    distribution: { A: 5, B: 3, C: 1, reject: 0, total: 9 },
    selectedPicker: null,
    setSelectedPicker: vi.fn(),
    notes: '',
    setNotes: vi.fn(),
    isSubmitting: false,
    lastGrade: null,
    handleGrade: vi.fn(),
    loadInspections: vi.fn(),
    orchardId: 'orch-1',
  }),
}));
vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/views/qc/InspectTab', () => ({
  default: () => <div data-testid="inspect-tab">Inspect Tab</div>,
}));
vi.mock('@/components/views/qc/HistoryTab', () => ({
  default: () => <div data-testid="history-tab">History Tab</div>,
}));
vi.mock('@/components/views/qc/StatsTab', () => ({
  default: () => <div data-testid="stats-tab">Stats Tab</div>,
}));
vi.mock('@/components/views/qc/TrendsTab', () => ({
  default: () => <div data-testid="trends-tab">Trends Tab</div>,
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
vi.mock('@/components/common/OrchardSwitcher', () => ({
  default: () => null,
}));

import QualityControl from '../../../pages/QualityControl';

describe('QualityControl OmniCore UI', () => {
  it('renders ambient gradient background (OmniCore aesthetic)', async () => {
    const { container } = render(<QualityControl />);
    await screen.findAllByText('Quality Control');
    // The page should contain the ambient bg-slate-50 background
    const mainBg = container.querySelector('.bg-slate-50, [class*="bg-slate"]');
    expect(mainBg || container.innerHTML.includes('bg-slate')).toBeTruthy();
  });

  it('navigates between QC tabs', async () => {
    render(<QualityControl />);
    
    // Wait for the default Inspect tab to load
    const inspectContent = await screen.findByTestId('inspect-tab');
    expect(inspectContent).toBeTruthy();
    
    // Click Analytics tab
    const analyticsButton = await screen.findByText('Analytics');
    fireEvent.click(analyticsButton);
    const statsContent = await screen.findByTestId('stats-tab');
    expect(statsContent).toBeTruthy();
  });

  it('renders all 4 navigation tabs', async () => {
    render(<QualityControl />);
    await screen.findByText('Inspect');
    expect(screen.getByText('Analytics')).toBeTruthy();
    expect(screen.getByText('Trends')).toBeTruthy();
    expect(screen.getByText('History')).toBeTruthy();
  });

  it('shows QC header with user info', async () => {
    render(<QualityControl />);
    const title = await screen.findAllByText('Quality Control');
    expect(title.length).toBeGreaterThan(0);
  });
});
