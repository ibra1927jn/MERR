/**
 * Tests for picker-details sub-views:
 * QuickMessageView, RunnerProfileView, ActivityHistoryView
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';

// Mock roleUtils
vi.mock('./roleUtils', () => ({
    isPicker: (role: string) => role === 'picker',
    isTeamLeader: (role: string) => role === 'team_leader',
    ComparisonBadge: ({ diff, unit }: { diff: number; unit: string }) => <span>{diff > 0 ? '+' : ''}{diff} {unit}</span>,
    RoleAccent: {} as any,
}));

// ── QuickMessageView ────────────────────────────────
import QuickMessageView from './QuickMessageView';

describe('QuickMessageView', () => {
    const defaultProps = {
        pickerName: 'Juan',
        pickerId: 'p1',
        accent: { focus: 'focus:border-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700' },
        onSendMessage: vi.fn(),
        onBack: vi.fn(),
    };

    it('renders title with picker name', () => {
        render(<QuickMessageView {...defaultProps} />);
        expect(screen.getByText('Message to Juan')).toBeTruthy();
    });

    it('renders message templates', () => {
        render(<QuickMessageView {...defaultProps} />);
        expect(screen.getByText('Come to the collection point')).toBeTruthy();
        expect(screen.getByText('Take a break')).toBeTruthy();
        expect(screen.getByText('Good work today!')).toBeTruthy();
    });

    it('fills textarea when template clicked', () => {
        render(<QuickMessageView {...defaultProps} />);
        fireEvent.click(screen.getByText('Take a break'));
        const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement;
        expect(textarea.value).toBe('Take a break');
    });

    it('disables Send button when message empty', () => {
        render(<QuickMessageView {...defaultProps} />);
        const btn = screen.getByText('Send Message').closest('button');
        expect(btn).toBeDisabled();
    });

    it('enables Send button when message has content', () => {
        render(<QuickMessageView {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText('Type your message...'), {
            target: { value: 'Hello!' },
        });
        const btn = screen.getByText('Send Message').closest('button');
        expect(btn).not.toBeDisabled();
    });

    it('calls onSendMessage with pickerId and message', () => {
        const onSendMessage = vi.fn();
        render(<QuickMessageView {...defaultProps} onSendMessage={onSendMessage} />);
        fireEvent.change(screen.getByPlaceholderText('Type your message...'), {
            target: { value: 'Move to row 5' },
        });
        fireEvent.click(screen.getByText('Send Message'));
        expect(onSendMessage).toHaveBeenCalledWith('p1', 'Move to row 5');
    });

    it('calls onBack when back button clicked', () => {
        const onBack = vi.fn();
        render(<QuickMessageView {...defaultProps} onBack={onBack} />);
        fireEvent.click(screen.getByText('arrow_back'));
        expect(onBack).toHaveBeenCalledOnce();
    });
});

// ── RunnerProfileView ───────────────────────────────
import RunnerProfileView from './RunnerProfileView';

const mockPicker = {
    id: 'r1',
    name: 'Runner Bob',
    avatar: 'RB',
    total_buckets_today: 42,
    hours: 6.5,
    // check_in_time enables effectiveHours computation in RunnerProfileView
    check_in_time: new Date(Date.now() - 6.5 * 3600000).toISOString(),
    current_row: 12,
    status: 'active' as const,
    team_leader_id: 'tl1',
    picker_id: 'RUN001',
    role: 'runner',
} as any;

describe('RunnerProfileView', () => {
    it('renders bucket count', () => {
        render(<RunnerProfileView picker={mockPicker} onUpdate={vi.fn()} />);
        expect(screen.getByText('42')).toBeTruthy();
    });

    it('renders hours on-site', () => {
        render(<RunnerProfileView picker={mockPicker} onUpdate={vi.fn()} />);
        expect(screen.getByText('6.5h')).toBeTruthy();
    });

    it('renders activity labels', () => {
        render(<RunnerProfileView picker={mockPicker} onUpdate={vi.fn()} />);
        // Component renders "Trips Completed" (runner-specific label) and "Hours On-Site"
        expect(screen.getByText('Trips Completed')).toBeTruthy();
        expect(screen.getByText('Hours On-Site')).toBeTruthy();
    });

    it('shows Edit button in Details section', () => {
        render(<RunnerProfileView picker={mockPicker} onUpdate={vi.fn()} />);
        expect(screen.getByText('Edit')).toBeTruthy();
    });

    it('enters edit mode on Edit click', () => {
        render(<RunnerProfileView picker={mockPicker} onUpdate={vi.fn()} />);
        fireEvent.click(screen.getByText('Edit'));
        expect(screen.getByLabelText('Status')).toBeTruthy();
        expect(screen.getByText('Save')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('calls onUpdate on Save', () => {
        const onUpdate = vi.fn();
        render(<RunnerProfileView picker={mockPicker} onUpdate={onUpdate} />);
        fireEvent.click(screen.getByText('Edit'));
        fireEvent.click(screen.getByText('Save'));
        expect(onUpdate).toHaveBeenCalledWith('r1', { status: 'active' });
    });

    it('exits edit mode on Cancel', () => {
        render(<RunnerProfileView picker={mockPicker} onUpdate={vi.fn()} />);
        fireEvent.click(screen.getByText('Edit'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.getByText('Edit')).toBeTruthy();
    });
});

// ── ActivityHistoryView ─────────────────────────────
import ActivityHistoryView from './ActivityHistoryView';

describe('ActivityHistoryView', () => {
    const pickerData = {
        ...mockPicker,
        total_buckets_today: 20,
        hours: 3,
        current_row: 8,
    };

    it('renders "Scan History" title for picker role', () => {
        render(
            <ActivityHistoryView
                picker={pickerData}
                role="picker"
                pieceRate={3.0}
                allCrew={[]}
                onBack={vi.fn()}
            />,
        );
        expect(screen.getByText('Scan History')).toBeTruthy();
    });

    it('renders bucket count for picker', () => {
        render(
            <ActivityHistoryView
                picker={pickerData}
                role="picker"
                pieceRate={3.0}
                allCrew={[]}
                onBack={vi.fn()}
            />,
        );
        expect(screen.getByText('20 buckets')).toBeTruthy();
    });

    it('renders Estimated Earnings row', () => {
        render(
            <ActivityHistoryView
                picker={pickerData}
                role="picker"
                pieceRate={3.0}
                allCrew={[]}
                onBack={vi.fn()}
            />,
        );
        expect(screen.getByText('Estimated Earnings')).toBeTruthy();
    });

    it('renders "Collection Log" for runner role', () => {
        render(
            <ActivityHistoryView
                picker={pickerData}
                role="runner"
                pieceRate={3.0}
                allCrew={[]}
                onBack={vi.fn()}
            />,
        );
        expect(screen.getByText('Collection Log')).toBeTruthy();
    });

    it('shows empty state when picker has 0 buckets', () => {
        render(
            <ActivityHistoryView
                picker={{ ...pickerData, total_buckets_today: 0 }}
                role="picker"
                pieceRate={3.0}
                allCrew={[]}
                onBack={vi.fn()}
            />,
        );
        expect(screen.getByText('No activity recorded today')).toBeTruthy();
    });

    it('calls onBack when back button clicked', () => {
        const onBack = vi.fn();
        render(
            <ActivityHistoryView
                picker={pickerData}
                role="picker"
                pieceRate={3.0}
                allCrew={[]}
                onBack={onBack}
            />,
        );
        fireEvent.click(screen.getByText('arrow_back'));
        expect(onBack).toHaveBeenCalledOnce();
    });
});
