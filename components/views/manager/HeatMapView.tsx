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

        // 0. Draw Background Map (if available)
        // Hardcoded for Pilot for now, or dynamic based on blockName
        const img = new Image();
        img.src = '/maps/mp3_cooper_lane.png'; // Make sure this file exists in public/maps/

        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawHeatmapOverlay(ctx, canvas, rowIntensity, rows);
            drawEmergencyMarker(ctx, canvas);
        };

        img.onerror = () => {
            // Fallback to dark background
            drawHeatmapOverlay(ctx, canvas, rowIntensity, rows);
            drawEmergencyMarker(ctx, canvas);
        };

        // Attempt draw immediately in case cached (or fail to onerror/onload)
        if (img.complete) {
            if (img.naturalWidth > 0) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawHeatmapOverlay(ctx, canvas, rowIntensity, rows);
            drawEmergencyMarker(ctx, canvas);
        }

    }, [rowIntensity, rows]);

    const drawHeatmapOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: any, rowCount: number) => {
        const rowHeight = canvas.height / rowCount;

        for (let i = 0; i < rowCount; i++) {
            const y = i * rowHeight;
            const density = data.counts[i];
            const intensity = density / data.max;

            // DRAW BACKGROUND INTENSITY (Heatmap Effect) - More vibrant for Pilot
            if (intensity > 0) {
                ctx.fillStyle = `rgba(236, 19, 55, ${0.3 + (intensity * 0.5)})`;
                ctx.fillRect(0, y, canvas.width, rowHeight);
            }

            // Draw row lines (Subtle)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();

            // Row Number
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Roboto';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(`R${i + 1}`, 10, y + (rowHeight / 2) + 4);

            if (density > 0) {
                ctx.font = '10px Roboto';
                ctx.fillText(`(${density})`, 40, y + (rowHeight / 2) + 4);
            }
            ctx.shadowBlur = 0; // Reset
        }
    };

    const drawEmergencyMarker = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        // Red Star at Emergency Point (Example: Bottom Left Paddock)
        // Coordinates depend on the map image. Assuming bottom-left for now as per "paddock vacío"
        const x = 50;
        const y = canvas.height - 50;

        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;

        // Draw Star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 20,
                -Math.sin((18 + i * 72) * Math.PI / 180) * 20);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 8,
                -Math.sin((54 + i * 72) * Math.PI / 180) * 8);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText("MEETING POINT", -45, 35);
        ctx.restore();
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
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const row = Math.floor(y / (rect.height / rows)) + 1;
                    onRowClick && onRowClick(row);
                }}
            />
        </div>
    );
};

export default HeatMapView;
