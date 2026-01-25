import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { GlobalSearch } from './GlobalSearch';

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
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-6 shrink-0">
          <div className="w-full max-w-2xl">
            <GlobalSearch variant="topbar" />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto scrollbar-modern">
          {children}
        </main>
      </div>
    </div>
  );
}

