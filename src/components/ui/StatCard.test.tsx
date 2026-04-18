/**
 * StatCard — KPI metric card.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
    it('renderiza value + label + icon', () => {
        const { getByText } = render(<StatCard icon="dashboard" value={42} label="Users" />);
        expect(getByText('42')).toBeInTheDocument();
        expect(getByText('Users')).toBeInTheDocument();
        expect(getByText('dashboard')).toBeInTheDocument();
    });

    it('value como string funciona también', () => {
        const { getByText } = render(<StatCard icon="x" value="$1,234" label="Total" />);
        expect(getByText('$1,234')).toBeInTheDocument();
    });

    it('sin onClick no es role="button"', () => {
        const { container } = render(<StatCard icon="x" value={1} label="L" />);
        expect(container.querySelector('[role="button"]')).toBeNull();
    });

    it('con onClick renderiza role="button" + tabIndex=0 + aria-label', () => {
        const { container } = render(
            <StatCard icon="x" value={1} label="Users" onClick={() => {}} />,
        );
        const btn = container.querySelector('[role="button"]');
        expect(btn).not.toBeNull();
        expect(btn?.getAttribute('tabindex')).toBe('0');
        expect(btn?.getAttribute('aria-label')).toBe('Users: 1');
    });

    it('click dispara onClick', () => {
        const onClick = vi.fn();
        const { container } = render(
            <StatCard icon="x" value={1} label="L" onClick={onClick} />,
        );
        fireEvent.click(container.querySelector('[role="button"]')!);
        expect(onClick).toHaveBeenCalled();
    });

    it('Enter key dispara onClick', () => {
        const onClick = vi.fn();
        const { container } = render(
            <StatCard icon="x" value={1} label="L" onClick={onClick} />,
        );
        fireEvent.keyDown(container.querySelector('[role="button"]')!, { key: 'Enter' });
        expect(onClick).toHaveBeenCalled();
    });

    it('Space key dispara onClick', () => {
        const onClick = vi.fn();
        const { container } = render(
            <StatCard icon="x" value={1} label="L" onClick={onClick} />,
        );
        fireEvent.keyDown(container.querySelector('[role="button"]')!, { key: ' ' });
        expect(onClick).toHaveBeenCalled();
    });

    it('otra key NO dispara onClick', () => {
        const onClick = vi.fn();
        const { container } = render(
            <StatCard icon="x" value={1} label="L" onClick={onClick} />,
        );
        fireEvent.keyDown(container.querySelector('[role="button"]')!, { key: 'a' });
        expect(onClick).not.toHaveBeenCalled();
    });

    it('trend up renderiza trending_up + emerald', () => {
        const { getByText, container } = render(
            <StatCard icon="x" value={1} label="L" trend={{ direction: 'up', value: '+12%' }} />,
        );
        expect(getByText('trending_up')).toBeInTheDocument();
        expect(getByText('+12%')).toBeInTheDocument();
        expect(container.querySelector('.text-emerald-600')).not.toBeNull();
    });

    it('trend down renderiza trending_down + red', () => {
        const { getByText, container } = render(
            <StatCard icon="x" value={1} label="L" trend={{ direction: 'down', value: '-5%' }} />,
        );
        expect(getByText('trending_down')).toBeInTheDocument();
        expect(container.querySelector('.text-red-600')).not.toBeNull();
    });

    it('trend flat renderiza trending_flat + slate', () => {
        const { getByText, container } = render(
            <StatCard icon="x" value={1} label="L" trend={{ direction: 'flat', value: '0%' }} />,
        );
        expect(getByText('trending_flat')).toBeInTheDocument();
        expect(container.querySelector('.text-slate-500')).not.toBeNull();
    });

    it('sin trend no renderiza trending_*', () => {
        const { queryByText } = render(<StatCard icon="x" value={1} label="L" />);
        expect(queryByText('trending_up')).toBeNull();
        expect(queryByText('trending_down')).toBeNull();
    });

    it('iconBg/iconColor custom overrides', () => {
        const { container } = render(
            <StatCard icon="x" value={1} label="L" iconBg="bg-red-100" iconColor="text-red-700" />,
        );
        expect(container.querySelector('.bg-red-100')).not.toBeNull();
        expect(container.querySelector('.text-red-700')).not.toBeNull();
    });
});
