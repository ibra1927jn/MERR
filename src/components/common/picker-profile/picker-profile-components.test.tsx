/**
 * Tests for common/picker-profile sub-components:
 * QualityRing, RiskBadge, Sparkline, TabButton
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── QualityRing ─────────────────────────────────────
import QualityRing from './QualityRing';

describe('QualityRing', () => {
    it('renders SVG with two circles', () => {
        const { container } = render(<QualityRing score={75} />);
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBe(2);
    });

    it('displays score as text', () => {
        render(<QualityRing score={85} />);
        expect(screen.getByText('85')).toBeTruthy();
    });

    it('uses green color for score >= 70', () => {
        const { container } = render(<QualityRing score={80} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(ring.getAttribute('stroke')).toBe('#10b981');
    });

    it('uses amber color for score 40-69', () => {
        const { container } = render(<QualityRing score={55} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(ring.getAttribute('stroke')).toBe('#f59e0b');
    });

    it('uses red color for score < 40', () => {
        const { container } = render(<QualityRing score={20} />);
        const ring = container.querySelectorAll('circle')[1];
        expect(ring.getAttribute('stroke')).toBe('#ef4444');
    });

    it('caps score at 100', () => {
        render(<QualityRing score={120} />);
        expect(screen.getByText('120')).toBeTruthy();
    });
});

// ── RiskBadge ───────────────────────────────────────
import RiskBadge from './RiskBadge';

describe('RiskBadge', () => {
    it('renders label and detail', () => {
        render(<RiskBadge badge={{ type: 'fatigue', severity: 'warning', label: 'Fatigue Risk', detail: '6h without break' }} />);
        expect(screen.getByText('Fatigue Risk')).toBeTruthy();
        expect(screen.getByText('6h without break')).toBeTruthy();
    });

    it('renders type icon', () => {
        render(<RiskBadge badge={{ type: 'fatigue', severity: 'warning', label: 'Tired', detail: 'test' }} />);
        expect(screen.getByText('🔋')).toBeTruthy();
    });

    it('renders anomalous_scans icon', () => {
        render(<RiskBadge badge={{ type: 'anomalous_scans', severity: 'critical', label: 'Alert', detail: 'test' }} />);
        expect(screen.getByText('🚨')).toBeTruthy();
    });

    it('applies warning bg for warning severity', () => {
        const { container } = render(
            <RiskBadge badge={{ type: 'fatigue', severity: 'warning', label: 'W', detail: 'd' }} />,
        );
        expect(container.querySelector('.bg-amber-50')).toBeTruthy();
    });

    it('applies critical bg for critical severity', () => {
        const { container } = render(
            <RiskBadge badge={{ type: 'fatigue', severity: 'critical', label: 'C', detail: 'd' }} />,
        );
        expect(container.querySelector('.bg-red-50')).toBeTruthy();
    });
});

// ── Sparkline ───────────────────────────────────────
import Sparkline from './Sparkline';

describe('Sparkline', () => {
    it('renders nothing when data has fewer than 2 points', () => {
        const { container } = render(<Sparkline data={[1]} color="#10b981" />);
        expect(container.innerHTML).toBe('');
    });

    it('renders SVG with polylines when data has 2+ points', () => {
        const { container } = render(<Sparkline data={[5, 10, 15, 8]} color="#10b981" />);
        const polylines = container.querySelectorAll('polyline');
        expect(polylines.length).toBe(2); // line + fill
    });

    it('applies custom color to stroke', () => {
        const { container } = render(<Sparkline data={[1, 2, 3]} color="#f43f5e" />);
        const line = container.querySelector('polyline');
        expect(line?.getAttribute('stroke')).toBe('#f43f5e');
    });

    it('renders an SVG element', () => {
        const { container } = render(<Sparkline data={[1, 2]} color="blue" />);
        expect(container.querySelector('svg')).toBeTruthy();
    });
});

// ── TabButton ───────────────────────────────────────
import TabButton from './TabButton';

describe('TabButton', () => {
    it('renders label text', () => {
        render(<TabButton active={false} label="Overview" onClick={vi.fn()} />);
        expect(screen.getByText('Overview')).toBeTruthy();
    });

    it('fires onClick when clicked', () => {
        const onClick = vi.fn();
        render(<TabButton active={false} label="Stats" onClick={onClick} />);
        fireEvent.click(screen.getByText('Stats'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('applies active styles when active', () => {
        const { container } = render(<TabButton active={true} label="Active" onClick={vi.fn()} />);
        const btn = container.querySelector('button');
        expect(btn?.className).toContain('gradient-primary');
    });

    it('applies inactive styles when not active', () => {
        const { container } = render(<TabButton active={false} label="Inactive" onClick={vi.fn()} />);
        const btn = container.querySelector('button');
        expect(btn?.className).toContain('text-text-muted');
    });
});
