/**
 * RatesStep — Step 3: Configure rates form
 */
import React from 'react';
import type { RatesStepProps } from './wizard.types';
import { VARIETIES } from './wizard.types';

const RatesStep: React.FC<RatesStepProps> = ({ data, onUpdate }) => (
    <div className="space-y-4">
        <p className="text-sm text-text-secondary">Set the default piece rate for this orchard.</p>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Primary Variety</label>
                <select
                    value={data.rates.variety}
                    onChange={e => onUpdate('variety', e.target.value)}
                    aria-label="Primary variety"
                    className="w-full border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                    {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="wizard-piece-rate" className="block text-sm font-medium text-text-primary mb-1">Piece Rate ($/bucket)</label>
                <input
                    id="wizard-piece-rate"
                    type="number"
                    min={0.1}
                    step={0.05}
                    value={data.rates.piece_rate}
                    onChange={e => onUpdate('piece_rate', parseFloat(e.target.value) || 0)}
                    className="w-full border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
            </div>
        </div>
        <div>
            <label htmlFor="wizard-start-time" className="block text-sm font-medium text-text-primary mb-1">Default Start Time</label>
            <input
                id="wizard-start-time"
                type="time"
                value={data.rates.start_time}
                onChange={e => onUpdate('start_time', e.target.value)}
                className="w-40 border border-border-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
        </div>
    </div>
);

export default RatesStep;
