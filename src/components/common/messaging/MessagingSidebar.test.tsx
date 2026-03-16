/**
 * MessagingSidebar — Chat list and broadcast panel tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessagingSidebar from './MessagingSidebar';

const defaultProps = {
    activeTab: 'chats' as const,
    setActiveTab: vi.fn(),
    chatGroups: [
        { id: 'c1', name: 'Team Alpha', type: 'group', members: ['u1', 'u2'], lastMessage: 'Hello!', lastMessageAt: new Date().toISOString() },
    ] as any[],
    broadcasts: [] as any[],
    selectedChat: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    unreadCounts: { c1: 3 } as Record<string, number>,
    isManager: true,
    onSelectChat: vi.fn(),
    onNewChat: vi.fn(),
    onNewBroadcast: vi.fn(),
    isSidebarOpen: true,
};

describe('MessagingSidebar', () => {
    it('renders chat group name', () => {
        render(<MessagingSidebar {...defaultProps} />);
        expect(screen.getByText('Team Alpha')).toBeTruthy();
    });

    it('renders search input', () => {
        render(<MessagingSidebar {...defaultProps} />);
        const input = screen.getByPlaceholderText(/search/i);
        expect(input).toBeTruthy();
    });

    it('calls onSelectChat when group clicked', () => {
        render(<MessagingSidebar {...defaultProps} />);
        fireEvent.click(screen.getByText('Team Alpha'));
        expect(defaultProps.onSelectChat).toHaveBeenCalled();
    });

    it('calls setSearchQuery on input change', () => {
        render(<MessagingSidebar {...defaultProps} />);
        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'test' } });
        expect(defaultProps.setSearchQuery).toHaveBeenCalledWith('test');
    });

    it('renders tab buttons', () => {
        render(<MessagingSidebar {...defaultProps} />);
        // Should have Chats and Alerts/Broadcasts tabs
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });
});
