import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SupportDeskView } from '../components/SupportDeskView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 17: Support Hub & WhatsApp Desk Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  describe('1. SupportDeskView Component Rendering & Structure', () => {
    it('renders header, online response indicator, and hero priority assistance banner', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /24\/7 Support Desk/i })).toBeDefined();
      expect(screen.getByText(/Average Response: < 60 seconds/i)).toBeDefined();
      expect(screen.getByText(/PRIORITY ASSISTANCE/i)).toBeDefined();
      expect(screen.getByText(/Ticket #TKT-84920/i)).toBeDefined();
      expect(screen.getByText(/How can we assist your delivery\?/i)).toBeDefined();
    });

    it('triggers back button navigation to dashboard or custom callback', () => {
      const handleCustomBack = vi.fn();
      render(
        <ThemeProvider>
          <SupportDeskView onBackClick={handleCustomBack} />
        </ThemeProvider>
      );

      const backBtn = screen.getByLabelText(/Back to dashboard/i);
      fireEvent.click(backBtn);
      expect(handleCustomBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Four Direct Support Channels Grid', () => {
    it('renders all four channels: Live Agent, Toll-Free, WhatsApp, and Email', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /Live Agent Chat/i })).toBeDefined();
      expect(screen.getByRole('heading', { name: /Toll-Free Helpline/i })).toBeDefined();
      expect(screen.getByRole('heading', { name: /WhatsApp Desk/i })).toBeDefined();
      expect(screen.getByRole('heading', { name: /Email Support/i })).toBeDefined();
    });

    it('triggers toll-free helpline toast when clicked', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const helplineBtn = screen.getByText(/0800-BAYNIKS/i).closest('button');
      expect(helplineBtn).toBeDefined();
      fireEvent.click(helplineBtn!);

      expect(screen.getByText(/Dialing 0800-BAYNIKS/i)).toBeDefined();
    });

    it('triggers WhatsApp desk link and toast when clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const waBtn = screen.getByText(/WhatsApp Desk/i).closest('button');
      expect(waBtn).toBeDefined();
      fireEvent.click(waBtn!);

      expect(screen.getByText(/Connecting to Bayniks WhatsApp Concierge/i)).toBeDefined();
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/2348123456789'),
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });

    it('triggers Email desk link and toast when clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const emailBtn = screen.getByText(/support@bayniks\.com/i).closest('button');
      expect(emailBtn).toBeDefined();
      fireEvent.click(emailBtn!);

      expect(screen.getByText(/Opening Email Helpdesk/i)).toBeDefined();
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@bayniks.com'),
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });
  });

  describe('3. Quick Issue Resolvers (1-Tap Actions)', () => {
    it('flags delayed courier report with toast', () => {
      render(
        <ThemeProvider>
          <SupportDeskView activeWaybill="#BYN-LGS-847291" />
        </ThemeProvider>
      );

      const delayResolver = screen.getByText(/Report a Delayed Courier/i).closest('div');
      expect(delayResolver).toBeDefined();
      fireEvent.click(delayResolver!);

      expect(
        screen.getByText(/Priority alert flagged to dispatch controller for #BYN-LGS-847291/i)
      ).toBeDefined();
    });

    it('redirects to active delivery corridor when change address clicked', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const addressResolver = screen.getByText(/Change Drop-off Address/i).closest('div');
      expect(addressResolver).toBeDefined();
      fireEvent.click(addressResolver!);

      expect(mockPush).toHaveBeenCalledWith('/deliveries');
      expect(screen.getByText(/Directing you to active delivery corridor update/i)).toBeDefined();
    });

    it('resends Handover OTP with toast', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const otpResolver = screen.getByText(/Handover OTP Not Working/i).closest('div');
      expect(otpResolver).toBeDefined();
      fireEvent.click(otpResolver!);

      expect(
        screen.getByText(/Regenerated Handover OTP \(4829\) sent via SMS & WhatsApp/i)
      ).toBeDefined();
    });
  });

  describe('4. Searchable Frequently Asked Questions (FAQ) Accordion', () => {
    it('renders all 5 initial FAQs and allows expanding/collapsing', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      expect(screen.getByText(/5 answers/i)).toBeDefined();
      expect(screen.getByText(/How do I track my courier on the live map\?/i)).toBeDefined();
      expect(screen.getByText(/What is the 4-digit Handover OTP\?/i)).toBeDefined();
      expect(screen.getByText(/How do I request a refund or dispute a charge\?/i)).toBeDefined();
      expect(screen.getByText(/Can I reroute or change the recipient address\?/i)).toBeDefined();
      expect(screen.getByText(/What is the ₦500,000 Cargo Insurance policy\?/i)).toBeDefined();

      // Click to toggle FAQ 2
      const faq2Button = screen.getByRole('button', {
        name: /What is the 4-digit Handover OTP\?/i,
      });
      fireEvent.click(faq2Button);
      expect(screen.getByText(/To guarantee zero parcel theft/i)).toBeDefined();
    });

    it('filters FAQs dynamically as user types in search input', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(
        /Search help topics, OTP questions, or claims/i
      );

      // Search for "insurance"
      fireEvent.change(searchInput, { target: { value: 'insurance' } });

      expect(screen.getByText(/1 answers/i)).toBeDefined();
      expect(screen.getByText(/What is the ₦500,000 Cargo Insurance policy\?/i)).toBeDefined();
      expect(
        screen.queryByText(/How do I track my courier on the live map\?/i)
      ).toBeNull();

      // Clear search
      const clearBtn = screen.getByRole('button', { name: /Clear Search/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText(/5 answers/i)).toBeDefined();
    });

    it('shows empty state when no FAQs match search query', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(
        /Search help topics, OTP questions, or claims/i
      );
      fireEvent.change(searchInput, { target: { value: 'xyzunknownterm' } });

      expect(
        screen.getByText(/No matching FAQ topics found for "xyzunknownterm"/i)
      ).toBeDefined();
    });
  });

  describe('5. Live Agent Chat Drawer / Modal (Chioma Adeyemi)', () => {
    it('opens live agent chat modal, displays Chioma credentials, and sends message', async () => {
      vi.useFakeTimers();

      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      // Open Live Chat Modal from Header button
      const openChatBtn = screen.getByRole('button', { name: /Chat Agent/i });
      fireEvent.click(openChatBtn);

      expect(screen.getByText('Chioma Adeyemi')).toBeDefined();
      expect(screen.getByText(/Official Specialist/i)).toBeDefined();
      expect(screen.getByText(/Connected with Chioma • 256-bit Secure Support Session/i)).toBeDefined();

      // Type a message in input
      const chatInput = screen.getByPlaceholderText(/Type your question for Chioma/i);
      fireEvent.change(chatInput, { target: { value: 'Where is my courier Tariq?' } });

      const sendBtn = screen.getByRole('button', { name: /Send message/i });
      fireEvent.click(sendBtn);

      expect(screen.getByText('Where is my courier Tariq?')).toBeDefined();
      expect(screen.getByText(/Chioma is typing/i)).toBeDefined();

      // Fast-forward simulated agent reply timer
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(
        screen.getByText(/Rider Tariq is currently near Ozone Cinemas/i)
      ).toBeDefined();

      vi.useRealTimers();
    });

    it('uses quick reply chips to send instant questions', async () => {
      vi.useFakeTimers();

      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      // Open Modal
      fireEvent.click(screen.getByRole('button', { name: /Chat Agent/i }));

      // Click OTP Issue chip
      const otpChip = screen.getByRole('button', { name: /OTP Issue/i });
      fireEvent.click(otpChip);

      expect(
        screen.getByText('Handover OTP is not working on rider phone')
      ).toBeDefined();

      // Fast-forward
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(
        screen.getByText(/Your 4-digit handover security PIN is 4829/i)
      ).toBeDefined();

      vi.useRealTimers();
    });

    it('closes modal when close button is clicked', () => {
      render(
        <ThemeProvider>
          <SupportDeskView />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /Chat Agent/i }));
      expect(screen.getByText('Chioma Adeyemi')).toBeDefined();

      const closeBtn = screen.getByRole('button', { name: /Close Chat/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByText('Chioma Adeyemi')).toBeNull();
    });
  });
});

