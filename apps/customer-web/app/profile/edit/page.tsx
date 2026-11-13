import React from 'react';
import { Metadata } from 'next';
import { ProfileSettingsView } from '../../../components/ProfileSettingsView';

export const metadata: Metadata = {
  title: 'Edit Profile — Bayniks Express Logistics',
  description: 'Update your display name, username, contact phone number, and organization.',
};

export default function EditProfilePage() {
  return <ProfileSettingsView initialTab="edit" />;
}

