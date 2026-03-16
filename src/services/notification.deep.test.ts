/**
 * Deep tests for notification.service.ts — push notifications
 */
import { describe, it, expect, vi, _beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/nzst', () => ({
  todayNZST: () => '2026-03-10',
}));

import { notificationService } from './notification.service';

describe('notificationService', () => {
  it('exports all expected methods', () => {
    expect(typeof notificationService.requestPermission).toBe('function');
    expect(typeof notificationService.sendNotification).toBe('function');
    expect(typeof notificationService.getPrefs).toBe('function');
    expect(typeof notificationService.setEnabled).toBe('function');
    expect(typeof notificationService.setAlertTypes).toBe('function');
    expect(typeof notificationService.sendTest).toBe('function');
    expect(typeof notificationService.startChecking).toBe('function');
    expect(typeof notificationService.stopChecking).toBe('function');
    expect(typeof notificationService.checkAlerts).toBe('function');
  });

  it('getPrefs returns default prefs', () => {
    const prefs = notificationService.getPrefs();
    expect(prefs).toHaveProperty('enabled');
    expect(prefs).toHaveProperty('types');
    expect(prefs.types).toHaveProperty('visa_expiry');
    expect(prefs.types).toHaveProperty('qc_reject');
    expect(prefs.types).toHaveProperty('transport');
    expect(prefs.types).toHaveProperty('attendance');
  });

  it('getPrefs defaults to disabled', () => {
    const prefs = notificationService.getPrefs();
    expect(prefs.enabled).toBe(false);
  });

  it('setAlertTypes updates types', () => {
    notificationService.setAlertTypes({ visa_expiry: false });
    const prefs = notificationService.getPrefs();
    expect(prefs.types.visa_expiry).toBe(false);
    // Restore
    notificationService.setAlertTypes({ visa_expiry: true });
  });

  it('stopChecking does not throw', () => {
    expect(() => notificationService.stopChecking()).not.toThrow();
  });

  it('requestPermission returns false when Notification API not available', async () => {
    const result = await notificationService.requestPermission();
    expect(result).toBe(false); // jsdom doesn't have Notification
  });

  it('sendNotification returns null when not granted', () => {
    const result = notificationService.sendNotification('Test', 'Body');
    expect(result).toBeNull();
  });

  it('sendTest returns null when not granted', () => {
    const result = notificationService.sendTest();
    expect(result).toBeNull();
  });

  it('checkAlerts skips when disabled', async () => {
    await expect(notificationService.checkAlerts()).resolves.not.toThrow();
  });
});
