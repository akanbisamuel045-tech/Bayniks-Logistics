import React from 'react';
import { Metadata } from 'next';
import { SupportDeskView } from '../../components/SupportDeskView';

export const metadata: Metadata = {
  title: '24/7 Support Desk — Bayniks Express Logistics',
  description: 'Reach human concierge specialists via Live Agent Chat, Toll-Free Helpline, WhatsApp Concierge, and Official Email.',
};

export default function SupportPage() {
  return <SupportDeskView />;
}

