/**
 * TeamLeader Header — mobile header con notification bell.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Header from './Header';

// Mock useMessaging hook
vi.mock('@/context/MessagingContext', () => ({
    useMessaging: vi.fn(),
}));

// Mock NotificationPanel (it's own component)
vi.mock('@/components/common/NotificationPanel', () => ({
    default: () => <div data-testid="notif-panel">Panel</div>,
}));

import { useMessaging } from '@/context/MessagingContext';

describe('TeamLeader Header', () => {
    it('renderiza title + subtitle', () => {
        (useMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ unreadCount: 0 });
        const { getByText } = render(
            <Header title="Equipo A" subtitle="Cromwell" onProfileClick={() => {}} />,
        );
        expect(getByText('Equipo A')).toBeInTheDocument();
        expect(getByText('Cromwell')).toBeInTheDocument();
    });

    it('unreadCount 0 muestra dot decorativo (no badge)', () => {
        (useMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ unreadCount: 0 });
        const { container } = render(
            <Header title="X" subtitle="Y" onProfileClick={() => {}} />,
        );
        expect(container.querySelector('.bg-red-500')).toBeNull();
    });

    it('unreadCount 5 muestra badge rojo con "5"', () => {
        (useMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ unreadCount: 5 });
        const { getByText } = render(
            <Header title="X" subtitle="Y" onProfileClick={() => {}} />,
        );
        expect(getByText('5')).toBeInTheDocument();
    });

    it('unreadCount 150 muestra "99+"', () => {
        (useMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ unreadCount: 150 });
        const { getByText } = render(
            <Header title="X" subtitle="Y" onProfileClick={() => {}} />,
        );
        expect(getByText('99+')).toBeInTheDocument();
    });

    it('click TL button dispara onProfileClick', () => {
        (useMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ unreadCount: 0 });
        const onProfileClick = vi.fn();
        const { getByText } = render(
            <Header title="X" subtitle="Y" onProfileClick={onProfileClick} />,
        );
        fireEvent.click(getByText('TL'));
        expect(onProfileClick).toHaveBeenCalled();
    });

    it('toggle notifications abre panel', () => {
        (useMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ unreadCount: 0 });
        const { getByText, queryByTestId } = render(
            <Header title="X" subtitle="Y" onProfileClick={() => {}} />,
        );
        expect(queryByTestId('notif-panel')).toBeNull();
        fireEvent.click(getByText('notifications'));
        expect(queryByTestId('notif-panel')).toBeInTheDocument();
    });
});
