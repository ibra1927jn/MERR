/**
 * RowTeamDisplay — Team roster per row tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import RowTeamDisplay from './RowTeamDisplay';

const leader = {
  id: 'l1',
  name: 'John Leader',
  total_buckets_today: 25,
  role: 'team_leader',
} as any;
const members = [
  { id: 'm1', name: 'Alice Smith', total_buckets_today: 15, role: 'picker' } as any,
  { id: 'm2', name: 'Bob Jones', total_buckets_today: 0, role: 'bucket_runner' } as any,
];

describe('RowTeamDisplay', () => {
  it('shows empty message when no teams', () => {
    render(<RowTeamDisplay teamsOnRow={[]} totalPeople={0} rowNumber={5} />);
    expect(screen.getByText('No team assigned to Row 5')).toBeTruthy();
  });

  it('renders team header when teams exist', () => {
    render(
      <RowTeamDisplay teamsOnRow={[{ leader, members, total: 3 }]} totalPeople={3} rowNumber={7} />
    );
    expect(screen.getByText(/1 team/)).toBeTruthy();
  });

  it('renders leader name', () => {
    render(
      <RowTeamDisplay teamsOnRow={[{ leader, members, total: 3 }]} totalPeople={3} rowNumber={7} />
    );
    expect(screen.getByText('John Leader')).toBeTruthy();
  });

  it('renders first member', () => {
    render(
      <RowTeamDisplay teamsOnRow={[{ leader, members, total: 3 }]} totalPeople={3} rowNumber={7} />
    );
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('renders second member', () => {
    render(
      <RowTeamDisplay teamsOnRow={[{ leader, members, total: 3 }]} totalPeople={3} rowNumber={7} />
    );
    expect(screen.getByText('Bob Jones')).toBeTruthy();
  });

  it('handles team without leader', () => {
    const teamNoLeader = { leader: null, members, total: 2 };
    render(<RowTeamDisplay teamsOnRow={[teamNoLeader]} totalPeople={2} rowNumber={3} />);
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });
});
