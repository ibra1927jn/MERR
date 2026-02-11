import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
         
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleClearCache = () => {
        // SAFE CLEAR: Preserve unsynced bucket data before nuking storage
        try {
            const storeData = localStorage.getItem('harvest-pro-storage');
            const authKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
            const authBackup: Record<string, string> = {};
            authKeys.forEach(k => { authBackup[k] = localStorage.getItem(k) || ''; });

            localStorage.clear();
            sessionStorage.clear();

            // Restore critical data
            if (storeData) localStorage.setItem('harvest-pro-storage', storeData);
            Object.entries(authBackup).forEach(([k, v]) => localStorage.setItem(k, v));
        } catch {
            // Last resort: full clear if backup fails
            localStorage.clear();
            sessionStorage.clear();
        }

        // Clear service worker caches (these are safe to nuke)
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => {
                    caches.delete(name);
                });
            });
        }

        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl text-red-600">error</span>
                        </div>

                        <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-500 mb-6">
                            The application encountered an unexpected error.
                        </p>

                        <div className="bg-gray-100 rounded-lg p-3 mb-6 text-left overflow-auto max-h-32">
                            <code className="text-xs text-red-500 font-mono break-all">
                                {this.state.error?.toString()}
                            </code>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={this.handleReload}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                            >
                                Reload Application
                            </button>

                            <button
                                onClick={this.handleClearCache}
                                className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">delete_history</span>
                                Clear Cache & Reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;