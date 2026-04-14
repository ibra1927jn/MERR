/**
 * test-utils.tsx — Custom render with project providers
 *
 * Re-exports everything from @testing-library/react with a custom render
 * that wraps components in the I18nProvider so t() resolves EN translations.
 * Gracefully degrades when @/i18n is mocked without I18nProvider.
 *
 * Usage (drop-in replacement):
 *   import { render, screen } from '@/test-utils';
 */
import React from 'react';
import { render as rtlRender, type RenderOptions, type RenderResult } from '@testing-library/react';
import * as I18nModule from '@/i18n';

// Graceful: if @/i18n is mocked without I18nProvider, skip the wrapper
const AllProviders = ({ children }: { children: React.ReactNode }) => {
    const Provider = (I18nModule as { I18nProvider?: React.FC<{ children: React.ReactNode }> }).I18nProvider;
    if (!Provider) return <>{children}</>;
    return <Provider>{children}</Provider>;
};

function render(
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
    return rtlRender(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { render };
