// Test setup for Vitest
// ── IndexedDB shim (Dexie / offline mode) ────────────
import 'fake-indexeddb/auto';
// ── DOM matchers (toBeInTheDocument, toBeDisabled, etc.) ──
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// ── Global safeStorage mock ──────────────────────────
// Prevents Zustand persist middleware from writing to localStorage
// during tests, which would cause cross-test state pollution.
// safeStorage.test.ts uses vi.unmock() to test the real implementation.
vi.mock('@/stores/safeStorage', () => ({
    safeStorage: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
    }
}));

// ── jsdom safety net for pool: forks ─────────────────
// jsdom throws "Not implemented: navigation" for location.reload/assign/replace.
// With pool: 'threads' these are caught, but with 'forks' they kill the worker.
// Mock globally so ALL test files are protected regardless of shard.
if (typeof window !== 'undefined') {
    // Navigation APIs
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: {
            ...originalLocation,
            reload: vi.fn(),
            assign: vi.fn(),
            replace: vi.fn(),
        },
    });

    // matchMedia polyfill (useTheme, useMediaQuery, usePwaInstall, etc.)
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

    // Suppress jsdom "Not implemented" console errors that don't affect tests
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (msg.includes('Not implemented') || msg.includes('Error: Not implemented')) return;
        originalConsoleError.apply(console, args);
    };
}

// ── Timezone lock ────────────────────────────────────
// Force NZ timezone so payroll/nzst calculations match
// production behavior, even when CI runs in UTC.
process.env.TZ = 'Pacific/Auckland';

// ── Zustand store cleanup ────────────────────────────
// Zustand persists state between tests in the same file.
// This helper resets all stores to their initial state.
import { useHarvestStore } from './stores/useHarvestStore';

// Capture data-only initial state as string to avoid reference leaks
const getInitialDataString = () => {
    const state = useHarvestStore.getState();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
        if (typeof v !== 'function') {
            data[k] = v;
        }
    }
    return JSON.stringify(data);
};
const initialDataStr = getInitialDataString();

afterEach(() => {
    // Reset Zustand store to clean initial state
    const cleanData = JSON.parse(initialDataStr);
    useHarvestStore.setState(cleanData, false);
    // Clear localStorage to prevent cross-test pollution
    if (typeof window !== 'undefined') {
        localStorage.clear();
    }
});
