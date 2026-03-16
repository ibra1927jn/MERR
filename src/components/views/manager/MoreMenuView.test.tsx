/**
 * MoreMenuView — Mobile secondary navigation grid tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoreMenuView from './MoreMenuView';

describe('MoreMenuView', () => {
    const onNavigate = vi.fn();

    it('renders More heading', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        expect(screen.getByText('More')).toBeTruthy();
    });

    it('renders subtitle', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        expect(screen.getByText('Quick access to all tools')).toBeTruthy();
    });

    it('renders Insights menu item', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        expect(screen.getByText('Insights')).toBeTruthy();
        expect(screen.getByText('Analytics & weekly reports')).toBeTruthy();
    });

    it('renders Messaging menu item', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        expect(screen.getByText('Messaging')).toBeTruthy();
        expect(screen.getByText('Team communications')).toBeTruthy();
    });

    it('renders Settings menu item', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        expect(screen.getByText('Settings')).toBeTruthy();
        expect(screen.getByText('Orchard configuration')).toBeTruthy();
    });

    it('navigates to insights when clicked', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Insights'));
        expect(onNavigate).toHaveBeenCalledWith('insights');
    });

    it('navigates to messaging when clicked', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Messaging'));
        expect(onNavigate).toHaveBeenCalledWith('messaging');
    });

    it('navigates to settings when clicked', () => {
        render(<MoreMenuView onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Settings'));
        expect(onNavigate).toHaveBeenCalledWith('settings');
    });
});
