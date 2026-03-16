/**
 * StatCard Stories
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import StatCard from './StatCard';

const meta: Meta<typeof StatCard> = {
    title: 'UI/StatCard',
    component: StatCard,
    tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = { args: { title: 'Total Buckets', value: '1,247', icon: 'inventory_2' } };
export const WithTrend: Story = { args: { title: 'Revenue', value: '$12,450', icon: 'payments', trend: 12, trendLabel: 'vs last week' } };
export const WithSubtext: Story = { args: { title: 'Active Pickers', value: '24', icon: 'groups', subtext: 'of 30 total' } };
export const Compact: Story = { args: { title: 'Velocity', value: '45', icon: 'speed', compact: true } };
