import { db } from './db';

export const telemetryService = {
    async log(level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL', context: string, message: string, metadata?: any) {
        console.log(`[Telemetry][${level}] ${context}: ${message}`, metadata);

        try {
            await db.telemetry_logs.add({
                level,
                context,
                message,
                metadata,
                timestamp: Date.now(),
                synced: 0
            });
        } catch (e) {
            console.error("[Telemetry] Storage failed:", e);
        }
    },

    async error(context: string, message: string, error?: any) {
        return this.log('ERROR', context, message, error instanceof Error ? {
            msg: error.message,
            stack: error.stack
        } : error);
    },

    async critical(context: string, message: string, error?: any) {
        return this.log('CRITICAL', context, message, error);
    }
};
