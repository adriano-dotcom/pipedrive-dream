import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { MobileDrawer } from './MobileDrawer';
import { IOSTabBar } from '@/components/ui/ios-tab-bar';
import { LayoutGrid, Building, UsersRound, Handshake, ListTodo } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const tabItems = [
  { value: '/', label: 'Dashboard', icon: <LayoutGrid className="h-5 w-5" /> },
  { value: '/organizations', label: 'Empresas', icon: <Building className="h-5 w-5" /> },
  { value: '/people', label: 'Pessoas', icon: <UsersRound className="h-5 w-5" /> },
  { value: '/deals', label: 'Negócios', icon: <Handshake className="h-5 w-5" /> },
  { value: '/activities', label: 'Atividades', icon: <ListTodo className="h-5 w-5" /> },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get base path for tab matching (e.g., /people/123 -> /people)
  const getBasePath = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    return segments.length > 0 ? `/${segments[0]}` : '/';
  };
  
  const currentTab = getBasePath(location.pathname);

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
        <header className="h-14 md:h-16 ios-glass border-b border-border/20 flex items-center px-3 md:px-6 shrink-0 sticky top-0 z-30 rounded-none gap-3">
          {/* Mobile Drawer Trigger */}
          <MobileDrawer />
          
          <div className="flex-1 max-w-2xl mx-auto">
            <GlobalSearch variant="topbar" />
          </div>
          <div className="ml-2 md:ml-4">
            <NotificationBell />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto scrollbar-modern pb-24 md:pb-0">
          {children}
        </main>
      </div>
      
      {/* iOS Tab Bar for Mobile */}
      <IOSTabBar 
        items={tabItems}
        value={currentTab}
        onChange={(value) => navigate(value)}
      />
    </div>
  );
}

