import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentCollab } from '@/utils/collab';
import { listMessages, getLastOpenTs } from '@/utils/storage';
import { Calculator, LayoutDashboard, LogOut, Mail, SunMedium, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { getUser, logout } from '@/utils/auth';
import { COMPETITION_DEMO } from '@/config/mode';

type Props = {
  onOpenSettings?: () => void;
};

const Header: React.FC<Props> = ({ onOpenSettings }) => {
  const [unread, setUnread] = React.useState(0);
  const { theme, setTheme } = useTheme();
  const account = getUser();
  React.useEffect(() => {
    const id = setInterval(() => {
      try {
        const room = getCurrentCollab()?.room || 'default';
        const msgs = listMessages(room);
        const last = getLastOpenTs(room);
        const lastMs = last ? new Date(last).getTime() : 0;
        const count = msgs.filter(m => !m.self && new Date(m.ts).getTime() > lastMs).length;
        setUnread(count);
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const openMessages = () => {
    try { window.dispatchEvent(new CustomEvent('open-messages')); } catch { /* ignore */ }
  };
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-700 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  Costudio
                </h1>
                <p className="text-xs text-muted-foreground">Design Studio</p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Collaborative Workspace
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="hidden lg:inline text-sm font-medium text-slate-700">{account?.businessName}</span>
            <Button asChild variant="ghost" size="sm" title="Back to collaborative workspace">
              <a href="../"><LayoutDashboard className="h-4 w-4" /><span className="hidden md:inline">Workspace</span></a>
            </Button>
            <Button asChild variant="outline" size="sm" title="Open Costing Studio">
              <a href="../costing/"><Calculator className="h-4 w-4" /><span className="hidden md:inline">Costing</span></a>
            </Button>
            <Button variant="outline" size="sm" onClick={()=> setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')} title={`Theme: ${theme}`} aria-label="Toggle theme">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={openMessages} title="Open messages" aria-label="Messages">
              <Mail className="h-4 w-4" />
              {unread > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] px-1 py-0.5 rounded bg-red-600 text-white text-[10px]">{unread}</span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenSettings}
              title="Configure API server and check status">
              Settings
            </Button>
            {COMPETITION_DEMO ? (
              <Badge variant="outline" className="hidden md:inline-flex">Competition Demo</Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => void logout()} title="Sign out">
                <LogOut className="h-4 w-4" /><span className="hidden md:inline">Sign out</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
