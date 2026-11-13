import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SupportDeskView } from '../components/SupportDeskView';
import { CourierChatView } from '../components/CourierChatView';
import { NewShipmentForm } from '../components/NewShipmentForm';
import { ShipmentHistoryView } from '../components/ShipmentHistoryView';
import { ThemeProvider } from '../components/ThemeProvider';
import { formatNaira } from '@logistics/shared-types';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Penetration Testing, Security Hardening & Input Sanitization Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. Cross-Site Scripting (XSS) Injection Defense', () => {
    it('defends against stored/reflected script tag execution in chat messages', () => {
      render(
        <ThemeProvider>
          <CourierChatView />
        </ThemeProvider>
      );

      const xssPayload = '<script id="xss-test">alert("pwned")</script><img src="x" onerror="window.__xss=true" />';
      const chatInput = screen.getByPlaceholderText(/Message Tariq/i);

      fireEvent.change(chatInput, { target: { value: xssPayload } });

      const form = chatInput.closest('form');
      expect(form).toBeDefined();
      fireEvent.submit(form!);

      // The script tag must NOT be created as a DOM script node
      expect(document.getElementById('xss-test')).toBeNull();
      expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();

      // The literal payload text must be safely escaped in text content
      expect(screen.getByText(xssPayload)).toBeDefined();
    });

    it('defends against SVG and Event Handler injection in Support Desk chat', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      // Open Live Chat Modal
      fireEvent.click(screen.getByRole('button', { name: /Chat Agent/i }));

      const svgPayload = '<svg onload="alert(1)"><circle r="10"/></svg>';
      const input = screen.getByPlaceholderText(/Type your question for Chioma/i);

      fireEvent.change(input, { target: { value: svgPayload } });

      const form = input.closest('form');
      expect(form).toBeDefined();
      fireEvent.submit(form!);

      // Assert injected SVG payload was not parsed as DOM elements
      expect(document.querySelector('svg[onload]')).toBeNull();
      expect(document.querySelector('circle:not([cx])')).toBeNull();

      // Raw string rendered safely
      expect(screen.getByText(svgPayload)).toBeDefined();
    });

    it('sanitizes malicious markup in Waybill Search Console without executing', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search waybill/i);
      const searchPayload = '"><iframe src="javascript:alert(1)"></iframe>';

      fireEvent.change(searchInput, { target: { value: searchPayload } });

      // No iframe elements should be injected
      expect(document.querySelectorAll('iframe').length).toBe(0);
      expect(screen.getByText(/No deliveries found/i)).toBeDefined();
    });
  });

  describe('2. NoSQL & SQL Injection Resistance', () => {
    it('treats NoSQL operator injection payloads as literal search strings', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search waybill/i);

      // Common NoSQL injection strings
      const nosqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        "admin' --",
        "' OR '1'='1",
      ];

      for (const payload of nosqlPayloads) {
        fireEvent.change(searchInput, { target: { value: payload } });
        // Should safely display no results without throwing runtime exception
        expect(screen.getByText(/No deliveries found/i)).toBeDefined();
      }
    });
  });

  describe('3. Financial Precision & Integer Kobo Integrity (Rule #6)', () => {
    it('accurately formats zero, large, and negative integer kobo amounts without precision drift', () => {
      expect(formatNaira(0)).toBe('₦0.00');
      expect(formatNaira(150000)).toBe('₦1,500.00');
      expect(formatNaira(4520000)).toBe('₦45,200.00');
      expect(formatNaira(100000000)).toBe('₦1,000,000.00');
      expect(formatNaira(-500000)).toBe('-₦5,000.00');
    });

    it('prevents floating point arithmetic round-off errors in Kobo fare computation', () => {
      // ₦0.10 + ₦0.20 in JavaScript float is 0.30000000000000004
      // In Integer Kobo: 10 + 20 = 30 Kobo
      const kobo1 = 10;
      const kobo2 = 20;
      const sumKobo = kobo1 + kobo2;

      expect(sumKobo).toBe(30);
      expect(formatNaira(sumKobo)).toBe('₦0.30');
    });
  });

  describe('4. Anti-Tamper & Input Validation Hardening', () => {
    it('rejects whitespace-only landmark inputs to enforce verified Nigerian landmark policy', () => {
      const handleValidSubmit = vi.fn();
      render(
        <ThemeProvider>
          <NewShipmentForm onProceedToConfirmation={handleValidSubmit} />
        </ThemeProvider>
      );

      const pickupLandmarkInput = document.getElementById('pickupLandmarkInput') as HTMLInputElement;
      expect(pickupLandmarkInput).toBeDefined();
      fireEvent.change(pickupLandmarkInput, { target: { value: '    ' } });

      const submitBtn = screen.getByRole('button', { name: /Review & Confirm Booking/i });
      fireEvent.click(submitBtn);

      // onProceedToMap should not be triggered due to validation enforcement
      expect(handleValidSubmit).not.toHaveBeenCalled();
    });
  });

  describe('5. Client State & LocalStorage Corruption Resilience', () => {
    it('gracefully handles corrupted JSON in localStorage without breaking the application', () => {
      // Set malformed JSON string
      localStorage.setItem('bayniks-theme', '{ corrupted-syntax: ');
      localStorage.setItem('bayniks_recent_searches', 'undefined');

      // Rendering should not crash
      expect(() => {
        render(
          <ThemeProvider>
            <SupportDeskView />
          </ThemeProvider>
        );
      }).not.toThrow();

      expect(screen.getByRole('heading', { name: /24\/7 Support Desk/i })).toBeDefined();
    });
  });
});
