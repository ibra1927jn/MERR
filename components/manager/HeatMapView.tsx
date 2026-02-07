/**
 * Heat Map View Component
 * Canvas-based visualization of picker activity by coordinates
 */
import React, { useRef, useEffect, useState } from 'react';
import { BucketRecord, Picker } from '../../types';

interface HeatMapViewProps {
    bucketRecords: BucketRecord[];
    crew: Picker[];
    blockName?: string;
    rows?: number;
}

interface HeatPoint {
    x: number;
    y: number;
    intensity: number;
    pickerId: string;
    buckets: number;
}

const HeatMapView: React.FC<HeatMapViewProps> = ({
    bucketRecords,
    crew,
    blockName = 'Block A',
    rows = 20,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedPoint, setSelectedPoint] = useState<HeatPoint | null>(null);
    const [filter, setFilter] = useState<'all' | 'high' | 'low'>('all');
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Generate heat points from bucket records
    const generateHeatPoints = (): HeatPoint[] => {
        // If we have real coordinates, use them
        const pointsWithCoords = bucketRecords.filter(r => r.coords);

        if (pointsWithCoords.length > 0) {
            return pointsWithCoords.map(record => ({
                x: record.coords!.lng,
                y: record.coords!.lat,
                intensity: Math.min(1, (record.bucket_count || 1) / 20),
                pickerId: record.pickerId,
                buckets: record.bucket_count || 1,
            }));
        }

        // Generate simulated data based on row assignments
        const points: HeatPoint[] = [];
        crew.forEach((picker, idx) => {
            const rowNum = picker.current_row || (idx % rows) + 1;
            const buckets = picker.total_buckets_today;

            // Distribute buckets along the row
            const numPoints = Math.ceil(buckets / 5);
            for (let i = 0; i < numPoints; i++) {
                points.push({
                    x: 0.1 + (i / numPoints) * 0.8 + Math.random() * 0.05,
                    y: (rowNum / rows) * 0.9 + 0.05 + Math.random() * 0.02,
                    intensity: Math.min(1, (buckets / crew.length) / 10),
                    pickerId: picker.id,
                    buckets: Math.floor(buckets / numPoints),
                });
            }
        });

        return points;
    };

    // Draw heat map on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = Math.max(300, width * 0.6);

        canvas.width = width * 2; // Retina
        canvas.height = height * 2;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        setDimensions({ width, height });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(2, 2);

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Draw grid (rows)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= rows; i++) {
            const y = (i / rows) * height * 0.9 + height * 0.05;
            ctx.beginPath();
            ctx.moveTo(width * 0.05, y);
            ctx.lineTo(width * 0.95, y);
            ctx.stroke();

            // Row labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px sans-serif';
            ctx.fillText(`R${i}`, 5, y + 3);
        }

        // Get and filter heat points
        let points = generateHeatPoints();

        if (filter === 'high') {
            points = points.filter(p => p.intensity > 0.5);
        } else if (filter === 'low') {
            points = points.filter(p => p.intensity <= 0.3);
        }

        // Draw heat points
        points.forEach(point => {
            const x = point.x * width;
            const y = point.y * height;
            const radius = 15 + point.intensity * 20;

            // Create radial gradient for heat effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

            // Color based on intensity (green -> yellow -> red)
            if (point.intensity < 0.3) {
                gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
                gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
            } else if (point.intensity < 0.6) {
                gradient.addColorStop(0, 'rgba(250, 204, 21, 0.8)');
                gradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
            } else {
                gradient.addColorStop(0, 'rgba(217, 30, 54, 0.8)');
                gradient.addColorStop(1, 'rgba(217, 30, 54, 0)');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw block label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(blockName, width / 2 - 30, 20);

    }, [bucketRecords, crew, filter, rows, blockName]);

    // Handle canvas click for point selection
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / dimensions.width;
        const y = (e.clientY - rect.top) / dimensions.height;

        const points = generateHeatPoints();
        const clickedPoint = points.find(p =>
            Math.abs(p.x - x) < 0.05 && Math.abs(p.y - y) < 0.05
        );

        setSelectedPoint(clickedPoint || null);
    };

    // Get picker name from ID
    const getPickerName = (pickerId: string) => {
        const picker = crew.find(p => p.id === pickerId);
        return picker?.name || 'Unknown';
    };

    // Calculate stats
    const totalBuckets = crew.reduce((sum, p) => sum + p.total_buckets_today, 0);
    const avgPerPicker = crew.length > 0 ? Math.round(totalBuckets / crew.length) : 0;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl text-[#d91e36]">
                            heat_pump
                        </span>
                        <div>
                            <h2 className="text-lg font-bold">Activity Heat Map</h2>
                            <p className="text-xs text-gray-400">{blockName} • {rows} rows</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black">{totalBuckets}</p>
                        <p className="text-xs text-gray-400">total buckets</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {(['all', 'high', 'low'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f
                                ? 'bg-[#d91e36] text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {f === 'all' ? 'All Activity' : f === 'high' ? 'High Density' : 'Low Density'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="bg-[#1a1a2e] rounded-2xl overflow-hidden shadow-lg">
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="cursor-crosshair w-full"
                />
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Legend</h3>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                        <span className="text-xs text-gray-600">Low ({"<"}5 buckets)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500" />
                        <span className="text-xs text-gray-600">Medium (5-15)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#d91e36]" />
                        <span className="text-xs text-gray-600">High ({">"}15)</span>
                    </div>
                </div>
            </div>

            {/* Selected Point Info */}
            {selectedPoint && (
                <div className="bg-[#d91e36]/10 border border-[#d91e36]/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">{getPickerName(selectedPoint.pickerId)}</p>
                            <p className="text-sm text-gray-600">
                                {selectedPoint.buckets} buckets at this location
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedPoint(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center">
                    <p className="text-2xl font-black text-gray-900">{crew.length}</p>
                    <p className="text-xs text-gray-500">Active Pickers</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center">
                    <p className="text-2xl font-black text-gray-900">{avgPerPicker}</p>
                    <p className="text-xs text-gray-500">Avg/Picker</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center">
                    <p className="text-2xl font-black text-[#d91e36]">{rows}</p>
                    <p className="text-xs text-gray-500">Total Rows</p>
                </div>
            </div>

            {/* Top Performers in Block */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Top in This Block</h3>
                {crew
                    .sort((a, b) => b.total_buckets_today - a.total_buckets_today)
                    .slice(0, 3)
                    .map((picker, i) => (
                        <div key={picker.id} className="flex items-center gap-3 py-2">
                            <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-orange-600'
                                }`}>
                                #{i + 1}
                            </span>
                            <div className="size-8 rounded-full bg-[#d91e36] text-white flex items-center justify-center text-sm font-bold">
                                {picker.avatar}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{picker.name}</p>
                                <p className="text-xs text-gray-500">Row {picker.current_row || '-'}</p>
                            </div>
                            <p className="text-lg font-bold text-[#d91e36]">{picker.total_buckets_today}</p>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default HeatMapView;
