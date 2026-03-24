/**
 * useManagerActions — Extracted business logic from Manager.tsx
 *
 * Handles: user removal (online/offline), broadcasting, direct messaging, and data filtering.
 * Reduces the Manager orchestrator component from ~450 → ~300 LOC.
 */
import { useMemo, useCallback } from 'react';
import { useHarvestStore as useHarvest } from '@/stores/useHarvestStore';
import { useMessaging } from '@/context/MessagingContext';
import { userService } from '@/services/user.service';
import { db } from '@/services/db';
import { logger } from '@/utils/logger';

/**
 * Manager-specific action handlers extracted from the Manager page component.
 */
export function useManagerActions() {
  const {
    crew = [],
    inventory = [],
    orchard,
    settings,
    stats,
    presentCount,
    bucketRecords,
    fetchGlobalData,
    updateSettings,
    addPicker,
    removePicker,
    updatePicker,
    assignRow,
  } = useHarvest();

  const { sendBroadcast, sendMessage, getOrCreateConversation } = useMessaging();

  // ── Derived data ─────────────────────────────────────
  const activeRunners = useMemo(
    () => crew.filter(p => p.role === 'runner'),
    [crew]
  );

  const teamLeaders = useMemo(
    () => crew.filter(p => p.role === 'team_leader'),
    [crew]
  );

  const fullBins = useMemo(
    () => inventory.filter(b => b.status === 'full').length,
    [inventory]
  );

  const emptyBins = useMemo(
    () => inventory.filter(b => b.status === 'empty').length,
    [inventory]
  );

  const filteredBucketRecords = useMemo(() => {
    if (!bucketRecords) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return bucketRecords.filter(
      r => new Date(r.scanned_at || '').getTime() >= startOfDay.getTime()
    );
  }, [bucketRecords]);

  // ── Handlers ─────────────────────────────────────────

  /**
   * Remove a user from the orchard — supports offline queuing.
   */
  const handleRemoveUser = useCallback(async (userId: string) => {
    logger.debug('[Teams] onRemoveUser called', { userId });
    // Optimistic removal
    useHarvest.setState((state: { crew: typeof crew }) => ({
      crew: state.crew.filter(c => c.id !== userId),
      lastSyncAt: null,
    }));

    if (navigator.onLine) {
      try {
        await userService.unassignUserFromOrchard(userId);
        logger.debug('[Teams] User unlinked successfully');
        await fetchGlobalData();
      } catch (e) {
        logger.error('[Teams] Failed to unlink user:', e);
        await fetchGlobalData(); // Revert on failure
      }
    } else {
      logger.info('[Teams] Offline — queuing unlink for', userId);
      await db.sync_queue.put({
        id: `unlink-${userId}-${Date.now()}`,
        type: 'UNLINK',
        payload: { userId },
        timestamp: Date.now(),
        retryCount: 0,
      });
    }
  }, [fetchGlobalData]);

  /**
   * Send a broadcast message.
   */
  const handleBroadcast = useCallback(async (
    title: string,
    message: string,
    priority: 'normal' | 'high' | 'urgent'
  ) => {
    await sendBroadcast?.(title, message, priority);
  }, [sendBroadcast]);

  /**
   * Send a direct message to a user via messaging context.
   */
  const handleSendMessage = useCallback(async (recipientId: string, message: string) => {
    try {
      const conversationId = await getOrCreateConversation?.(recipientId);
      if (conversationId) {
        await sendMessage?.(conversationId, message, 'normal');
      }
    } catch (err) {
      logger.error('[Manager] Failed to send message:', err);
    }
  }, [getOrCreateConversation, sendMessage]);

  return {
    // Store data
    crew,
    orchard,
    settings,
    stats,
    presentCount,
    updateSettings,
    addPicker,
    removePicker,
    updatePicker,
    assignRow,
    fetchGlobalData,
    // Derived
    activeRunners,
    teamLeaders,
    fullBins,
    emptyBins,
    filteredBucketRecords,
    // Handlers
    handleRemoveUser,
    handleBroadcast,
    handleSendMessage,
  };
}
