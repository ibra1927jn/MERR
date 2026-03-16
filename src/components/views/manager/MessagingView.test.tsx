/**
 * MessagingView — Unified messaging wrapper tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../common/UnifiedMessagingView', () => ({
    default: () => <div data-testid="unified-messaging">Messaging</div>,
}));

import MessagingView from './MessagingView';

describe('MessagingView', () => {
    it('renders UnifiedMessagingView', () => {
        render(<MessagingView />);
        expect(screen.getByTestId('unified-messaging')).toBeTruthy();
    });
});
