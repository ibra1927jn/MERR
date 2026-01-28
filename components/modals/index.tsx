/**
 * Modals Components Index
 * Export all modal components from a single entry point
 */

// Existing modals
export { default as BroadcastModal } from './BroadcastModal';
export { default as CreateGroupModal, type ChatGroup } from './CreateGroupModal';
export { default as DaySettingsModal } from './DaySettingsModal';
export { default as PickerDetailsModal } from './PickerDetailsModal';
export { default as ScannerModal } from './ScannerModal';

// New shared modals
export { default as ProfileModal } from './ProfileModal';
export { default as ChatModal } from './ChatModal';
export type { Chat, ChatMessage } from './ChatModal';
export { default as SendDirectMessageModal } from './SendDirectMessageModal';
export type { Recipient } from './SendDirectMessageModal';
export { default as AddRunnerModal } from './AddRunnerModal';
export type { RunnerData } from './AddRunnerModal';
export { default as PhotoModal } from './PhotoModal';
