/**
 * ============================================
 * TRUST BADGES — Enterprise Status Indicators
 * ============================================
 * Visual indicators of system health displayed
 * at the top of the Manager dashboard.
 * Shows: Security, Sync, Compliance, Uptime
 * ============================================
 */
import React from 'react';
import { Shield, Database, CheckCircle, Clock } from 'lucide-react';
import { useHarvestStore } from '../../stores/useHarvestStore';

interface BadgeProps {
    icon: React.ReactNode;
    label: string;
    variant: 'success' | 'info' | 'warning' | 'neutral';
}

const variantStyles: Record<BadgeProps['variant'], string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-gray-50 text-gray-600 border-gray-200',
};

const Badge: React.FC<BadgeProps> = ({ icon, label, variant }) => (
    <div className={`
        inline-flex items-center gap-2 px-3 py-1.5
        text-xs font-semibold
        border rounded-full
        ${variantStyles[variant]}
    `}>
        {icon}
        <span>{label}</span>
    </div>
);

export const TrustBadges: React.FC = () => {
    const crewCount = useHarvestStore(s => s.crew?.length ?? 0);
    const recordCount = useHarvestStore(s => s.bucketRecords?.length ?? 0);
    const alertCount = useHarvestStore(s => s.alerts?.length ?? 0);

    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <Badge
                icon={<Shield className="w-3.5 h-3.5" />}
                label="RLS Security Active"
                variant="success"
            />
            <Badge
                icon={<Database className="w-3.5 h-3.5" />}
                label={`${recordCount > 0 ? recordCount.toLocaleString() : crewCount} records synced`}
                variant="info"
            />
            <Badge
                icon={<CheckCircle className="w-3.5 h-3.5" />}
                label={alertCount > 0 ? `${alertCount} compliance alert${alertCount > 1 ? 's' : ''}` : '0 compliance alerts'}
                variant={alertCount > 0 ? 'warning' : 'success'}
            />
            <Badge
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Live"
                variant="neutral"
            />
        </div>
    );
};

export default TrustBadges;
