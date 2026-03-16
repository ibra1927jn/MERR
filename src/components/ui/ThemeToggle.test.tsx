import { describe, it, expect, vi, beforeEach, _afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import React from 'react';

// Mock useTheme
const mockToggle = vi.fn();
let mockIsDark = false;

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    isDark: mockIsDark,
    toggleTheme: mockToggle,
    theme: mockIsDark ? 'dark' : 'light',
    setTheme: vi.fn(),
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDark = false;
  });

  it('renders moon icon in light mode', () => {
    render(<ThemeToggle />);
    expect(screen.getByText('dark_mode')).toBeDefined();
  });

  it('renders sun icon in dark mode', () => {
    mockIsDark = true;
    render(<ThemeToggle />);
    expect(screen.getByText('light_mode')).toBeDefined();
  });

  it('calls toggleTheme on click', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('has correct aria-label in light mode', () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeDefined();
  });

  it('has correct aria-label in dark mode', () => {
    mockIsDark = true;
    render(<ThemeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeDefined();
  });
});
