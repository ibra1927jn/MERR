/**
 * DocumentsTab — Deep render tests
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DocumentsTab from './DocumentsTab';

describe('DocumentsTab', () => {
    it('renders Coming Soon banner', () => {
        render(<DocumentsTab />);
        expect(screen.getByText(/Coming Soon/)).toBeTruthy();
    });

    it('renders Document Management heading', () => {
        render(<DocumentsTab />);
        expect(screen.getByText('Document Management')).toBeTruthy();
    });

    it('renders upload description', () => {
        render(<DocumentsTab />);
        expect(screen.getByText(/Upload and manage employment documents/)).toBeTruthy();
    });

    it('renders Upload Document button (disabled)', () => {
        render(<DocumentsTab />);
        const btn = screen.getByText('Upload Document');
        expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    it('renders all document templates', () => {
        render(<DocumentsTab />);
        expect(screen.getByText('Employment Agreement')).toBeTruthy();
        expect(screen.getByText('Work Visa')).toBeTruthy();
        expect(screen.getByText('Health & Safety Certificate')).toBeTruthy();
        expect(screen.getByText('Tax Declaration')).toBeTruthy();
        expect(screen.getByText('RSE Worker Induction')).toBeTruthy();
        expect(screen.getByText('Pastoral Care Plan')).toBeTruthy();
    });

    it('renders template descriptions', () => {
        render(<DocumentsTab />);
        const descs = screen.getAllByText('Template • Required for all employees');
        expect(descs.length).toBe(6);
    });
});
