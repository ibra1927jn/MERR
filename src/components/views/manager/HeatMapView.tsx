import { useState, useEffect } from 'react';
import { useHarvestStore } from '@/stores/useHarvestStore';
import { analyticsService } from '@/services/analytics.service';
import { todayNZST, toNZST } from '@/utils/nzst';
import './HeatMapView.module.css';

type DateRange = 'today' | 'last7days';

interface RowDensity {
    row_number: number;
    total_buckets: number;
    unique_pickers: number;
    avg_buckets_per_picker: number;
    density_score: number;
    target_completion: number;
}

export const HeatMapView = () => {
    const [dateRange, setDateRange] = useState<DateRange>('today');
    const [rowDensities, setRowDensities] = useState<RowDensity[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBuckets: 0,
        rowsHarvested: 0,
        topRows: [] as number[],
        pendingRows: [] as number[]
    });

    const orchard = useHarvestStore(state => state.orchard);


    useEffect(() => {
        loadHistoricalData();
    }, [dateRange, orchard?.id]);

    const loadHistoricalData = async () => {
        setLoading(true);

        try {
            const today = todayNZST();
            const start = dateRange === 'today'
                ? today
                : toNZST(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)).split('T')[0];

            const analytics = await analyticsService.getRowDensity(
                orchard?.id || '',
                start,
                today,
                100 // Default target buckets per row
            );

            setRowDensities(analytics.density_by_row);
            setStats({
                totalBuckets: analytics.total_buckets,
                rowsHarvested: analytics.total_rows_harvested,
                topRows: analytics.top_rows,
                pendingRows: analytics.pending_rows
            });

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error loading heatmap data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRowColor = (density: RowDensity) => {
        if (density.target_completion >= 100) return '#22c55e'; // Verde - Completo
        if (density.target_completion >= 50) return '#eab308'; // Amarillo - Medio
        return '#ef4444'; // Rojo - Pendiente
    };

    const getRowOpacity = (density: RowDensity) => {
        // Base opacity + scaled by density score
        return 0.3 + (density.density_score / 100) * 0.7;
    };

    return (
        <div className="heatmap-container">
            {/* Header */}
            <div className="heatmap-header">
                <h2>ðŸ“Š HeatMap HistÃ³rico</h2>
                <p className="subtitle">AnÃ¡lisis de densidad por hilera</p>
            </div>

            {/* Date Range Selector */}
            <div className="date-range-selector">
                <button
                    className={dateRange === 'today' ? 'active' : ''}
                    onClick={() => setDateRange('today')}
                >
                    ðŸ“… Hoy
                </button>
                <button
                    className={dateRange === 'last7days' ? 'active' : ''}
                    onClick={() => setDateRange('last7days')}
                >
                    ðŸ“Š Ãšltimos 7 dÃ­as
                </button>
            </div>

            {/* Stats Summary */}
            <div className="heatmap-stats">
                <div className="stat-card">
                    <span className="stat-label">Total Buckets</span>
                    <span className="stat-value">{stats.totalBuckets}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Rows Activas</span>
                    <span className="stat-value">{stats.rowsHarvested}</span>
                </div>
                <div className="stat-card success">
                    <span className="stat-label">Completadas</span>
                    <span className="stat-value">{stats.topRows.length}</span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-label">Pendientes</span>
                    <span className="stat-value">{stats.pendingRows.length}</span>
                </div>
            </div>

            {/* Leyenda */}
            <div className="heatmap-legend">
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#22c55e' }}></div>
                    <span>Completado (â‰¥100% target)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#eab308' }}></div>
                    <span>En progreso (50-99% target)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#ef4444' }}></div>
                    <span>Pendiente (&lt;50% target)</span>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando anÃ¡lisis histÃ³rico...</p>
                </div>
            )}

            {/* Mapa */}
            {!loading && rowDensities.length > 0 && (
                <div className="heatmap-rows">
                    {rowDensities.map(density => (
                        <div
                            key={density.row_number}
                            className="heatmap-row"
                            style={{
                                backgroundColor: getRowColor(density),
                                opacity: getRowOpacity(density)
                            }}
                            title={`Row ${density.row_number}: ${density.total_buckets} buckets (${density.target_completion.toFixed(0)}% del target)`}
                        >
                            <div className="row-info">
                                <span className="row-number">Row {density.row_number}</span>
                                <span className="row-stats">
                                    {density.total_buckets} buckets â€¢ {density.unique_pickers} pickers
                                </span>
                            </div>

                            <div className="row-metrics">
                                <span className="metric">
                                    {density.avg_buckets_per_picker.toFixed(1)} avg/picker
                                </span>
                                <span className="metric completion">
                                    {density.target_completion.toFixed(0)}%
                                </span>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${Math.min(100, density.target_completion)}%`,
                                        backgroundColor: 'rgba(255,255,255,0.9)'
                                    }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && rowDensities.length === 0 && (
                <div className="empty-state">
                    <span className="material-symbols-outlined">grid_off</span>
                    <p>No hay datos de cosecha para este perÃ­odo</p>
                    <small>Los datos aparecerÃ¡n cuando se escaneen buckets</small>
                </div>
            )}
        </div>
    );
};
