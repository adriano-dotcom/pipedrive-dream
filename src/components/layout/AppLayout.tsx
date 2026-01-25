import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-blue-600/[0.02] pointer-events-none" />
      
      <AppSidebar />
      
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Global Search */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-6 shrink-0">
          <div className="flex-1 max-w-2xl mx-auto">
            <GlobalSearch variant="topbar" />
          </div>
          <div className="ml-4">
            <NotificationBell />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto scrollbar-modern">
          {children}
        </main>
      </div>
    </div>
  );
}

