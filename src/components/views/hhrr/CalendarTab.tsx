/**
 * CalendarTab.tsx — HR Calendar & Scheduling
 *
 * Today's schedule ahora se deriva de harvest_settings.shift_start_time /
 * shift_end_time (useOrchardSchedule). Rest breaks cada 2h + meal break
 * a las 4h según Employment Relations Act 2000.
 *
 * Upcoming Leave sigue placeholder — la tabla leave_requests no existe
 * aún (deuda técnica anotada en PROGRESS.md).
 */
import React from 'react';
import { useOrchardSchedule } from '@/hooks/useOrchardSchedule';

const UPCOMING_LEAVE_PLACEHOLDER = [
    { name: 'Aroha W.', type: 'Annual Leave', dates: 'Feb 17-21', status: 'approved' },
    { name: 'Mateo S.', type: 'Sick Leave', dates: 'Feb 14', status: 'pending' },
];

const CalendarTab: React.FC = () => {
    const { schedule, isFallback } = useOrchardSchedule();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preview Banner */}
            {isFallback && (
                <div
                    data-testid="calendar-fallback-banner"
                    className="lg:col-span-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-amber-600">construction</span>
                    <p className="text-sm font-medium text-amber-800">
                        Orchard settings incompletos — mostrando horario por defecto 07:00-17:00.
                        Configúralo en Settings → Shift Hours para ver el schedule real.
                    </p>
                </div>
            )}

            {/* Today's Schedule — derivado de harvest_settings */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-border-light">
                <h3 className="font-bold text-text-primary mb-4">Today's Schedule</h3>
                {schedule.length === 0 ? (
                    <p className="text-sm text-text-muted">
                        No schedule configurado — revisa shift_start_time/shift_end_time en settings.
                    </p>
                ) : (
                    <div data-testid="calendar-schedule" className="space-y-1">
                        {schedule.map((item, i) => (
                            <div
                                key={`${item.kind}-${item.time}-${i}`}
                                data-testid={`schedule-${item.kind}`}
                                className="flex items-center gap-3 py-2.5 border-b border-border-light last:border-0"
                            >
                                <span className="text-xs font-mono text-text-muted w-12">{item.time}</span>
                                <span className={`material-symbols-outlined text-lg ${item.color}`}>{item.icon}</span>
                                <span className="text-sm text-text-primary font-medium">{item.event}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming Leave — placeholder hasta que exista schema leave_requests */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-border-light">
                <h3 className="font-bold text-text-primary mb-4">Upcoming Leave</h3>
                <p className="mb-3 text-xs text-text-muted">
                    Preview — schema leave_requests pendiente.
                </p>
                <div className="space-y-1">
                    {UPCOMING_LEAVE_PLACEHOLDER.map((leave, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-2.5 border-b border-border-light last:border-0"
                        >
                            <div>
                                <p className="text-sm font-bold text-text-primary">{leave.name}</p>
                                <p className="text-xs text-text-secondary">
                                    {leave.type} • {leave.dates}
                                </p>
                            </div>
                            <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    leave.status === 'approved'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                }`}
                            >
                                {leave.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CalendarTab;
