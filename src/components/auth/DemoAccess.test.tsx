/**
 * DemoAccess — 8 role access buttons.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import DemoAccess from './DemoAccess';
import { Role } from '@/types';

describe('DemoAccess', () => {
    it('renderiza 8 botones role', () => {
        const { container } = render(<DemoAccess isSubmitting={false} onDemoAccess={() => {}} />);
        expect(container.querySelectorAll('button')).toHaveLength(8);
    });

    it('renderiza labels de los 8 roles', () => {
        const { getByText } = render(<DemoAccess isSubmitting={false} onDemoAccess={() => {}} />);
        expect(getByText('Manager')).toBeInTheDocument();
        expect(getByText('Team Leader')).toBeInTheDocument();
        expect(getByText('Bucket Runner')).toBeInTheDocument();
        expect(getByText('QC Inspector')).toBeInTheDocument();
        expect(getByText('Payroll Admin')).toBeInTheDocument();
        expect(getByText('Admin')).toBeInTheDocument();
        expect(getByText('HR Admin')).toBeInTheDocument();
        expect(getByText('Logistics')).toBeInTheDocument();
    });

    it('click dispara onDemoAccess con el role correcto', () => {
        const onDemoAccess = vi.fn();
        const { getByText } = render(
            <DemoAccess isSubmitting={false} onDemoAccess={onDemoAccess} />,
        );
        fireEvent.click(getByText('Manager'));
        expect(onDemoAccess).toHaveBeenCalledWith(Role.MANAGER);
    });

    it('isSubmitting=true disable todos los botones', () => {
        const { container } = render(<DemoAccess isSubmitting={true} onDemoAccess={() => {}} />);
        const buttons = container.querySelectorAll('button');
        buttons.forEach((b) => expect(b).toBeDisabled());
    });

    it('isSubmitting=false todos los botones están habilitados', () => {
        const { container } = render(<DemoAccess isSubmitting={false} onDemoAccess={() => {}} />);
        const buttons = container.querySelectorAll('button');
        buttons.forEach((b) => expect(b).not.toBeDisabled());
    });

    it('click en QC Inspector → role QC_INSPECTOR', () => {
        const onDemoAccess = vi.fn();
        const { getByText } = render(
            <DemoAccess isSubmitting={false} onDemoAccess={onDemoAccess} />,
        );
        fireEvent.click(getByText('QC Inspector'));
        expect(onDemoAccess).toHaveBeenCalledWith(Role.QC_INSPECTOR);
    });
});
