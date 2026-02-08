import React, { useMemo } from 'react';

interface HeatMapViewProps {
    bucketRecords: any[];
    crew: any[];
    blockName?: string;
    rows?: number;
    onRowClick?: (row: number) => void;
}

const HeatMapView: React.FC<HeatMapViewProps> = ({
    bucketRecords,
    crew,
    blockName = 'BLOCK-01',
    rows = 50,
    onRowClick
}) => {

    // 1. Agrupar Pickers por Fila (Datos en Tiempo Real)
    const rowData = useMemo(() => {
        const data: Record<number, { pickers: number; buckets: number }> = {};

        // Inicializar filas
        for (let i = 1; i <= rows; i++) {
            data[i] = { pickers: 0, buckets: 0 };
        }

        // Contar Pickers actuales en cada fila
        if (Array.isArray(crew)) {
            crew.forEach(p => {
                const r = p.current_row || 0;
                if (data[r]) data[r].pickers++;
            });
        }

        // Contar Cubos (Buckets) recientes en cada fila (Simulación de densidad)
        if (Array.isArray(bucketRecords)) {
            bucketRecords.slice(0, 100).forEach(r => {
                const rowNum = r.row_number || 0;
                if (data[rowNum]) data[rowNum].buckets++;
            });
        }

        return data;
    }, [crew, bucketRecords, rows]);

    return (
        <div className="relative w-full h-full bg-[#050a0f] overflow-hidden flex flex-col technical-grid">

            {/* HUD Header Overlay */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <div className="flex flex-col">
                    <span className="text-[10px] text-[#00f0ff] uppercase tracking-[0.2em] mb-1">Live Feed</span>
                    <h3 className="text-xl font-black text-white leading-none uppercase">{blockName}</h3>
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse"></div>
                            <span className="text-[10px] text-slate-400 font-mono">PICKERS ONLINE</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm rotate-45 bg-yellow-400"></div>
                            <span className="text-[10px] text-slate-400 font-mono">BINS PLACED</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Efecto de Escáner */}
            <div className="scan-line"></div>

            {/* Scrollable Map Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-20 px-4">
                <div className="max-w-3xl mx-auto flex flex-col gap-3">
                    {Array.from({ length: rows }, (_, i) => i + 1).map((rowNum) => {
                        const info = rowData[rowNum] || { pickers: 0, buckets: 0 };
                        const hasActivity = info.pickers > 0 || info.buckets > 0;
                        const intensity = Math.min(100, (info.buckets * 10)); // Ancho de barra basado en cubos

                        return (
                            <div
                                key={rowNum}
                                onClick={() => onRowClick?.(rowNum)}
                                className="group flex items-center gap-4 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                            >
                                {/* Número de Fila */}
                                <span className={`text-[10px] font-mono w-6 text-right ${hasActivity ? 'text-[#00f0ff] font-bold' : 'text-slate-700'}`}>
                                    {rowNum.toString().padStart(2, '0')}
                                </span>

                                {/* La Línea Técnica */}
                                <div className="flex-1 relative h-6 flex items-center">
                                    {/* Línea Base */}
                                    <div className="absolute w-full h-[1px] bg-slate-800 group-hover:bg-slate-600 transition-colors"></div>

                                    {/* Barra de Progreso/Cubos (Amarilla) */}
                                    {info.buckets > 0 && (
                                        <div
                                            className="absolute h-[2px] bg-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)] transition-all duration-500"
                                            style={{ width: `${intensity}%`, left: '0' }}
                                        ></div>
                                    )}

                                    {/* Puntos de Pickers (Neon Cyan) */}
                                    {info.pickers > 0 && Array.from({ length: info.pickers }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="absolute w-3 h-3 bg-[#00f0ff] rounded-full picker-dot z-10 border-2 border-[#050a0f] transition-all duration-1000"
                                            style={{
                                                left: `${Math.random() * 80 + 10}%`, // Posición aleatoria simulada en la fila
                                            }}
                                            title="Picker Active"
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HeatMapView;
