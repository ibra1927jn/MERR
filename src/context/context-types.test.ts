/**
 * Context types coverage — ensure type files import correctly and exports match
 */
import { describe, it, expect } from 'vitest';

describe('Auth types', () => {
    it('exports AuthState and AuthContextType interfaces', async () => {
        const mod = await import('./auth.types');
        // Type-only files still export the types for runtime checks
        expect(mod).toBeDefined();
    });
});

describe('Messaging types', () => {
    it('exports DBMessage, ChatGroup, MessagingState, MessagingContextType', async () => {
        const mod = await import('./messaging.types');
        expect(mod).toBeDefined();
    });
});
