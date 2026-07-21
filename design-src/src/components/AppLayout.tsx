import React from 'react';
import Header from './Header';

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
    <Header onOpenSettings={() => { window.location.href = '../#settings'; }} />
    <main className="container mx-auto px-4 py-8">
      {children}
    </main>
  </div>
);

export default AppLayout;
