/**
 * Edge Functions Repository — Supabase Edge Function invocation wrapper
 *
 * All calls go through gatewayService.withResilience() for automatic
 * retry with exponential backoff on 502/504/timeout errors.
 */
import { supabase } from '@/services/supabase';
import { gatewayService, GatewayOptions } from '@/services/gateway.service';

export const edgeFunctionsRepository = {
    /** Invoke a Supabase Edge Function with gateway resilience */
    async invoke<T = unknown>(
        functionName: string,
        body: Record<string, unknown>,
        options?: Partial<GatewayOptions>
    ): Promise<{ data: T | null; error: { message: string } | null }> {
        return gatewayService.withResilience(
            async () => {
                const { data, error } = await supabase.functions.invoke(functionName, { body });
                if (error) throw new Error(error.message || `Edge Function ${functionName} failed`);
                return { data: data as T | null, error: null };
            },
            { operationName: functionName, ...options }
        );
    },
};
