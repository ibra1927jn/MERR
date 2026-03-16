/**
 * DashboardStatCard — Deep render tests
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardStatCard from './DashboardStatCard';

describe('DashboardStatCard', () => {
    const defaultProps = {
        title: 'Total Buckets',
        value: 1250,
        icon: 'shopping_basket',
    };

    it('renders title', () => {
        render(<DashboardStatCard {...defaultProps} />);
        expect(screen.getByText('Total Buckets')).toBeTruthy();
    });

    it('renders value', () => {
        render(<DashboardStatCard {...defaultProps} />);
        expect(screen.getByText('1250')).toBeTruthy();
    });

    it('renders icon', () => {
        render(<DashboardStatCard {...defaultProps} />);
        expect(screen.getByText('shopping_basket')).toBeTruthy();
    });

    it('renders unit when provided', () => {
        render(<DashboardStatCard {...defaultProps} unit="bins" />);
        expect(screen.getByText('bins')).toBeTruthy();
    });

    it('shows positive trend with up arrow', () => {
        render(<DashboardStatCard {...defaultProps} trend={12} />);
        expect(screen.getByText('trending_up')).toBeTruthy();
        expect(screen.getByText('+12% vs yesterday')).toBeTruthy();
    });

    it('shows negative trend with down arrow', () => {
        render(<DashboardStatCard {...defaultProps} trend={-5} />);
        expect(screen.getByText('trending_down')).toBeTruthy();
        expect(screen.getByText('-5% vs yesterday')).toBeTruthy();
    });

    it('does not show trend when trend is 0', () => {
        render(<DashboardStatCard {...defaultProps} trend={0} />);
        expect(screen.queryByText('trending_up')).toBeNull();
        expect(screen.queryByText('trending_down')).toBeNull();
    });

    it('calls onClick when clicked', () => {
        const onClick = vi.fn();
        render(<DashboardStatCard {...defaultProps} onClick={onClick} />);
        fireEvent.click(screen.getByText('Total Buckets'));
        expect(onClick).toHaveBeenCalled();
    });

    it('renders string value', () => {
        render(<DashboardStatCard title="Status" value="Active" icon="check" />);
        expect(screen.getByText('Active')).toBeTruthy();
    });
});
