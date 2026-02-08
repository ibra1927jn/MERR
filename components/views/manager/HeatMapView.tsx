import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Picker } from '../../../types';

interface HeatMapViewProps {
    bucketRecords: any[];
    crew: Picker[];
    blockName: string;
    rows?: number;
    onRowClick?: (rowNumber: number) => void;
}

const HeatMapView: React.FC<HeatMapViewProps> = ({ bucketRecords, crew, blockName, rows = 20, onRowClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Layer visibility state
    const [showPickers, setShowPickers] = useState(true);
    const [showBins, setShowBins] = useState(true);
    const [showRoutes, setShowRoutes] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);

    // Color constants for tech theme
    const TECH_CYAN = '#00f0ff';
    const NEON_YELLOW = '#ffee00';
    const DANGER_PINK = '#ff2a6d';

    // Process Row Intensity Data
    const rowIntensity = useMemo(() => {
        const counts = new Array(rows).fill(0);
        let max = 1;

        bucketRecords.forEach(r => {
            const rowNum = r.row_number || (r.coords?.row) || 0;
            if (rowNum > 0 && rowNum <= rows) {
                counts[rowNum - 1]++;
            }
        });

        max = Math.max(...counts, 1);
        return { counts, max };
    }, [bucketRecords, rows]);

    // Process Picker Positions
    const pickerPositions = useMemo(() => {
        return crew
            .filter(p => p.current_row && p.current_row > 0 && p.current_row <= rows)
            .map(p => ({
                row: p.current_row,
                name: p.name,
                buckets: p.total_buckets_today || 0
            }));
    }, [crew, rows]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const rowHeight = height / rows;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw blueprint background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        // Draw tech grid (40px)
        drawTechGrid(ctx, width, height);

        // Draw horizontal row lines (data lines)
        drawDataLines(ctx, width, height, rowHeight, rowIntensity, rows);

        // Draw picker dots if enabled
        if (showPickers) {
            drawPickerDots(ctx, width, rowHeight, pickerPositions);
        }

        // Draw bins if enabled
        if (showBins) {
            drawBinMarkers(ctx, width, rowHeight, rowIntensity.counts, rows);
        }

        // Draw routes if enabled
        if (showRoutes) {
            drawRoutes(ctx, width, height);
        }

        // Draw legend
        drawLegend(ctx, width, height);

    }, [rowIntensity, rows, pickerPositions, showPickers, showBins, showRoutes]);

    const drawTechGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y <= height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    };

    const drawDataLines = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        rowHeight: number,
        data: { counts: number[], max: number },
        rowCount: number
    ) => {
        for (let i = 0; i < rowCount; i++) {
            const y = i * rowHeight + rowHeight / 2;
            const density = data.counts[i];
            const intensity = density / data.max;

            // Draw horizontal line for each row
            ctx.strokeStyle = intensity > 0
                ? `rgba(0, 240, 255, ${0.3 + intensity * 0.5})`
                : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = intensity > 0 ? 2 : 1;

            if (intensity > 0) {
                ctx.shadowColor = TECH_CYAN;
                ctx.shadowBlur = 8;
            }

            ctx.beginPath();
            ctx.moveTo(60, y);
            ctx.lineTo(width - 40, y);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Row number label
            ctx.fillStyle = intensity > 0.5 ? TECH_CYAN : 'rgba(255, 255, 255, 0.4)';
            ctx.font = 'bold 10px JetBrains Mono, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`R${String(i + 1).padStart(2, '0')}`, 50, y + 3);

            // Bucket count
            if (density > 0) {
                ctx.fillStyle = TECH_CYAN;
                ctx.textAlign = 'right';
                ctx.font = 'bold 9px JetBrains Mono, monospace';
                ctx.fillText(`${density}`, width - 10, y + 3);
            }
        }
    };

    const drawPickerDots = (
        ctx: CanvasRenderingContext2D,
        width: number,
        rowHeight: number,
        pickers: { row: number, name: string, buckets: number }[]
    ) => {
        const pickersByRow: Record<number, typeof pickers> = {};
        pickers.forEach(p => {
            if (!pickersByRow[p.row]) pickersByRow[p.row] = [];
            pickersByRow[p.row].push(p);
        });

        Object.entries(pickersByRow).forEach(([rowStr, rowPickers]) => {
            const row = parseInt(rowStr);
            const y = (row - 1) * rowHeight + rowHeight / 2;
            const spacing = Math.min(25, (width - 150) / (rowPickers.length + 1));

            rowPickers.forEach((picker, index) => {
                const x = 80 + (index + 1) * spacing;

                // Outer glow
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
                ctx.fill();

                // Inner dot
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = TECH_CYAN;
                ctx.shadowColor = TECH_CYAN;
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        });
    };

    const drawBinMarkers = (
        ctx: CanvasRenderingContext2D,
        width: number,
        rowHeight: number,
        counts: number[],
        rowCount: number
    ) => {
        // Place bins at rows with high activity
        counts.forEach((count, i) => {
            if (count >= 5) {
                const y = i * rowHeight + rowHeight / 2;
                const x = width - 60;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.PI / 4);
                ctx.fillStyle = NEON_YELLOW;
                ctx.shadowColor = NEON_YELLOW;
                ctx.shadowBlur = 8;
                ctx.fillRect(-4, -4, 8, 8);
                ctx.restore();
            }
        });
    };

    const drawRoutes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = DANGER_PINK;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.shadowColor = DANGER_PINK;
        ctx.shadowBlur = 4;

        // Simulated route path
        ctx.beginPath();
        ctx.moveTo(80, height - 50);
        ctx.lineTo(80, 50);
        ctx.lineTo(width - 80, 50);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    };

    const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const legendY = height - 30;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, legendY, width, 30);

        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'left';

        // Picker legend
        ctx.beginPath();
        ctx.arc(15, legendY + 15, 4, 0, Math.PI * 2);
        ctx.fillStyle = TECH_CYAN;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('PICKER', 25, legendY + 18);

        // Bin legend
        ctx.save();
        ctx.translate(90, legendY + 15);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = NEON_YELLOW;
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('BIN', 100, legendY + 18);

        // Route legend
        ctx.strokeStyle = DANGER_PINK;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(140, legendY + 15);
        ctx.lineTo(160, legendY + 15);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('ROUTE', 165, legendY + 18);
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#050505]">
            {/* Scan Line Animation */}
            <div className="scan-line" />

            {/* Header overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/90 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00f0ff] pulse-dot" />
                            <span className="font-mono-tech text-[10px] text-[#00f0ff] blink-neon">SYS.ONLINE</span>
                        </div>
                        <h3 className="text-white font-bold text-sm mt-1 font-mono-tech">{blockName}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="font-mono-tech text-[9px] text-gray-500 block">SCANS</span>
                            <span className="font-mono-tech text-lg text-[#00f0ff] font-bold">{bucketRecords.length}</span>
                        </div>
                        {/* Layer Toggle Button */}
                        <button
                            onClick={() => setShowDrawer(!showDrawer)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-[#00f0ff]/30 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[#00f0ff] text-sm">layers</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Layer Drawer Panel */}
            {showDrawer && (
                <div className="absolute top-16 right-3 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border border-[#00f0ff]/30 rounded-lg p-3 w-40">
                    <h4 className="font-mono-tech text-[10px] text-gray-500 mb-2 uppercase">Layers</h4>

                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showPickers}
                            onChange={(e) => setShowPickers(e.target.checked)}
                            className="w-3 h-3 accent-[#00f0ff]"
                        />
                        <span className="font-mono-tech text-xs text-white">Pickers</span>
                        <span className="w-2 h-2 rounded-full bg-[#00f0ff] ml-auto" />
                    </label>

                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showBins}
                            onChange={(e) => setShowBins(e.target.checked)}
                            className="w-3 h-3 accent-[#ffee00]"
                        />
                        <span className="font-mono-tech text-xs text-white">Bins</span>
                        <span className="w-2 h-2 bg-[#ffee00] rotate-45 ml-auto" />
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showRoutes}
                            onChange={(e) => setShowRoutes(e.target.checked)}
                            className="w-3 h-3 accent-[#ff2a6d]"
                        />
                        <span className="font-mono-tech text-xs text-white">Routes</span>
                        <span className="w-4 h-0.5 bg-[#ff2a6d] ml-auto" style={{ borderStyle: 'dashed' }} />
                    </label>
                </div>
            )}

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                width={400}
                height={800}
                className="w-full h-full object-cover cursor-crosshair"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const row = Math.floor(y / (rect.height / rows)) + 1;
                    if (row > 0 && row <= rows) {
                        onRowClick && onRowClick(row);
                    }
                }}
            />

            {/* Stats footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-[#00f0ff]/20 px-3 py-2 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div>
                        <span className="font-mono-tech text-[8px] text-gray-500 block">PICKERS</span>
                        <span className="font-mono-tech text-sm text-white">{crew.filter(c => c.current_row > 0).length}</span>
                    </div>
                    <div>
                        <span className="font-mono-tech text-[8px] text-gray-500 block">ROWS</span>
                        <span className="font-mono-tech text-sm text-white">{rows}</span>
                    </div>
                </div>
                <div className="font-mono-tech text-[8px] text-gray-600">
                    LAT -41.2865 | LON 174.7762
                </div>
            </div>
        </div>
    );
};

export default HeatMapView;
