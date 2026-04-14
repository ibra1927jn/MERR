/**
 * components/primitives/EntityId.tsx
 * Muestra un ID (UUID u otro) truncado a N chars + ellipsis + botón copiar.
 *
 * - Tooltip `title` expone el ID completo al hover.
 * - Click en el botón copia al clipboard y muestra "Copiado ✓" 1.5s.
 * - Accesible: aria-label dinámico en el botón.
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/i18n';

interface EntityIdProps {
    id: string;
    /** Caracteres a mostrar antes del ellipsis (default: 6) */
    chars?: number;
    className?: string;
}

const EntityId: React.FC<EntityIdProps> = ({ id, chars = 6, className = '' }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {
            // clipboard no disponible (HTTP o permisos denegados)
        });
    }, [id]);

    const display = id.length > chars ? `${id.substring(0, chars)}…` : id;

    return (
        <span
            className={`inline-flex items-center gap-1 font-mono ${className}`}
            title={id}
            data-testid="entity-id"
        >
            <span className="text-[10px] text-slate-500 select-all">{display}</span>

            <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? t('common.copied') : t('common.copy')}
                className="flex items-center transition-all"
                data-testid="entity-id-copy-btn"
            >
                {copied ? (
                    <span
                        className="text-[10px] font-semibold text-green-600 whitespace-nowrap"
                        data-testid="entity-id-copied"
                    >
                        ✓ {t('common.copied')}
                    </span>
                ) : (
                    <span
                        className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600"
                        aria-hidden="true"
                    >
                        content_copy
                    </span>
                )}
            </button>
        </span>
    );
};

export default EntityId;
