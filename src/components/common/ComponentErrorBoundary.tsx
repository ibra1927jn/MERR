/**
 * ComponentErrorBoundary.tsx — Inline Error Boundary for Widgets
 * 
 * Unlike the full-page ErrorBoundary, this renders an inline fallback card
 * so a single broken component doesn't take down the entire page.
 * Wrap analytics charts, cost views, and any component that processes
 * complex data that could throw (division by zero, null refs, etc).
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Friendly name shown in the fallback UI */
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ComponentErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            `[ComponentErrorBoundary] ${this.props.componentName || 'Component'} crashed:`,
            error,
            errorInfo
        );
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            const name = this.props.componentName || 'This section';
            return (
                <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
                    <div className="p-6 flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-2xl text-red-500">error_outline</span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-1">
                            {name} failed to load
                        </h4>
                        <p className="text-xs text-gray-400 mb-4 max-w-[250px]">
                            An unexpected error occurred. Other parts of the app are unaffected.
                        </p>

                        {/* Error detail (dev mode only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="w-full bg-gray-50 dark:bg-black/20 rounded-lg p-2 mb-4 text-left overflow-auto max-h-20">
                                <code className="text-[10px] text-red-500 font-mono break-all">
                                    {this.state.error.message}
                                </code>
                            </div>
                        )}

                        {/* Retry button */}
                        <button
                            onClick={this.handleRetry}
                            className="px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">refresh</span>
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ComponentErrorBoundary;
