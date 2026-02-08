import React, { useEffect, useRef, useMemo } from 'react';
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

    // Color constants for tech theme
    const TECH_CYAN = '#00f0ff';
    const NEON_YELLOW = '#ffee00';
    const DANGER_PINK = '#ff2a6d';
    const GRID_COLOR = 'rgba(0, 240, 255, 0.08)';

    // 1. Process Row Intensity Data
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

    // 2. Process Picker Positions
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

        // Draw row data lines
        drawDataLines(ctx, width, height, rowHeight, rowIntensity, rows);

        // Draw picker dots (pulsing cyan)
        drawPickerDots(ctx, width, rowHeight, pickerPositions);

        // Draw legend
        drawLegend(ctx, width, height);

    }, [rowIntensity, rows, pickerPositions]);

    const drawTechGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
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
            const y = i * rowHeight;
            const density = data.counts[i];
            const intensity = density / data.max;

            // Data line (horizontal bar based on intensity)
            const lineWidth = Math.max(60, intensity * (width - 80));

            // Glow effect for active rows
            if (intensity > 0) {
                ctx.shadowColor = TECH_CYAN;
                ctx.shadowBlur = 10 + (intensity * 15);
            }

            // Draw the data line
            ctx.fillStyle = intensity > 0
                ? `rgba(0, 240, 255, ${0.2 + intensity * 0.6})`
                : 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(60, y + rowHeight * 0.3, lineWidth, rowHeight * 0.4);

            ctx.shadowBlur = 0;

            // Row separator line
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Row number label
            ctx.fillStyle = intensity > 0.5 ? TECH_CYAN : 'rgba(255, 255, 255, 0.4)';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`R${String(i + 1).padStart(2, '0')}`, 50, y + rowHeight / 2 + 4);

            // Bucket count on right
            if (density > 0) {
                ctx.fillStyle = TECH_CYAN;
                ctx.textAlign = 'right';
                ctx.font = 'bold 10px JetBrains Mono, monospace';
                ctx.fillText(`${density}`, width - 15, y + rowHeight / 2 + 4);
            }
        }
    };

    const drawPickerDots = (
        ctx: CanvasRenderingContext2D,
        width: number,
        rowHeight: number,
        pickers: { row: number, name: string, buckets: number }[]
    ) => {
        // Group pickers by row
        const pickersByRow: Record<number, typeof pickers> = {};
        pickers.forEach(p => {
            if (!pickersByRow[p.row]) pickersByRow[p.row] = [];
            pickersByRow[p.row].push(p);
        });

        Object.entries(pickersByRow).forEach(([rowStr, rowPickers]) => {
            const row = parseInt(rowStr);
            const y = (row - 1) * rowHeight + rowHeight / 2;
            const spacing = Math.min(30, (width - 150) / (rowPickers.length + 1));

            rowPickers.forEach((picker, index) => {
                const x = 80 + (index + 1) * spacing;

                // Outer glow
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
                ctx.fill();

                // Inner dot
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = TECH_CYAN;
                ctx.shadowColor = TECH_CYAN;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Picker initial
                ctx.fillStyle = '#050505';
                ctx.font = 'bold 8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(picker.name.charAt(0).toUpperCase(), x, y + 3);
            });
        });
    };

    const drawLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const legendY = height - 35;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, legendY, width, 35);

        // Legend items
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'left';

        // Picker dot
        ctx.beginPath();
        ctx.arc(20, legendY + 17, 5, 0, Math.PI * 2);
        ctx.fillStyle = TECH_CYAN;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('PICKER', 30, legendY + 20);

        // Intensity bar
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.fillRect(90, legendY + 12, 20, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('DENSITY', 115, legendY + 20);

        // Bin marker (diamond)
        ctx.fillStyle = NEON_YELLOW;
        ctx.beginPath();
        ctx.moveTo(200, legendY + 12);
        ctx.lineTo(206, legendY + 17);
        ctx.lineTo(200, legendY + 22);
        ctx.lineTo(194, legendY + 17);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('BIN', 212, legendY + 20);
    };

    return (
        <div className="w-full h-full relative overflow-hidden scan-overlay">
            {/* Header overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00f0ff] pulse-dot" />
                            <span className="font-mono-tech text-xs text-[#00f0ff] blink-neon">SYS.ONLINE</span>
                        </div>
                        <h3 className="text-white font-bold text-sm mt-1">{blockName}</h3>
                    </div>
                    <div className="text-right">
                        <span className="font-mono-tech text-[10px] text-gray-500 block">SCANS TODAY</span>
                        <span className="font-mono-tech text-lg text-[#00f0ff] font-bold">{bucketRecords.length}</span>
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                width={400}
                height={800}
                className="w-full h-full object-cover cursor-crosshair active:cursor-grabbing"
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
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-[#00f0ff]/20 px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div>
                        <span className="font-mono-tech text-[9px] text-gray-500 block">PICKERS</span>
                        <span className="font-mono-tech text-sm text-white">{crew.filter(c => c.current_row > 0).length}</span>
                    </div>
                    <div>
                        <span className="font-mono-tech text-[9px] text-gray-500 block">ROWS</span>
                        <span className="font-mono-tech text-sm text-white">{rows}</span>
                    </div>
                </div>
                <div className="font-mono-tech text-[9px] text-gray-600">
                    LAT -41.2865 | LON 174.7762
                </div>
            </div>
        </div>
    );
};

export default HeatMapView;
