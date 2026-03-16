/**
 * SetupWizard — Orchestrator tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import SetupWizard from './SetupWizard';

describe('SetupWizard', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    it('renders setup wizard heading', () => {
        render(<SetupWizard onComplete={onComplete} onCancel={onCancel} />);
        expect(screen.getByText('New Orchard Setup')).toBeTruthy();
    });

    it('calls onCancel when Cancel is clicked', () => {
        render(<SetupWizard onComplete={onComplete} onCancel={onCancel} />);
        const closeBtn = screen.getByLabelText('Close wizard');
        fireEvent.click(closeBtn);
        expect(onCancel).toHaveBeenCalled();
    });
});
