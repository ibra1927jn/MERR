/**
 * RiskBadge — indicador visual de riesgo.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RiskBadge from './RiskBadge';

describe('RiskBadge', () => {
    const base = { type: 'fatigue', severity: 'warning', label: 'Cansado', detail: '7h sin descanso' };

    it('renderiza label + detail', () => {
        const { getByText } = render(<RiskBadge badge={base} />);
        expect(getByText('Cansado')).toBeInTheDocument();
        expect(getByText('7h sin descanso')).toBeInTheDocument();
    });

    it('muestra icono 🔋 para type=fatigue', () => {
        const { container } = render(<RiskBadge badge={base} />);
        expect(container.textContent).toContain('🔋');
    });

    it('muestra 💸 para chronic_topup', () => {
        const { container } = render(<RiskBadge badge={{ ...base, type: 'chronic_topup' }} />);
        expect(container.textContent).toContain('💸');
    });

    it('muestra 📉 para quality_drop', () => {
        const { container } = render(<RiskBadge badge={{ ...base, type: 'quality_drop' }} />);
        expect(container.textContent).toContain('📉');
    });

    it('muestra 🚨 para anomalous_scans', () => {
        const { container } = render(<RiskBadge badge={{ ...base, type: 'anomalous_scans' }} />);
        expect(container.textContent).toContain('🚨');
    });

    it('fallback ⚠️ para type desconocido', () => {
        const { container } = render(<RiskBadge badge={{ ...base, type: 'unknown' }} />);
        expect(container.textContent).toContain('⚠️');
    });

    it('severity warning → bg-amber', () => {
        const { container } = render(<RiskBadge badge={base} />);
        expect(container.firstChild).toHaveClass('bg-amber-50');
    });

    it('severity critical → bg-red', () => {
        const { container } = render(<RiskBadge badge={{ ...base, severity: 'critical' }} />);
        expect(container.firstChild).toHaveClass('bg-red-50');
    });

    it('severity desconocido → fallback warning', () => {
        const { container } = render(<RiskBadge badge={{ ...base, severity: 'info' }} />);
        expect(container.firstChild).toHaveClass('bg-amber-50');
    });
});
