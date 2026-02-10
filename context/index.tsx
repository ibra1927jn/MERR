/**
 * Context Index - Combined provider wrapper and exports
 */
import React, { ReactNode, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { MessagingProvider, useMessaging } from './MessagingContext';
import { HarvestProvider, useHarvest } from './HarvestContext';

// Re-export all hooks
export { useAuth } from './AuthContext';
export { useMessaging } from './MessagingContext';
export { useHarvest, Role } from './HarvestContext';
export { supabase } from './AuthContext';

// Re-export types
export type { DBMessage, ChatGroup } from './MessagingContext';

/**
 * Combined Provider - Wraps all context providers
 */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <StartupErrorBoundary>
            <AuthProvider>
                <MessagingProvider>
                    <HarvestProvider>
                        <SyncContexts />
                        {children}
                    </HarvestProvider>
                </MessagingProvider>
            </AuthProvider>
        </StartupErrorBoundary>
    );
};

/**
 * StartupErrorBoundary - Catches initialization errors in contexts
 * and provides a recovery mechanism (cache clearing).
 */
class StartupErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[StartupErrorBoundary] CRITICAL STARTUP FAILURE:', error, errorInfo);
    }

    handleRecovery = () => {
        localStorage.clear();
        indexedDB.deleteDatabase('HarvestProDB');
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#050505] tech-grid flex items-center justify-center p-6 font-mono-tech">
                    <div className="max-w-md w-full neon-border bg-black/80 p-8 text-center tech-glow">
                        <div className="mb-6">
                            <span className="material-symbols-outlined text-danger-pink text-6xl pulse-dot">terminal</span>
                        </div>
                        <h1 className="text-tech-cyan text-xl font-black uppercase tracking-tighter mb-4">
                            System Startup Failed
                        </h1>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            A critical error occurred during initialization. This is likely due to a database schema mismatch.
                        </p>
                        <div className="bg-danger-pink/10 border border-danger-pink/30 p-4 mb-8 text-left overflow-auto max-h-32 rounded">
                            <code className="text-danger-pink text-[10px] break-all">
                                {this.state.error?.message}
                            </code>
                        </div>
                        <button
                            onClick={this.handleRecovery}
                            className="w-full bg-tech-cyan text-black font-black py-4 uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <span className="material-symbols-outlined">restart_alt</span>
                            Reinitialize System
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Internal component to sync context values between providers
 */
const SyncContexts: React.FC = () => {
    const { appUser, orchardId } = useAuth();
    const { setUserId, setOrchardId, refreshMessages } = useMessaging();

    useEffect(() => {
        if (appUser?.id) {
            setUserId(appUser.id);
        }
        if (orchardId) {
            setOrchardId(orchardId);
            refreshMessages();
        }
    }, [appUser?.id, orchardId]);

    return null;
};

export default AppProvider;
