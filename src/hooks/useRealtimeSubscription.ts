/**
 * useRealtimeSubscription.ts — Reusable Supabase Realtime Hook
 *
 * Generic hook that subscribes to a Supabase realtime channel
 * and calls a callback when changes arrive. Handles cleanup automatically.
 *
 * Usage:
 *   useRealtimeSubscription({
 *     channelName: `qc-${orchardId}`,
 *     table: 'qc_inspections',
 *     filter: `orchard_id=eq.${orchardId}`,
 *     event: 'INSERT',
 *     onPayload: (payload) => { ... },
 *     enabled: !!orchardId,
 *   });
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { logger } from '@/utils/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  /** Unique channel name */
  channelName: string;
  /** Supabase table to listen on */
  table: string;
  /** Optional row-level filter: `column=eq.value` */
  filter?: string;
  /** Postgres event type */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Callback on incoming payload */
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Enable/disable subscription (e.g. when orchardId is available) */
  enabled?: boolean;
}

export function useRealtimeSubscription({
  channelName,
  table,
  filter,
  event = '*',
  onPayload,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    logger.info(`[Realtime] Subscribing to ${table} on channel ${channelName}`);

    // Supabase .on('postgres_changes') tiene overloads con tipos literales exactos.
    // Como `event` es un union dinamico, TS no resuelve el overload correcto.
    // Casteamos el config como el overload de '*' (el mas amplio) via `unknown`.
    const channelConfig: unknown = {
      event,
      schema: 'public',
      table,
      ...(filter ? { filter } : {}),
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig as { event: '*'; schema: string; table: string; filter?: string },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          logger.info(`[Realtime] ${table} ${payload.eventType}:`, payload.new);
          onPayload(payload);
        }
      )
      .subscribe(status => {
        logger.info(`[Realtime] ${channelName} status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      logger.info(`[Realtime] Unsubscribing from ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // We intentionally only re-subscribe when key dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter, event, enabled]);
}
