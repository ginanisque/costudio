import React from 'react';
import { Outlet } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';

export default function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

