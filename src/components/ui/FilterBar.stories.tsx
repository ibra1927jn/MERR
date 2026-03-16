/**
 * FilterBar and Dropdown Stories
 */
import type { Meta, _StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import FilterBar from './FilterBar';
import Dropdown from './Dropdown';

/* ── FilterBar ── */
const filterBarMeta: Meta<typeof FilterBar> = {
  title: 'UI/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
};
export default filterBarMeta;

export const DefaultFilterBar = {
  render: () => {
    const [search, setSearch] = useState('');
    return React.createElement(FilterBar, {
      searchValue: search,
      onSearchChange: setSearch,
      placeholder: 'Search pickers...',
    });
  },
};

export const WithFilters = {
  render: () => {
    const [search, setSearch] = useState('');
    const [team, setTeam] = useState('all');
    return React.createElement(FilterBar, {
      searchValue: search,
      onSearchChange: setSearch,
      placeholder: 'Search...',
      filters: [
        {
          key: 'team',
          label: 'Team',
          value: team,
          onChange: setTeam,
          options: [
            { value: 'all', label: 'All Teams' },
            { value: 'alpha', label: 'Alpha' },
            { value: 'bravo', label: 'Bravo' },
          ],
        },
      ],
    });
  },
};

/* ── Dropdown ── */
export const DropdownDefault = {
  render: () => {
    const [value, setValue] = useState('');
    return React.createElement(Dropdown, {
      value,
      onChange: setValue,
      options: [
        { value: 'manager', label: 'Manager' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'runner', label: 'Runner' },
      ],
      placeholder: 'Select role...',
    });
  },
};
