// Test setup for Vitest
// ── IndexedDB shim (Dexie / offline mode) ────────────
import 'fake-indexeddb/auto';
// ── DOM matchers (toBeInTheDocument, toBeDisabled, etc.) ──
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// ── matchMedia polyfill for JSDOM ────────────────────
// Required by useTheme, useMediaQuery, usePwaInstall, etc.
// Guard: some forks workers may not have window initialized yet
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

// ── Timezone lock ────────────────────────────────────
// Force NZ timezone so payroll/nzst calculations match
// production behavior, even when CI runs in UTC.
process.env.TZ = 'Pacific/Auckland';

// ── Zustand store cleanup ────────────────────────────
// Zustand persists state between tests in the same file.
// This helper resets all stores to their initial state.
import { useHarvestStore } from './stores/useHarvestStore';

const initialHarvestState = useHarvestStore.getState();

afterEach(() => {
    // Reset Zustand stores to prevent cross-test pollution
    useHarvestStore.setState(initialHarvestState, true);
});
