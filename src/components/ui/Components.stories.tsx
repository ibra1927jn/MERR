/**
 * PageHeader, ModalOverlay, Drawer, TabGroup, Icon, Toast, ThemeToggle Stories
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import PageHeader from './PageHeader';
import ModalOverlay from './ModalOverlay';
import Drawer from './Drawer';
import TabGroup from './TabGroup';
import Icon from './Icon';
import Toast from './Toast';
import ThemeToggle from './ThemeToggle';
import InlineEdit from './InlineEdit';
import InlineSelect from './InlineSelect';
import DatePicker from './DatePicker';
import VirtualList from './VirtualList';

/* ── PageHeader ── */
const pageHeaderMeta: Meta<typeof PageHeader> = {
    title: 'UI/PageHeader',
    component: PageHeader,
    tags: ['autodocs'],
};
export default pageHeaderMeta;

type PageHeaderStory = StoryObj<typeof PageHeader>;
export const DefaultPageHeader: PageHeaderStory = {
    args: { title: 'Manager Dashboard', subtitle: 'Live monitoring · J&P Cherries', icon: 'agriculture' },
};
export const WithActions: PageHeaderStory = {
    args: { title: 'Team Overview', icon: 'groups', actions: React.createElement('button', { className: 'px-3 py-1 bg-emerald-600 text-white rounded text-sm' }, 'Export') },
};

/* ── ModalOverlay ── */
export const ModalOpen = {
    render: () => {
        const [open, setOpen] = useState(true);
        return React.createElement('div', null,
            React.createElement('button', { onClick: () => setOpen(true), className: 'px-4 py-2 bg-blue-600 text-white rounded' }, 'Open Modal'),
            open && React.createElement(ModalOverlay, { onClose: () => setOpen(false), title: 'Confirm Action' },
                React.createElement('p', null, 'Are you sure you want to proceed?'),
            )
        );
    },
};

/* ── Drawer ── */
export const DrawerOpen = {
    render: () => {
        const [open, setOpen] = useState(true);
        return React.createElement('div', null,
            React.createElement('button', { onClick: () => setOpen(true), className: 'px-4 py-2 bg-indigo-600 text-white rounded' }, 'Open Drawer'),
            open && React.createElement(Drawer, { onClose: () => setOpen(false), title: 'Picker Profile' },
                React.createElement('p', null, 'Drawer content goes here'),
            )
        );
    },
};

/* ── TabGroup ── */
export const Tabs = {
    render: () => {
        const [active, setActive] = useState('tab1');
        const tabs = [
            { id: 'tab1', label: 'Overview', icon: 'dashboard' },
            { id: 'tab2', label: 'Teams', icon: 'groups' },
            { id: 'tab3', label: 'Analytics', icon: 'analytics' },
        ];
        return React.createElement(TabGroup, { tabs, activeTab: active, onChange: setActive });
    },
};

/* ── Icon ── */
export const Icons = {
    render: () => React.createElement('div', { className: 'flex gap-4' },
        React.createElement(Icon, { name: 'agriculture', className: 'text-2xl text-emerald-500' }),
        React.createElement(Icon, { name: 'groups', className: 'text-2xl text-blue-500' }),
        React.createElement(Icon, { name: 'shield', className: 'text-2xl text-red-500' }),
        React.createElement(Icon, { name: 'payments', className: 'text-2xl text-green-500' }),
        React.createElement(Icon, { name: 'speed', className: 'text-2xl text-amber-500' }),
    ),
};

/* ── Toast ── */
export const SuccessToast = {
    render: () => React.createElement(Toast, { type: 'success', message: 'Bucket recorded successfully' }),
};
export const ErrorToast = {
    render: () => React.createElement(Toast, { type: 'error', message: 'Failed to save data' }),
};

/* ── ThemeToggle ── */
export const Theme = {
    render: () => React.createElement(ThemeToggle),
};

/* ── InlineEdit ── */
export const InlineEditDefault = {
    render: () => {
        const [value, setValue] = useState('Click to edit');
        return React.createElement(InlineEdit, { value, onChange: setValue, label: 'Name' });
    },
};

/* ── InlineSelect ── */
export const InlineSelectDefault = {
    render: () => {
        const [value, setValue] = useState('lapin');
        const options = [{ value: 'lapin', label: 'Lapin' }, { value: 'sweetheart', label: 'Sweetheart' }, { value: 'kordia', label: 'Kordia' }];
        return React.createElement(InlineSelect, { value, onChange: setValue, options, label: 'Variety' });
    },
};

/* ── DatePicker ── */
export const DatePickerDefault = {
    render: () => {
        const [date, setDate] = useState('2026-03-08');
        return React.createElement(DatePicker, { value: date, onChange: setDate });
    },
};

/* ── VirtualList ── */
export const VirtualListDefault = {
    render: () => {
        const items = Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: `Picker ${i + 1}` }));
        return React.createElement('div', { style: { height: 300 } },
            React.createElement(VirtualList, {
                items,
                itemHeight: 40,
                renderItem: (item: { id: string; name: string }) => React.createElement('div', { key: item.id, className: 'p-2 border-b' }, item.name),
            })
        );
    },
};
