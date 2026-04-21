/**
 * TeamsStep — setup wizard step 2.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TeamsStep from './TeamsStep';
import { INITIAL_DATA } from './wizard.types';

describe('TeamsStep', () => {
    const baseProps = {
        data: INITIAL_DATA,
        onUpdateTeam: vi.fn(),
        onAddTeam: vi.fn(),
        onRemoveTeam: vi.fn(),
    };

    it('renderiza "Team 1" con 1 team default', () => {
        const { getByText } = render(<TeamsStep {...baseProps} />);
        expect(getByText('Team 1')).toBeInTheDocument();
    });

    it('no renderiza "Remove" con 1 sólo team', () => {
        const { queryByText } = render(<TeamsStep {...baseProps} />);
        expect(queryByText('Remove')).toBeNull();
    });

    it('renderiza "Remove" cuando hay 2+ teams', () => {
        const data = {
            ...INITIAL_DATA,
            teams: [
                { name: 'A', leader_name: '', max_pickers: 10 },
                { name: 'B', leader_name: '', max_pickers: 10 },
            ],
        };
        const { getAllByText } = render(<TeamsStep {...baseProps} data={data} />);
        expect(getAllByText('Remove')).toHaveLength(2);
    });

    it('click Remove llama onRemoveTeam con idx', () => {
        const onRemoveTeam = vi.fn();
        const data = {
            ...INITIAL_DATA,
            teams: [
                { name: 'A', leader_name: '', max_pickers: 10 },
                { name: 'B', leader_name: '', max_pickers: 10 },
            ],
        };
        const { getAllByText } = render(
            <TeamsStep {...baseProps} data={data} onRemoveTeam={onRemoveTeam} />,
        );
        fireEvent.click(getAllByText('Remove')[1]);
        expect(onRemoveTeam).toHaveBeenCalledWith(1);
    });

    it('cambio de team name dispara onUpdateTeam', () => {
        const onUpdateTeam = vi.fn();
        const { container } = render(<TeamsStep {...baseProps} onUpdateTeam={onUpdateTeam} />);
        const nameInput = container.querySelectorAll('input[type="text"]')[0];
        fireEvent.change(nameInput, { target: { value: 'Beta' } });
        expect(onUpdateTeam).toHaveBeenCalledWith(0, 'name', 'Beta');
    });

    it('max_pickers parseInt con fallback 1', () => {
        const onUpdateTeam = vi.fn();
        const { container } = render(<TeamsStep {...baseProps} onUpdateTeam={onUpdateTeam} />);
        const num = container.querySelector('input[type="number"]') as HTMLInputElement;
        fireEvent.change(num, { target: { value: 'abc' } });
        expect(onUpdateTeam).toHaveBeenCalledWith(0, 'max_pickers', 1);
    });

    it('click Add Team llama onAddTeam', () => {
        const onAddTeam = vi.fn();
        const { getByText } = render(<TeamsStep {...baseProps} onAddTeam={onAddTeam} />);
        fireEvent.click(getByText('Add Team'));
        expect(onAddTeam).toHaveBeenCalled();
    });
});
