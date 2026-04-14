import React from 'react';

interface ClickableRowProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

const ClickableRow: React.FC<ClickableRowProps> = ({ onClick, children, className = '', disabled = false }) => (
    <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onClick}
        onKeyDown={disabled ? undefined : (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
        aria-disabled={disabled}
        className={`cursor-pointer rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:ring-offset-1 transition-colors duration-150 ${disabled ? 'opacity-50 cursor-default' : ''} ${className}`}
    >
        {children}
    </div>
);

export default ClickableRow;
