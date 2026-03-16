/**
 * NewChatModal — Create new DM or group conversation tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./messagingHelpers', () => ({
    getAvatarColor: () => 'bg-blue-500',
    getRoleBadge: () => ({ text: 'Manager', color: 'blue' }),
}));

import NewChatModal from './NewChatModal';

const users = [
    { id: 'u1', name: 'Alice Manager', role: 'manager' },
    { id: 'u2', name: 'Bob Picker', role: 'picker' },
    { id: 'u3', name: 'Carlos TL', role: 'team_leader' },
];

describe('NewChatModal', () => {
    const onClose = vi.fn();
    const onStartDirect = vi.fn();
    const onCreateGroup = vi.fn();
    beforeEach(() => vi.clearAllMocks());

    it('renders user names', () => {
        render(<NewChatModal availableUsers={users} currentUserId="u1" onClose={onClose} onStartDirect={onStartDirect} onCreateGroup={onCreateGroup} />);
        expect(screen.getByText('Bob Picker')).toBeTruthy();
        expect(screen.getByText('Carlos TL')).toBeTruthy();
    });

    it('excludes current user from list', () => {
        render(<NewChatModal availableUsers={users} currentUserId="u1" onClose={onClose} onStartDirect={onStartDirect} onCreateGroup={onCreateGroup} />);
        // Alice should not appear since she's the current user
        expect(screen.queryByText('Alice Manager')).toBeNull();
    });

    it('calls onClose when close button clicked', () => {
        render(<NewChatModal availableUsers={users} currentUserId="u1" onClose={onClose} onStartDirect={onStartDirect} onCreateGroup={onCreateGroup} />);
        fireEvent.click(screen.getByText('close'));
        expect(onClose).toHaveBeenCalled();
    });

    it('renders search input', () => {
        render(<NewChatModal availableUsers={users} currentUserId="u1" onClose={onClose} onStartDirect={onStartDirect} onCreateGroup={onCreateGroup} />);
        const input = screen.getByPlaceholderText(/search/i);
        expect(input).toBeTruthy();
    });
});
