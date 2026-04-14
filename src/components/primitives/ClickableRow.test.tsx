import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClickableRow from './ClickableRow';

describe('ClickableRow', () => {
    it('dispara onClick al hacer click cuando está habilitado', () => {
        const handleClick = vi.fn();
        render(<ClickableRow onClick={handleClick}>Contenido</ClickableRow>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('dispara onClick al presionar Enter cuando está habilitado', () => {
        const handleClick = vi.fn();
        render(<ClickableRow onClick={handleClick}>Contenido</ClickableRow>);
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('dispara onClick al presionar Space cuando está habilitado', () => {
        const handleClick = vi.fn();
        render(<ClickableRow onClick={handleClick}>Contenido</ClickableRow>);
        fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('NO dispara onClick al hacer click cuando está deshabilitado', () => {
        const handleClick = vi.fn();
        render(<ClickableRow onClick={handleClick} disabled>Contenido</ClickableRow>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('NO dispara onClick al presionar Enter cuando está deshabilitado', () => {
        const handleClick = vi.fn();
        render(<ClickableRow onClick={handleClick} disabled>Contenido</ClickableRow>);
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('tiene role="button"', () => {
        render(<ClickableRow onClick={vi.fn()}>Contenido</ClickableRow>);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('tiene tabIndex={0} cuando está habilitado', () => {
        render(<ClickableRow onClick={vi.fn()}>Contenido</ClickableRow>);
        expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('tiene tabIndex={-1} cuando está deshabilitado', () => {
        const handleClick = vi.fn();
        render(<ClickableRow onClick={handleClick} disabled>Contenido</ClickableRow>);
        expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
    });
});
