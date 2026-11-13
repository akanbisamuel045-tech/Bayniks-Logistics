import React from 'react';
import { Metadata } from 'next';
import { ProfileSettingsView } from '../../components/ProfileSettingsView';

export const metadata: Metadata = {
  title: 'App Settings — Bayniks Express Logistics',
  description: 'Manage app theme appearance, dispatch safety toggles, biometric authentication and local cache.',
};

export default function SettingsPage() {
  return <ProfileSettingsView initialTab="settings" />;
}

