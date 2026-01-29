import React, { useEffect } from 'react';

export interface BaseModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className="bg-white rounded-3xl p-6 w-[90%] max-w-md shadow-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          {title && <h3 className="text-xl font-black text-gray-900">{title}</h3>}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-6">
          {children}
        </div>

        {footer && (
          <div className="pt-4 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
