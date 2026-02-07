import React, { useEffect, useRef, useMemo } from 'react';
import { Picker } from '../../../types';

interface HeatMapViewProps {
    bucketRecords: any[]; // Real data
    crew: Picker[];
    blockName: string;
    rows?: number;
    onRowClick?: (rowNumber: number) => void;
}

const HeatMapView: React.FC<HeatMapViewProps> = ({ bucketRecords, crew, blockName, rows = 20, onRowClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 1. Process Data with useMemo for Performance
    const rowIntensity = useMemo(() => {
        const counts = new Array(rows).fill(0);
        let max = 1;

        bucketRecords.forEach(r => {
            const rowNum = r.row_number || (r.coords?.row) || 0;
            // VALIDATION: Ignore out-of-bounds rows
            if (rowNum > 0 && rowNum <= rows) {
                counts[rowNum - 1]++; // 0-indexed array
            }
        });

        max = Math.max(...counts, 1); // Avoid div by zero
        return { counts, max };
    }, [bucketRecords, rows]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Rows
        const rowHeight = canvas.height / rows;

        for (let i = 0; i < rows; i++) {
            const y = i * rowHeight;
            const density = rowIntensity.counts[i];
            const intensity = density / rowIntensity.max;

            // DRAW BACKGROUND INTENSITY (Heatmap Effect)
            if (intensity > 0) {
                // Color Scale: Green (low) -> Yellow -> Red (high)
                // HSL: Green=120, Red=0. 
                // Invert intensity for Hue: Low Int (0.1) -> 120 (Green). High Int (1.0) -> 0 (Red).
                // Actually, let's just use simple opacity of Red for "Heat" as requested by user "vibrancy"?
                // Or stick to standard heatmap: Green=Low Activity, Red=High Activity?
                // User said "vibrant colors", let's do Red with Alpha based on intensity

                ctx.fillStyle = `rgba(236, 19, 55, ${0.1 + (intensity * 0.6)})`; // Base 0.1, Max 0.7 opacity
                ctx.fillRect(0, y, canvas.width, rowHeight);
            }

            // Draw row lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();

            // Row Number
            ctx.fillStyle = '#888';
            ctx.font = '10px Roboto';
            ctx.fillText(`Row ${i + 1} (${density})`, 5, y + (rowHeight / 2) + 3);
        }

    }, [rowIntensity, rows]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onRowClick || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();

        // Calculate Y position relative to the canvas element
        // NOTE: The canvas element might be scaled by CSS (width: 100%, height: 100%)
        // vs its internal resolution (width={400}, height={800}).
        // rect.height is the VISUAL height.
        // e.clientY - rect.top is the VISUAL Y click position.

        const visualY = e.clientY - rect.top;
        const visualHeight = rect.height;

        // Ratio of click position (0.0 to 1.0)
        const ratioY = visualY / visualHeight;

        // Map ratio to row index (0 to rows-1)
        const rowIndex = Math.floor(ratioY * rows);

        // Convert to 1-based row number
        const rowNumber = rowIndex + 1;

        if (rowNumber >= 1 && rowNumber <= rows) {
            console.log(`[Heatmap] Click at ${visualY.toFixed(1)}px / ${visualHeight.toFixed(1)}px -> Ratio ${ratioY.toFixed(3)} -> Row ${rowNumber}`);
            onRowClick(rowNumber);
        }
    };

    return (
        <div className="w-full h-full relative bg-[#1a1a1a] overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-white font-bold text-sm shadow-black drop-shadow-md">{blockName}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    <span className="text-xs text-gray-400">Live Scans ({bucketRecords.length})</span>
                </div>
            </div>

            {/* Visual Hint for Clickability */}
            <div className="absolute inset-0 pointer-events-none bg-white/0 group-hover:bg-white/5 transition-colors z-0"></div>

            <canvas
                ref={canvasRef}
                width={400} // Logical width (scaled by CSS)
                height={800} // Logical height
                className="w-full h-full object-cover cursor-crosshair active:cursor-grabbing"
                onClick={handleCanvasClick}
            />
        </div>
    );
};

export default HeatMapView;
