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
      {/* Subtle gradient background with blur effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-blue-600/[0.03] pointer-events-none" />
      
      {/* Ambient glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <AppSidebar />
      
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* iOS-style Header with Glass Effect */}
        <header className="h-16 ios-glass border-b border-border/20 flex items-center px-6 shrink-0 sticky top-0 z-30 rounded-none">
          <div className="flex-1 max-w-2xl mx-auto">
            <GlobalSearch variant="topbar" />
          </div>
          <div className="ml-4">
            <NotificationBell />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto scrollbar-modern pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}

