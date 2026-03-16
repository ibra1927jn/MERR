/**
 * TeamsStep — Step 2: Team configuration form
 */
import React from 'react';
import type { TeamsStepProps } from './wizard.types';

const TeamsStep: React.FC<TeamsStepProps> = ({ data, onUpdateTeam, onAddTeam, onRemoveTeam }) => (
    <div className="space-y-4">
        <p className="text-sm text-text-secondary">Define your picking teams. You can add more teams later.</p>
        {data.teams.map((team, idx) => (
            <div key={idx} className="bg-background-light rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-text-primary">Team {idx + 1}</h4>
                    {data.teams.length > 1 && (
                        <button onClick={() => onRemoveTeam(idx)} className="text-xs text-red-500 hover:text-red-700">
                            Remove
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label htmlFor={`wizard-team-name-${idx}`} className="block text-xs text-text-secondary mb-1">Team Name</label>
                        <input
                            id={`wizard-team-name-${idx}`}
                            type="text"
                            value={team.name}
                            onChange={e => onUpdateTeam(idx, 'name', e.target.value)}
                            className="w-full border border-border-light rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-text-secondary mb-1">Team Leader</label>
                        <input
                            type="text"
                            value={team.leader_name}
                            onChange={e => onUpdateTeam(idx, 'leader_name', e.target.value)}
                            placeholder="Optional"
                            className="w-full border border-border-light rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label htmlFor={`wizard-max-pickers-${idx}`} className="block text-xs text-text-secondary mb-1">Max Pickers</label>
                        <input
                            id={`wizard-max-pickers-${idx}`}
                            type="number"
                            min={1}
                            max={50}
                            value={team.max_pickers}
                            onChange={e => onUpdateTeam(idx, 'max_pickers', parseInt(e.target.value) || 1)}
                            className="w-full border border-border-light rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                </div>
            </div>
        ))}
        <button
            onClick={onAddTeam}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
            <span className="material-symbols-outlined text-base">add</span>
            Add Team
        </button>
    </div>
);

export default TeamsStep;
