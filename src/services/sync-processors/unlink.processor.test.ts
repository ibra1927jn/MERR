/**
 * unlink.processor — sync queue handler para UNLINK payloads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { processUnlink } from './unlink.processor';

beforeEach(() => vi.restoreAllMocks());

describe('processUnlink', () => {
    it('throws cuando userId vacío/undefined', async () => {
        await expect(processUnlink({ userId: '' })).rejects.toThrow(/userId/);
        await expect(processUnlink({ userId: undefined as unknown as string })).rejects.toThrow(/userId/);
    });

    it('llama userService.unassignUserFromOrchard con userId', async () => {
        const spy = vi
            .spyOn(userService, 'unassignUserFromOrchard')
            .mockResolvedValue(undefined as never);
        await processUnlink({ userId: 'u1' });
        expect(spy).toHaveBeenCalledWith('u1');
    });
});
