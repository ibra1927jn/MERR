/**
 * ChatWindow — Messaging chat tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const selectedChat = {
  id: 'c1',
  name: 'Team Alpha',
  type: 'group' as const,
  members: ['u1', 'u2'],
  lastMessage: 'Hello',
  lastMessageAt: new Date().toISOString(),
};

const messages: any[] = [
  {
    id: 'm1',
    chat_id: 'c1',
    sender_id: 'u1',
    content: 'Hello everyone!',
    created_at: new Date().toISOString(),
    type: 'text',
    priority: 'normal',
    read_by: [],
  },
  {
    id: 'm2',
    chat_id: 'c1',
    sender_id: 'u2',
    content: 'Hi there!',
    created_at: new Date().toISOString(),
    type: 'text',
    priority: 'normal',
    read_by: [],
  },
];

const userNameMap = { u1: 'Alice', u2: 'Bob' };

import ChatWindow from './ChatWindow';

describe('ChatWindow', () => {
  const onSend = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = function () {};
  });

  it('renders chat name', () => {
    render(
      <ChatWindow
        selectedChat={selectedChat}
        messages={messages}
        appUserId="u1"
        userNameMap={userNameMap}
        isSending={false}
        onSend={onSend}
        onBack={onBack}
        isManager={true}
      />
    );
    expect(screen.getByText('Team Alpha')).toBeTruthy();
  });

  it('renders messages', () => {
    render(
      <ChatWindow
        selectedChat={selectedChat}
        messages={messages}
        appUserId="u1"
        userNameMap={userNameMap}
        isSending={false}
        onSend={onSend}
        onBack={onBack}
        isManager={true}
      />
    );
    expect(screen.getByText('Hello everyone!')).toBeTruthy();
    expect(screen.getByText('Hi there!')).toBeTruthy();
  });

  it('renders send input and calls onSend', () => {
    render(
      <ChatWindow
        selectedChat={selectedChat}
        messages={messages}
        appUserId="u1"
        userNameMap={userNameMap}
        isSending={false}
        onSend={onSend}
        onBack={onBack}
        isManager={true}
      />
    );
    const input = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(input, { target: { value: 'New message' } });

    const _sendButton = screen.getByRole('button', { name: /send|submit/i }); // Usually an icon button
    // Just trigger form submit if possible, or looking for the send icon button
    // For simplicity, we can fire a keydown event for Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('New message');
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <ChatWindow
        selectedChat={selectedChat}
        messages={messages}
        appUserId="u1"
        userNameMap={userNameMap}
        isSending={false}
        onSend={onSend}
        onBack={onBack}
        isManager={true}
      />
    );
    const backButton = screen.getByText('arrow_back');
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });
});
