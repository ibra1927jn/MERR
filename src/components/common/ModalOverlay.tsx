/**
 * ModalOverlay.tsx — Unified modal wrapper
 * 
 * Provides consistent backdrop, entrance animation, and close behavior.
 * Set `static` prop to prevent click-outside closing (for ScannerModal).
 */
import React, { useEffect, useCallback } from 'react';

interface ModalOverlayProps {
    children: React.ReactNode;
    onClose: () => void;
    /** If true, disables click-outside and Escape key closing */
    isStatic?: boolean;
    /** Max width class (default: max-w-lg) */
    maxWidth?: string;
}

const ModalOverlay: React.FC<ModalOverlayProps> = ({
    children,
    onClose,
    isStatic = false,
    maxWidth = 'max-w-lg',
}) => {
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isStatic) {
            onClose();
        }
    }, [onClose, isStatic]);

    useEffect(() => {
        document.addEventListener('keydown', handleEscape);
        // Prevent body scroll while modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [handleEscape]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (!isStatic && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div
                className={`w-full ${maxWidth} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden`}
            >
                {children}
            </div>
        </div>
    );
};

export default ModalOverlay;
