import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-blue-600/[0.02] pointer-events-none" />
      
      <AppSidebar />
      
      <main className="relative flex-1 overflow-auto scrollbar-modern">
        {children}
      </main>
    </div>
  );
}
