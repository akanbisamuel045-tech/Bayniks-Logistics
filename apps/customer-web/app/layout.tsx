import type { Metadata } from 'next';
import React from 'react';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bayniks Express Logistics — Sub-Second Real-Time Fleet & Deliveries',
  description:
    'Enterprise motorcycle dispatch, parcel routing, live telemetry, and anti-fraud PIN escrow across Lagos State.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-bayniks-black text-slate-100 font-sans min-h-screen antialiased selection:bg-bayniks-orange selection:text-white">
        {children}
      </body>
    </html>
  );
}
