/**
 * EmptyState Stories
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import EmptyState from './EmptyState';

const meta: Meta<typeof EmptyState> = {
    title: 'UI/EmptyState',
    component: EmptyState,
    tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = { args: { icon: 'search', title: 'No results found', description: 'Try adjusting your search or filters.' } };
export const WithAction: Story = { args: { icon: 'group_add', title: 'No pickers yet', description: 'Add your first picker to get started.', actionLabel: 'Add Picker' } };
export const Compact: Story = { args: { icon: 'inbox', title: 'No data', compact: true } };
export const NoData: Story = { args: { icon: 'inventory_2', title: 'No harvest data', description: 'Start scanning buckets to see production data here.' } };
