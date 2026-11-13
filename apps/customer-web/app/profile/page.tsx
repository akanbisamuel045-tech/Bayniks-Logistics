import React from 'react';
import { Metadata } from 'next';
import { ProfileSettingsView } from '../../components/ProfileSettingsView';

export const metadata: Metadata = {
  title: 'Account Profile — Bayniks Express Logistics',
  description: 'Manage personal details, dispatch preferences, payment methods and security settings.',
};

export default function ProfilePage() {
  return <ProfileSettingsView initialTab="profile" />;
}

