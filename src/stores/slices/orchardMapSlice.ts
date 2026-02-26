/**
 * orchardMapSlice — Orchard Map state (The Shared Brain)
 *
 * Manages block selection, variety filtering, and mock block data.
 * All 3 map views (Tactical, HeatMap, Geographic) read from this single slice —
 * "dumb monitors" fed by one brain.
 *
 * KEY: Variety is PER-ROW, not per-block.
 * A block with 20 rows might have 5 Lapins, 5 Sweetheart, and 10 Bing rows.
 * The variety filter appears at Level 2 (inside a block) and ghost-dims
 * rows that don't match.
 *
 * Mock data for dev: 2 blocks with cherry varieties.
 * When backend integration lands, swap MOCK_BLOCKS with a Supabase fetch.
 */
import type { OrchardBlock } from '@/types';
import type { StateCreator } from 'zustand';
import type { HarvestStoreState } from '../storeTypes';

// --- Mock Data (replace with Supabase fetch later) ---
// Cherry varieties distributed across rows within each block
const MOCK_BLOCKS: OrchardBlock[] = [
    {
        id: 'block-a',
        name: 'Block A',
        totalRows: 12,
        startRow: 1,
        colorCode: '#dc2626', // Cherry red
        status: 'active',
        rowVarieties: {
            // 5 Lapins, 4 Sweetheart, 3 Bing
            1: 'Lapins', 2: 'Lapins', 3: 'Lapins', 4: 'Lapins', 5: 'Lapins',
            6: 'Sweetheart', 7: 'Sweetheart', 8: 'Sweetheart', 9: 'Sweetheart',
            10: 'Bing', 11: 'Bing', 12: 'Bing',
        },
    },
    {
        id: 'block-b',
        name: 'Block B',
        totalRows: 8,
        startRow: 13,
        colorCode: '#9333ea', // Purple for variety
        status: 'idle',
        rowVarieties: {
            // 3 Rainier, 3 Stella, 2 Kordia
            13: 'Rainier', 14: 'Rainier', 15: 'Rainier',
            16: 'Stella', 17: 'Stella', 18: 'Stella',
            19: 'Kordia', 20: 'Kordia',
        },
    },
];

// --- Slice Interface (exported for storeTypes.ts) ---
export interface OrchardMapSlice {
    orchardBlocks: OrchardBlock[];
    selectedBlockId: string | null;
    selectedVariety: string | 'ALL';
    setSelectedBlock: (id: string | null) => void;
    setSelectedVariety: (variety: string | 'ALL') => void;
}

// --- Slice Creator ---
export const createOrchardMapSlice: StateCreator<
    HarvestStoreState,
    [],
    [],
    OrchardMapSlice
> = (set) => ({
    orchardBlocks: MOCK_BLOCKS,
    selectedBlockId: null,
    selectedVariety: 'ALL',

    setSelectedBlock: (id) => set({ selectedBlockId: id, selectedVariety: 'ALL' }),
    setSelectedVariety: (variety) => set({ selectedVariety: variety }),
});
