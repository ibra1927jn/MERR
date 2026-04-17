/**
 * TeamsView.test.tsx — Tests for TeamsView (team leader cards, runners, search)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import TeamsView from './TeamsView';
import { Picker, HarvestSettings } from '../../../types';

// Mock child components to isolate TeamsView logic
vi.mock('./TeamLeaderCard', () => ({
  default: ({ leader, crew }: { leader: Picker; crew: Picker[] }) => (
    <div data-testid={`leader-card-${leader.id}`}>
      <span>{leader.name}</span>
      <span data-testid="picker-count">{crew.length} pickers</span>
    </div>
  ),
}));

vi.mock('../../modals/TeamLeaderSelectionModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="team-leader-selection-modal">
      <button onClick={onClose}>Close TL Modal</button>
    </div>
  ),
}));

vi.mock('../../modals/ImportCSVModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="import-csv-modal">Import CSV</div> : null,
}));

vi.mock('./teams/TeamsToolbar', () => ({
  default: ({
    search,
    setSearch,
    setIsAddTeamLeaderModalOpen,
    setShowImportCSV,
    usersCount,
  }: {
    search: string;
    setSearch: (s: string) => void;
    setIsAddTeamLeaderModalOpen: (v: boolean) => void;
    setShowImportCSV: (v: boolean) => void;
    usersCount: number;
  }) => (
    <div data-testid="teams-toolbar">
      <input
        data-testid="search-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search..."
      />
      <span data-testid="users-count">{usersCount}</span>
      <button data-testid="add-tl-btn" onClick={() => setIsAddTeamLeaderModalOpen(true)}>
        Add TL
      </button>
      <button data-testid="import-btn" onClick={() => setShowImportCSV(true)}>
        Import
      </button>
    </div>
  ),
}));

vi.mock('./teams/RunnersSection', () => ({
  default: ({
    runners,
    onSelectUser,
  }: {
    runners: Picker[];
    onSelectUser: (u: Picker) => void;
  }) => (
    <div data-testid="runners-section">
      {runners.map(r => (
        <div key={r.id} data-testid={`runner-${r.id}`} onClick={() => onSelectUser(r)}>
          {r.name}
        </div>
      ))}
    </div>
  ),
}));

const makeLeader = (id: string, name: string): Picker => ({
  id,
  name,
  picker_id: id,
  role: 'team_leader',
  orchard_id: 'o-1',
  status: 'active',
  safety_verified: true,
  avatar: name[0],
  current_row: 1,
  total_buckets_today: 0,
  hours: 0,
  qcStatus: [],
});

const makePicker = (id: string, name: string, teamLeaderId: string): Picker => ({
  id,
  name,
  picker_id: id,
  role: 'picker',
  orchard_id: 'o-1',
  status: 'active',
  safety_verified: true,
  team_leader_id: teamLeaderId,
  avatar: name[0],
  current_row: 1,
  total_buckets_today: 0,
  hours: 0,
  qcStatus: [],
});

const makeRunner = (id: string, name: string): Picker => ({
  id,
  name,
  picker_id: id,
  role: 'runner',
  orchard_id: 'o-1',
  status: 'active',
  safety_verified: true,
  avatar: name[0],
  current_row: 0,
  total_buckets_today: 0,
  hours: 0,
  qcStatus: [],
});

const defaultSettings: HarvestSettings = {
  piece_rate: 6.5,
  min_wage_rate: 23.5,
  target_tons: 40,
  min_buckets_per_hour: 8,
};

describe('TeamsView', () => {
  const setSelectedUser = vi.fn();
  const _onRefresh = vi.fn();
  const _onRemoveUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Harvest Teams heading', () => {
    // Necesita crew no vacia para que aparezca la seccion "Harvest Teams"
    const crew = [makeLeader('l1', 'Leader One')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByText(/Harvest Teams/)).toBeTruthy();
  });

  it('shows empty state when no leaders', () => {
    render(<TeamsView crew={[]} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByText('No Team Members Yet')).toBeTruthy();
  });

  it('shows leader count badge', () => {
    const crew = [makeLeader('l1', 'Leader One'), makeLeader('l2', 'Leader Two')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByText('2 leaders')).toBeTruthy();
  });

  it('renders team leader cards', () => {
    const crew = [makeLeader('l1', 'Sarah Boss')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByTestId('leader-card-l1')).toBeTruthy();
    expect(screen.getByText('Sarah Boss')).toBeTruthy();
  });

  it('groups pickers under their team leader', () => {
    const crew = [
      makeLeader('l1', 'Leader A'),
      makePicker('p1', 'Picker 1', 'l1'),
      makePicker('p2', 'Picker 2', 'l1'),
    ];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByText('2 pickers')).toBeTruthy();
  });

  it('renders runners section', () => {
    const crew = [makeRunner('r1', 'Runner Jane')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByTestId('runner-r1')).toBeTruthy();
    expect(screen.getByText('Runner Jane')).toBeTruthy();
  });

  it('filters leaders by search term', () => {
    const crew = [makeLeader('l1', 'Alpha Team'), makeLeader('l2', 'Beta Team')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);

    // Initially both visible
    expect(screen.getByText('Alpha Team')).toBeTruthy();
    expect(screen.getByText('Beta Team')).toBeTruthy();

    // Search for Alpha
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha Team')).toBeTruthy();
    expect(screen.queryByText('Beta Team')).toBeNull();
  });

  it('excludes inactive crew from display', () => {
    const crew = [
      makeLeader('l1', 'Active Leader'),
      { ...makeLeader('l2', 'Inactive Leader'), status: 'inactive' as const },
    ];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByText('Active Leader')).toBeTruthy();
    expect(screen.queryByText('Inactive Leader')).toBeNull();
  });

  it('shows total users count in toolbar', () => {
    const crew = [makeLeader('l1', 'A'), makeRunner('r1', 'B'), makePicker('p1', 'C', 'l1')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByTestId('users-count').textContent).toBe('3');
  });

  it('uses singular "leader" for 1 leader', () => {
    const crew = [makeLeader('l1', 'Solo Leader')];
    render(<TeamsView crew={crew} setSelectedUser={setSelectedUser} settings={defaultSettings} />);
    expect(screen.getByText('1 leader')).toBeTruthy();
  });
});
