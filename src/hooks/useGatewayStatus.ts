/**
 * useGatewayStatus — React hook for gateway degradation UI notifications.
 *
 * Subscribes to gatewayService events and provides a toast-ready state
 * for showing "Conexión inestable" / "Conexión restaurada" messages.
 */
import { useState, useEffect, useCallback } from 'react';
import { gatewayService } from '@/services/gateway.service';

interface GatewayStatusState {
    /** Whether the gateway is currently degraded (retrying requests) */
    isDegraded: boolean;
    /** Current status message for display in toast */
    message: string | null;
    /** Toast type for UI styling */
    type: 'warning' | 'error' | 'success' | null;
}

export function useGatewayStatus() {
    const [status, setStatus] = useState<GatewayStatusState>({
        isDegraded: false,
        message: null,
        type: null,
    });

    const clearMessage = useCallback(() => {
        setStatus(prev => ({ ...prev, message: null, type: null }));
    }, []);

    useEffect(() => {
        const unsubscribe = gatewayService.onEvent((event) => {
            switch (event.type) {
                case 'degraded':
                    setStatus({ isDegraded: true, message: event.message, type: 'warning' });
                    break;
                case 'recovered':
                    setStatus({ isDegraded: false, message: event.message, type: 'success' });
                    // Auto-clear recovery message after 3s
                    setTimeout(() => {
                        setStatus(prev => prev.type === 'success' ? { ...prev, message: null, type: null } : prev);
                    }, 3000);
                    break;
                case 'error':
                    setStatus({ isDegraded: true, message: event.message, type: 'error' });
                    break;
            }
        });

        return unsubscribe;
    }, []);

    return { ...status, clearMessage };
}
