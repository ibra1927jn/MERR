/**
 * picker.processor — sync queue handler para PICKER payloads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pickerCrudRepository } from '@/repositories/picker-crud.repository';
import { processPicker } from './picker.processor';

beforeEach(() => vi.restoreAllMocks());

describe('processPicker', () => {
    const basePayload = {
        id: 'p1',
        picker_id: 'P001',
        name: 'Alice',
        orchard_id: 'o1',
        status: 'active',
        role: 'picker',
        team_leader_id: 'tl1',
    } as never;

    it('updates cuando existe match por id', async () => {
        vi.spyOn(pickerCrudRepository, 'query').mockResolvedValue([
            { id: 'p1', picker_id: 'X999', name: 'old' },
        ] as never);
        const updateSpy = vi.spyOn(pickerCrudRepository, 'updateById').mockResolvedValue(undefined);

        await processPicker(basePayload);
        expect(updateSpy).toHaveBeenCalledWith('p1', expect.objectContaining({
            name: 'Alice',
            orchard_id: 'o1',
            status: 'active',
            role: 'picker',
            team_leader_id: 'tl1',
        }));
    });

    it('updates cuando existe match por picker_id', async () => {
        vi.spyOn(pickerCrudRepository, 'query').mockResolvedValue([
            { id: 'different-id', picker_id: 'P001', name: 'old' },
        ] as never);
        const updateSpy = vi.spyOn(pickerCrudRepository, 'updateById').mockResolvedValue(undefined);

        await processPicker(basePayload);
        expect(updateSpy).toHaveBeenCalledWith('different-id', expect.anything());
    });

    it('insert cuando no existe match', async () => {
        vi.spyOn(pickerCrudRepository, 'query').mockResolvedValue([] as never);
        const insertSpy = vi.spyOn(pickerCrudRepository, 'insert').mockResolvedValue({ id: 'p1' } as never);

        await processPicker(basePayload);
        expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'p1',
            picker_id: 'P001',
            status: 'active',
            role: 'picker',
        }));
    });

    it('insert con defaults status="active" + role="picker" cuando undefined', async () => {
        vi.spyOn(pickerCrudRepository, 'query').mockResolvedValue([] as never);
        const insertSpy = vi.spyOn(pickerCrudRepository, 'insert').mockResolvedValue({ id: 'p1' } as never);

        await processPicker({
            id: 'p2', picker_id: 'P002', name: 'Bob', orchard_id: 'o1',
        } as never);
        expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
            status: 'active',
            role: 'picker',
            team_leader_id: null,
        }));
    });

    it('update NO incluye status/role/team_leader_id si eran undefined en payload', async () => {
        vi.spyOn(pickerCrudRepository, 'query').mockResolvedValue([
            { id: 'p1', picker_id: 'P001', name: 'old' },
        ] as never);
        const updateSpy = vi.spyOn(pickerCrudRepository, 'updateById').mockResolvedValue(undefined);

        await processPicker({
            id: 'p1', picker_id: 'P001', name: 'New', orchard_id: 'o1',
        } as never);

        const updates = updateSpy.mock.calls[0][1] as Record<string, unknown>;
        expect(updates.name).toBe('New');
        expect('status' in updates).toBe(false);
        expect('role' in updates).toBe(false);
    });
});
