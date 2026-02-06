import React, { useEffect, useRef } from 'react';
import { Picker } from '../../../types';

interface HeatMapViewProps {
    bucketRecords: any[];
    crew: Picker[];
    blockName: string;
    rows?: number;
}

const HeatMapView: React.FC<HeatMapViewProps> = ({ bucketRecords, crew, blockName, rows = 20 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Rows (Grid)
        const rowHeight = canvas.height / rows;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        for (let i = 0; i < rows; i++) {
            const y = i * rowHeight;
            // Draw row line
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();

            // Row Number
            ctx.fillStyle = '#555';
            ctx.font = '10px Roboto';
            ctx.fillText(`R${i + 1}`, 5, y + rowHeight / 2 + 3);
        }

        // Draw Heat Points
        bucketRecords.forEach(record => {
            let x = 0;
            let y = 0;

            // Priority 1: GPS Coords (Normalized) - Future Proofing
            if (record.coords && record.coords.lat && record.coords.lng) {
                // Mock normalization for now (would need orchard bounds in real app)
                x = (record.coords.lng + 180) % canvas.width;
                y = (record.coords.lat + 90) % canvas.height;
            }
            // Priority 2: Row Number Fallback (Vital Connection)
            else if (record.row_number || record.row) {
                const r = (record.row_number || record.row) - 1; // 0-indexed
                // Randomize X slightly to simulate movement along row
                x = Math.random() * canvas.width * 0.8 + (canvas.width * 0.1);
                y = r * rowHeight + (rowHeight / 2);
            }
            // Fallback: Skip unmappable points
            else {
                return;
            }

            // Draw Glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
            gradient.addColorStop(0, 'rgba(236, 19, 55, 0.8)'); // Primary Color
            gradient.addColorStop(1, 'rgba(236, 19, 55, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
        });

    }, [bucketRecords, rows]);

    return (
        <div className="w-full h-full relative bg-[#1a1a1a] overflow-hidden">
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-white font-bold text-sm shadow-black drop-shadow-md">{blockName}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    <span className="text-xs text-gray-400">Live Scans</span>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full object-cover opacity-80"
            />
        </div>
    );
};

export default HeatMapView;
