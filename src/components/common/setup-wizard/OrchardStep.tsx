/**
 * OrchardStep — Step 1: Create Orchard form
 */
import React from 'react';
import type { OrchardStepProps } from './wizard.types';

const OrchardStep: React.FC<OrchardStepProps> = ({ data, onUpdate }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Orchard Code *</label>
                <input
                    type="text"
                    value={data.orchard.code}
                    onChange={e => onUpdate('code', e.target.value.toUpperCase())}
                    placeholder="e.g. JP-01"
                    className="w-full border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Orchard Name *</label>
                <input
                    type="text"
                    value={data.orchard.name}
                    onChange={e => onUpdate('name', e.target.value)}
                    placeholder="e.g. J&P Cherries"
                    className="w-full border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Location</label>
            <input
                type="text"
                value={data.orchard.location}
                onChange={e => onUpdate('location', e.target.value)}
                placeholder="e.g. Cromwell, Central Otago"
                className="w-full border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
        </div>
        <div>
            <label htmlFor="wizard-total-rows" className="block text-sm font-medium text-text-primary mb-1">Total Rows</label>
            <input
                id="wizard-total-rows"
                type="number"
                min={1}
                max={500}
                value={data.orchard.total_rows}
                onChange={e => onUpdate('total_rows', parseInt(e.target.value) || 1)}
                className="w-32 border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
        </div>
    </div>
);

export default OrchardStep;
