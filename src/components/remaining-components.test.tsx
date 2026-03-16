/**
 * Tests for NewContractModal, InspectionHistoryModal, DesktopLayout
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Global mocks ────────────────────────────────────
vi.mock('@/stores/useHarvestStore', () => ({
    useHarvestStore: vi.fn((selector) => {
        const state = {
            currentUser: { id: 'u1', full_name: 'Admin', role: 'manager', email: 'admin@test.com' },
            orchardId: 'orchard1',
            pickers: [],
            daySettings: { piece_rate_per_bucket: 3.0, minimum_wage: 23.5 },
            rowAssignments: {},
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u1', user_metadata: { full_name: 'Admin' } },
        userRole: 'manager',
        signOut: vi.fn(),
    }),
}));

vi.mock('@/context/MessagingContext', () => ({
    useMessaging: () => ({ unreadCount: 0, conversations: [] }),
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

// ── NewContractModal ────────────────────────────────
import NewContractModal from './modals/NewContractModal';

describe('NewContractModal', () => {
    it('renders nothing when not open', () => {
        const { container } = render(
            <NewContractModal isOpen={false} onClose={vi.fn()} employees={[]} onSubmit={vi.fn()} />,
        );
        expect(container.querySelector('form')).toBeNull();
    });

    it('renders title when open', () => {
        render(
            <NewContractModal
                isOpen={true}
                onClose={vi.fn()}
                employees={[{ id: 'e1', name: 'Alice', email: '' } as any]}
                onSubmit={vi.fn()}
            />,
        );
        expect(screen.getByText(/New Contract/i)).toBeTruthy();
    });

    it('renders contract type buttons', () => {
        render(
            <NewContractModal isOpen={true} onClose={vi.fn()} employees={[]} onSubmit={vi.fn()} />,
        );
        expect(screen.getByText('Permanent')).toBeTruthy();
        expect(screen.getByText('Seasonal')).toBeTruthy();
        expect(screen.getByText('Casual')).toBeTruthy();
    });

    it('Cancel calls onClose', () => {
        const onClose = vi.fn();
        render(
            <NewContractModal isOpen={true} onClose={onClose} employees={[]} onSubmit={vi.fn()} />,
        );
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledOnce();
    });
});

// ── InspectionHistoryModal ──────────────────────────
vi.mock('../../hooks/useInspectionHistory', () => ({
    useInspectionHistory: () => ({
        inspections: [
            {
                id: 'insp1', created_at: '2026-03-07T01:00:00Z', quality_grade: 'A',
                inspector_id: 'inspector_001', notes: 'Excellent quality, good size and color',
                picker_id: 'p1', photo_url: null,
            },
            {
                id: 'insp2', created_at: '2026-03-06T10:00:00Z', quality_grade: 'B',
                inspector_id: 'inspector_002', notes: 'Slightly underripe, acceptable',
                picker_id: 'p1', photo_url: null,
            },
        ],
        isLoading: false,
        stats: { total: 3, good: 2, warning: 1, averageScore: 83 },
        loadInspections: vi.fn(),
        getGradeColor: (grade: string) => grade === 'A' ? '#22c55e' : '#f59e0b',
        getGradeLabel: (grade: string) => `Grade ${grade}`,
    }),
}));

vi.mock('../../hooks/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'qc.inspectionHistory': 'Inspection History',
                'qc.good': 'Good',
                'qc.warning': 'Warning',
                'qc.noInspections': 'No Inspections',
                'common.close': 'Close',
            };
            return map[key] || key;
        },
        language: 'en',
        setLanguage: vi.fn(),
    }),
}));

import InspectionHistoryModal from './modals/InspectionHistoryModal';

describe('InspectionHistoryModal', () => {
    const mockPicker = {
        id: 'p1', name: 'Test Picker', picker_id: 'PK001',
        total_buckets_today: 10, status: 'active',
    } as any;

    it('renders picker name', () => {
        render(<InspectionHistoryModal picker={mockPicker} onClose={vi.fn()} />);
        expect(screen.getByText('Test Picker')).toBeTruthy();
    });

    it('renders Inspection History subtitle', () => {
        render(<InspectionHistoryModal picker={mockPicker} onClose={vi.fn()} />);
        expect(screen.getByText('Inspection History')).toBeTruthy();
    });

    it('renders stats summary (Total, Good, Warning, Score)', () => {
        render(<InspectionHistoryModal picker={mockPicker} onClose={vi.fn()} />);
        expect(screen.getByText('Total')).toBeTruthy();
        expect(screen.getByText('Good')).toBeTruthy();
        expect(screen.getByText('Warning')).toBeTruthy();
        expect(screen.getByText('Score')).toBeTruthy();
    });

    it('renders grade labels', () => {
        render(<InspectionHistoryModal picker={mockPicker} onClose={vi.fn()} />);
        const gradeAElements = screen.getAllByText('Grade A');
        expect(gradeAElements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Grade B')).toBeTruthy();
    });

    it('renders inspection notes', () => {
        render(<InspectionHistoryModal picker={mockPicker} onClose={vi.fn()} />);
        expect(screen.getByText('Excellent quality, good size and color')).toBeTruthy();
        expect(screen.getByText('Slightly underripe, acceptable')).toBeTruthy();
    });

    it('renders Close button', () => {
        render(<InspectionHistoryModal picker={mockPicker} onClose={vi.fn()} />);
        expect(screen.getByText('Close')).toBeTruthy();
    });

    it('calls onClose when Close clicked', () => {
        const onClose = vi.fn();
        render(<InspectionHistoryModal picker={mockPicker} onClose={onClose} />);
        fireEvent.click(screen.getByText('Close'));
        expect(onClose).toHaveBeenCalled();
    });
});

// ── DesktopLayout ───────────────────────────────────
import DesktopLayout from './common/DesktopLayout';

describe('DesktopLayout', () => {
    const defaultProps = {
        navItems: [
            { id: 'home', label: 'Home', icon: 'dashboard' },
            { id: 'team', label: 'Team', icon: 'people', badge: 3 },
        ],
        activeTab: 'home',
        onTabChange: vi.fn(),
        title: 'Test Dashboard',
        children: <p>Content Area</p>,
    };

    it('renders children content', () => {
        render(<DesktopLayout {...defaultProps} />);
        expect(screen.getByText('Content Area')).toBeTruthy();
    });

    it('renders title in multiple places', () => {
        render(<DesktopLayout {...defaultProps} />);
        const titles = screen.getAllByText('Test Dashboard');
        expect(titles.length).toBeGreaterThanOrEqual(1);
    });

    it('renders nav items', () => {
        render(<DesktopLayout {...defaultProps} />);
        const homeItems = screen.getAllByText('Home');
        expect(homeItems.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Team')).toBeTruthy();
    });

    it('renders badge on nav item', () => {
        render(<DesktopLayout {...defaultProps} />);
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('calls onTabChange when nav item clicked', () => {
        const onTabChange = vi.fn();
        render(<DesktopLayout {...defaultProps} onTabChange={onTabChange} />);
        fireEvent.click(screen.getByText('Team'));
        expect(onTabChange).toHaveBeenCalledWith('team');
    });

    it('renders HarvestPro brand', () => {
        render(<DesktopLayout {...defaultProps} />);
        expect(screen.getByText('HarvestPro')).toBeTruthy();
    });
});
