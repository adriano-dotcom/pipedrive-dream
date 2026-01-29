import { 
  Building, 
  UsersRound, 
  Handshake, 
  ListTodo, 
  LayoutGrid, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react';
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
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { GlobalSearch } from './GlobalSearch';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutGrid },
  { title: 'Organizações', url: '/organizations', icon: Building },
  { title: 'Pessoas', url: '/people', icon: UsersRound },
  { title: 'Negócios', url: '/deals', icon: Handshake },
  { title: 'Atividades', url: '/activities', icon: ListTodo },
  { title: 'Relatórios', url: '/reports', icon: BarChart3 },
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
        'flex h-screen flex-col transition-all duration-300 relative',
        'ios-glass border-r-0 rounded-none',
        'hidden md:flex',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.05] via-transparent to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex h-16 items-center justify-between border-b border-border/20 px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/10" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground tracking-tight">CRM Jacometo</span>
              <span className="text-[10px] text-muted-foreground font-medium">Gestão de Seguros</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-[60px] z-10 h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-accent',
          'transition-all duration-200 hover:scale-110'
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Navigation */}
      <nav className="relative flex-1 space-y-1 p-3 pt-6">
        {menuItems.map((item, index) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all duration-200',
              'hover:bg-accent/50 hover:text-foreground',
              collapsed && 'justify-center px-2'
            )}
            activeClassName="bg-primary/10 text-primary shadow-sm border border-primary/20"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
              'group-hover:bg-accent/50'
            )}>
              <item.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
            </div>
            {!collapsed && (
              <span className="font-medium text-sm">{item.title}</span>
            )}
          </NavLink>
        ))}

        {/* Theme Toggle */}
        <Separator className="my-3 bg-border/50" />
        <ThemeToggle collapsed={collapsed} />
      </nav>

      {/* User Section */}
      <div className="relative border-t border-border/20 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 rounded-xl px-3 py-6 text-sidebar-foreground',
                'hover:bg-white/[0.05] transition-all duration-200',
                collapsed && 'justify-center px-2'
              )}
            >
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-xs font-semibold">
                    {profile?.full_name ? getInitials(profile.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-sidebar" />
              </div>
              {!collapsed && (
                <div className="flex flex-1 flex-col items-start text-left">
                  <span className="text-sm font-semibold truncate max-w-[140px]">
                    {profile?.full_name || 'Usuário'}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[10px] px-1.5 py-0 mt-0.5 font-medium border-0',
                      isAdmin 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isAdmin ? 'Admin' : 'Corretor'}
                  </Badge>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 glass border-white/10"
            sideOffset={8}
          >
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Configurações
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
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
