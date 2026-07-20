import React from 'react';
import { Outlet } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { AuthGate } from '@/components/AuthGate';

export default function RootLayout() {
  return (
    <AuthGate>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthGate>
  );
}
