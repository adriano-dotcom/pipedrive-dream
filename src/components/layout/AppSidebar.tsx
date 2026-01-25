import { Building2, Users, Briefcase, CheckSquare, LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Organizações', url: '/organizations', icon: Building2 },
  { title: 'Pessoas', url: '/people', icon: Users },
  { title: 'Negócios', url: '/deals', icon: Briefcase },
  { title: 'Atividades', url: '/activities', icon: CheckSquare },
];

export function AppSidebar() {
  const { profile, role, signOut, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">CRM Jacometo</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-2'
            )}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed && 'justify-center px-2'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.full_name ? getInitials(profile.full_name) : '?'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-1 flex-col items-start text-left">
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {profile?.full_name || 'Usuário'}
                  </span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {isAdmin ? 'Admin' : 'Corretor'}
                  </Badge>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Configurações
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
