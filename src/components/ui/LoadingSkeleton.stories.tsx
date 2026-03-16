/**
 * LoadingSkeleton Stories
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import LoadingSkeleton from './LoadingSkeleton';

const meta: Meta<typeof LoadingSkeleton> = {
    title: 'UI/LoadingSkeleton',
    component: LoadingSkeleton,
    tags: ['autodocs'],
    argTypes: {
        type: { control: 'select', options: ['card', 'row', 'text', 'avatar', 'chart'] },
        count: { control: { type: 'number', min: 1, max: 6 } },
    },
};
export default meta;
type Story = StoryObj<typeof LoadingSkeleton>;

export const Card: Story = { args: { type: 'card', count: 3 } };
export const Row: Story = { args: { type: 'row', count: 4 } };
export const Text: Story = { args: { type: 'text', count: 3 } };
export const Avatar: Story = { args: { type: 'avatar', count: 3 } };
export const Chart: Story = { args: { type: 'chart' } };
