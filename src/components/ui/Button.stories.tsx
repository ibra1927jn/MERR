/**
 * Button Stories — All variants of the Button component
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import Button from './Button';

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'danger'] },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        disabled: { control: 'boolean' },
        loading: { control: 'boolean' },
        fullWidth: { control: 'boolean' },
    },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Primary Button', variant: 'primary' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
export const Danger: Story = { args: { children: 'Delete', variant: 'danger' } };
export const Small: Story = { args: { children: 'Small', size: 'sm' } };
export const Large: Story = { args: { children: 'Large', size: 'lg' } };
export const Loading: Story = { args: { children: 'Loading...', loading: true } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };
export const FullWidth: Story = { args: { children: 'Full Width', fullWidth: true } };
export const WithIcon: Story = { args: { children: 'Export', icon: 'download' } };
