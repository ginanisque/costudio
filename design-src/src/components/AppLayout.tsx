import React, { useState } from 'react';
import Header from './Header';
import SettingsPortal from './SettingsPortal';
import { useTheme } from '@/components/theme-provider';
import { getUser } from '@/utils/auth';
import { COMPETITION_DEMO } from '@/config/mode';

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const account = getUser();
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <Header onOpenSettings={() => setOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <SettingsPortal open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Workspace settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Personalize how you work across Costudio.</p>
          </div>

          <div className="rounded border p-4 bg-white text-sm space-y-1">
            <div className="font-medium">Workspace</div>
            <div className="text-muted-foreground">{account?.businessName || 'Costudio'}</div>
            {COMPETITION_DEMO && <div className="text-emerald-700">Competition demo mode</div>}
          </div>

          <div className="rounded border p-4 bg-white text-sm">
            <div className="font-medium mb-1">Appearance</div>
            <div className="text-muted-foreground mb-3">Current theme: <span className="capitalize">{theme}</span></div>
            <button type="button" className="inline-flex items-center px-3 py-1.5 border rounded" onClick={() => setTheme(nextTheme)}>
              Switch to {nextTheme}
            </button>
          </div>

          <div className="rounded border p-4 bg-white text-sm">
            <div className="font-medium mb-2">Connected workspaces</div>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex items-center px-3 py-1.5 border rounded hover:bg-slate-50" href="../costing/">Costing</a>
              <a className="inline-flex items-center px-3 py-1.5 border rounded hover:bg-slate-50" href="../costing/?workspace=crm&view=clients">Clients</a>
              <a className="inline-flex items-center px-3 py-1.5 border rounded hover:bg-slate-50" href="../costing/?workspace=crm&view=measurements">Measurements</a>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="inline-flex items-center px-4 py-2 border rounded" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </SettingsPortal>
    </div>
  );
};

export default AppLayout;
