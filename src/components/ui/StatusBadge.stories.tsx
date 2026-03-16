/**
 * StatusBadge Stories
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import StatusBadge from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
    title: 'UI/StatusBadge',
    component: StatusBadge,
    tags: ['autodocs'],
    argTypes: {
        status: { control: 'select', options: ['active', 'inactive', 'pending', 'warning', 'error', 'success'] },
        size: { control: 'select', options: ['sm', 'md'] },
        pulse: { control: 'boolean' },
    },
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Active: Story = { args: { status: 'active', children: 'Active' } };
export const Inactive: Story = { args: { status: 'inactive', children: 'Inactive' } };
export const Pending: Story = { args: { status: 'pending', children: 'Pending' } };
export const Warning: Story = { args: { status: 'warning', children: 'Warning' } };
export const Error: Story = { args: { status: 'error', children: 'Error' } };
export const Success: Story = { args: { status: 'success', children: 'Success' } };
export const PulsingBadge: Story = { args: { status: 'active', children: 'Live', pulse: true } };
export const SmallBadge: Story = { args: { status: 'success', children: 'OK', size: 'sm' } };
