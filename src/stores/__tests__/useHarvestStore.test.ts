import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHarvestStore } from '../useHarvestStore';

/**
 * FASE 9: Unit Tests - useHarvestStore
 * 
 * Critical tests for Phase 9 functionality:
 * - Offline attendance validation
 * - Clock skew detection
 * - Archived picker exclusion
 * - Soft delete behavior
 * - Payroll calculations
 */

// Mock Supabase
vi.mock('@/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({ data: [], error: null })),
            insert: vi.fn(() => ({ data: [], error: null })),
            update: vi.fn(() => ({ data: [], error: null })),
            delete: vi.fn(() => ({ data: [], error: null })),
            eq: vi.fn(() => ({ data: [], error: null })),
        })),
        channel: vi.fn(() => ({
            on: vi.fn(() => ({ subscribe: vi.fn() })),
            subscribe: vi.fn(),
        })),
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
    },
}));

describe('useHarvestStore - Phase 9 Validations', () => {
    beforeEach(() => {
        // Reset store state before each test
        const { result } = renderHook(() => useHarvestStore());
        act(() => {
            result.current.reset();
        });
    });

    describe('addBucket - Attendance Validation', () => {
        it('rejects bucket if picker not checked in', () => {
            const { result } = renderHook(() => useHarvestStore());

            // Setup crew with unchecked picker
            act(() => {
                result.current.crew = [{
                    id: 'picker-001',
                    name: 'Test Picker',
                    status: 'active',
                    checked_in_today: false, // NOT checked in
                    picker_id: 'TP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                }];
            });

            const initialBucketCount = result.current.buckets.length;

            // Attempt to add bucket
            act(() => {
                result.current.addBucket({
                    picker_id: 'picker-001',
                    orchard_id: 'orchard-001',
                    row_number: 1,
                    quality_grade: 'premium',
                    bin_id: null,
                    scanned_by: 'runner-001',
                    scanned_at: new Date().toISOString(),
                });
            });

            // Bucket should NOT be added
            expect(result.current.buckets.length).toBe(initialBucketCount);
        });

        it('accepts bucket if picker checked in', () => {
            const { result } = renderHook(() => useHarvestStore());

            // Setup crew with checked-in picker
            act(() => {
                result.current.crew = [{
                    id: 'picker-002',
                    name: 'Checked Picker',
                    status: 'active',
                    checked_in_today: true, // CHECKED IN
                    check_in_time: new Date().toISOString(),
                    picker_id: 'CP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                }];
                result.current.clockSkew = 0; // No clock issues
            });

            const initialBucketCount = result.current.buckets.length;

            // Add bucket
            act(() => {
                result.current.addBucket({
                    picker_id: 'picker-002',
                    orchard_id: 'orchard-001',
                    row_number: 1,
                    quality_grade: 'premium',
                    bin_id: null,
                    scanned_by: 'runner-001',
                    scanned_at: new Date().toISOString(),
                });
            });

            // Bucket SHOULD be added
            expect(result.current.buckets.length).toBe(initialBucketCount + 1);
        });

        it('rejects bucket if picker archived', () => {
            const { result } = renderHook(() => useHarvestStore());

            // Setup crew with archived picker
            act(() => {
                result.current.crew = [{
                    id: 'picker-003',
                    name: 'Archived Picker',
                    status: 'archived', // ARCHIVED
                    checked_in_today: true,
                    picker_id: 'AP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                    archived_at: new Date().toISOString(),
                }];
            });

            const initialBucketCount = result.current.buckets.length;

            // Attempt to add bucket
            act(() => {
                result.current.addBucket({
                    picker_id: 'picker-003',
                    orchard_id: 'orchard-001',
                    row_number: 1,
                    quality_grade: 'premium',
                    bin_id: null,
                    scanned_by: 'runner-001',
                    scanned_at: new Date().toISOString(),
                });
            });

            // Bucket should NOT be added
            expect(result.current.buckets.length).toBe(initialBucketCount);
        });
    });

    describe('addBucket - Timestamp Validation', () => {
        it('rejects bucket if clock skew > 5 minutes', () => {
            const { result } = renderHook(() => useHarvestStore());

            // Setup checked-in picker with clock skew
            act(() => {
                result.current.crew = [{
                    id: 'picker-004',
                    name: 'Skew Picker',
                    status: 'active',
                    checked_in_today: true,
                    picker_id: 'SP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                }];
                result.current.clockSkew = 10 * 60 * 1000; // 10 minutes skew
            });

            const initialBucketCount = result.current.buckets.length;

            // Attempt to add bucket
            act(() => {
                result.current.addBucket({
                    picker_id: 'picker-004',
                    orchard_id: 'orchard-001',
                    row_number: 1,
                    quality_grade: 'premium',
                    bin_id: null,
                    scanned_by: 'runner-001',
                    scanned_at: new Date().toISOString(),
                });
            });

            // Bucket should NOT be added
            expect(result.current.buckets.length).toBe(initialBucketCount);
        });

        it('accepts bucket if clock skew < 5 minutes', () => {
            const { result } = renderHook(() => useHarvestStore());

            act(() => {
                result.current.crew = [{
                    id: 'picker-005',
                    name: 'Normal Picker',
                    status: 'active',
                    checked_in_today: true,
                    picker_id: 'NP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                }];
                result.current.clockSkew = 2 * 60 * 1000; // 2 minutes skew (OK)
            });

            const initialBucketCount = result.current.buckets.length;

            // Add bucket
            act(() => {
                result.current.addBucket({
                    picker_id: 'picker-005',
                    orchard_id: 'orchard-001',
                    row_number: 1,
                    quality_grade: 'premium',
                    bin_id: null,
                    scanned_by: 'runner-001',
                    scanned_at: new Date().toISOString(),
                });
            });

            // Bucket SHOULD be added
            expect(result.current.buckets.length).toBe(initialBucketCount + 1);
        });
    });

    describe('recalculateIntelligence - Payroll Calculations', () => {
        it('excludes archived pickers from payroll', () => {
            const { result } = renderHook(() => useHarvestStore());

            // Setup crew with active and archived pickers
            act(() => {
                result.current.crew = [
                    {
                        id: 'picker-active',
                        name: 'Active Picker',
                        status: 'active',
                        total_buckets_today: 10,
                        hours: 4,
                        picker_id: 'AP001',
                        orchard_id: 'orchard-001',
                        team_leader_id: null,
                        checked_in_today: true,
                    },
                    {
                        id: 'picker-archived',
                        name: 'Archived Picker',
                        status: 'archived', // Should be excluded
                        total_buckets_today: 20,
                        hours: 4,
                        picker_id: 'AR001',
                        orchard_id: 'orchard-001',
                        team_leader_id: null,
                        checked_in_today: false,
                        archived_at: new Date().toISOString(),
                    },
                ];
                result.current.settings = {
                    piece_rate: 5.00,
                    min_wage_rate: 23.15,
                    bin_size: 18,
                    target_buckets_per_hour: 5,
                };
            });

            // Recalculate payroll
            act(() => {
                result.current.recalculateIntelligence();
            });

            // Only active picker should be included
            // Active: 10 buckets × $5 = $50 piece
            // Minimum: 4 hrs × $23.15 = $92.60
            // Supplement: $92.60 - $50 = $42.60
            // Total: $92.60

            expect(result.current.payroll.totalPiece).toBe(50);
            expect(result.current.payroll.totalMinimum).toBeCloseTo(42.60, 2);
            expect(result.current.payroll.finalTotal).toBeCloseTo(92.60, 2);
        });

        it('calculates correct minimum wage supplement', () => {
            const { result } = renderHook(() => useHarvestStore());

            act(() => {
                result.current.crew = [{
                    id: 'picker-low',
                    name: 'Low Productivity',
                    status: 'active',
                    total_buckets_today: 10,
                    hours: 4,
                    picker_id: 'LP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    checked_in_today: true,
                }];
                result.current.settings = {
                    piece_rate: 5.00,
                    min_wage_rate: 23.15,
                    bin_size: 18,
                    target_buckets_per_hour: 5,
                };
            });

            act(() => {
                result.current.recalculateIntelligence();
            });

            // 10 buckets × $5 = $50 piece
            // 4 hours × $23.15 = $92.60 minimum
            // Supplement = $92.60 - $50 = $42.60
            expect(result.current.payroll.totalMinimum).toBeCloseTo(42.60, 2);
        });

        it('no supplement needed when above minimum wage', () => {
            const { result } = renderHook(() => useHarvestStore());

            act(() => {
                result.current.crew = [{
                    id: 'picker-high',
                    name: 'High Productivity',
                    status: 'active',
                    total_buckets_today: 25,
                    hours: 4,
                    picker_id: 'HP001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    checked_in_today: true,
                }];
                result.current.settings = {
                    piece_rate: 5.00,
                    min_wage_rate: 23.15,
                    bin_size: 18,
                    target_buckets_per_hour: 5,
                };
            });

            act(() => {
                result.current.recalculateIntelligence();
            });

            // 25 buckets × $5 = $125 piece
            // 4 hours × $23.15 = $92.60 minimum
            // No supplement needed
            expect(result.current.payroll.totalPiece).toBe(125);
            expect(result.current.payroll.totalMinimum).toBe(0);
            expect(result.current.payroll.finalTotal).toBe(125);
        });
    });

    describe('removePicker - Soft Delete', () => {
        it('soft deletes picker (UPDATE not DELETE)', async () => {
            const { result } = renderHook(() => useHarvestStore());

            // Mock Supabase update
            const mockUpdate = vi.fn(() => Promise.resolve({ data: {}, error: null }));
            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
                eq: vi.fn(() => ({ data: {}, error: null })),
            } as any);

            act(() => {
                result.current.crew = [{
                    id: 'picker-delete',
                    name: 'To Archive',
                    status: 'active',
                    picker_id: 'DA001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                    checked_in_today: false,
                }];
            });

            // Remove picker
            await act(async () => {
                await result.current.removePicker('picker-delete');
            });

            // Verify UPDATE was called (not DELETE)
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'archived',
                    archived_at: expect.any(String),
                })
            );
        });

        it('sets archived_at timestamp', async () => {
            const { result } = renderHook(() => useHarvestStore());

            act(() => {
                result.current.crew = [{
                    id: 'picker-timestamp',
                    name: 'Timestamp Test',
                    status: 'active',
                    picker_id: 'TT001',
                    orchard_id: 'orchard-001',
                    team_leader_id: null,
                    total_buckets_today: 0,
                    checked_in_today: false,
                }];
                result.current.orchard = { id: 'orchard-001', name: 'Test Orchard' };
            });

            await act(async () => {
                await result.current.removePicker('picker-timestamp');
            });

            // Verify local state updated with archived_at
            const archivedPicker = result.current.crew.find(p => p.id === 'picker-timestamp');
            expect(archivedPicker?.status).toBe('archived');
            expect(archivedPicker?.archived_at).toBeDefined();
        });
    });
});
