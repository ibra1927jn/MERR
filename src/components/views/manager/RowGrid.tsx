/**
 * RowGrid — Interactive row selection grid for row assignments
 */
import React from 'react';

interface TeamOnRow {
    total: number;
}

interface RowGridProps {
    blockRows: number[];
    selectedRows: number[];
    teamsPerRow: Record<number, TeamOnRow[]>;
    selectedVariety: string;
    selectedBlock: { rowVarieties?: Record<number, string> } | null;
    blockName: string;
    onToggleRow: (row: number) => void;
}

const RowGrid: React.FC<RowGridProps> = ({
    blockRows, selectedRows, teamsPerRow,
    selectedVariety, selectedBlock, blockName,
    onToggleRow,
}) => (
    <div>
        <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {blockName} Rows
            </label>
            <span className="text-[10px] font-bold text-primary">{selectedRows.length} selected</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
            {blockRows.map(r => {
                const isSelected = selectedRows.includes(r);
                const teams = teamsPerRow[r] || [];
                const hasTeams = teams.length > 0;
                const rowVariety = selectedBlock?.rowVarieties?.[r];
                const isVarietyBlocked = selectedVariety !== 'ALL' && rowVariety && rowVariety !== selectedVariety;
                return (
                    <button
                        key={r}
                        onClick={() => !isVarietyBlocked && onToggleRow(r)}
                        disabled={!!isVarietyBlocked}
                        className={`py-2 rounded-lg text-xs font-bold transition-all relative
                            ${isVarietyBlocked
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                                : isSelected
                                    ? 'bg-primary text-white shadow-sm scale-105'
                                    : hasTeams
                                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                        title={isVarietyBlocked ? `${rowVariety} (inactive)` : hasTeams ? `${teams.length} team(s), ${teams.reduce((s, t) => s + t.total, 0)} people` : undefined}
                    >
                        {r}
                        {hasTeams && !isSelected && !isVarietyBlocked && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                        )}
                    </button>
                );
            })}
        </div>
    </div>
);

export default RowGrid;
