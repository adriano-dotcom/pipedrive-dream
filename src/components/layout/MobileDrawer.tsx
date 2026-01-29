import { 
  Building, 
  UsersRound, 
  Handshake, 
  ListTodo, 
  LayoutGrid, 
  Settings, 
  LogOut,
  Sparkles,
  Menu
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutGrid },
  { title: 'Organizações', url: '/organizations', icon: Building },
  { title: 'Pessoas', url: '/people', icon: UsersRound },
  { title: 'Negócios', url: '/deals', icon: Handshake },
  { title: 'Atividades', url: '/activities', icon: ListTodo },
];

export function MobileDrawer() {
  const { profile, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/20 pb-4">
          <DrawerTitle className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-foreground tracking-tight">CRM Jacometo</span>
              <span className="text-[10px] text-muted-foreground font-medium">Gestão de Seguros</span>
            </div>
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2 p-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-xs font-semibold">
                {profile?.full_name ? getInitials(profile.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{profile?.full_name || 'Usuário'}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  'text-[10px] px-1.5 py-0 font-medium border-0 w-fit',
                  isAdmin 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isAdmin ? 'Admin' : 'Corretor'}
              </Badge>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <DrawerClose asChild key={item.url}>
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all"
                  activeClassName="bg-primary/10 text-primary"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              </DrawerClose>
            ))}
          </nav>

          <Separator className="my-2" />

          {/* Theme Toggle */}
          <ThemeToggle collapsed={false} />

          {/* Settings & Logout */}
          <DrawerClose asChild>
            <NavLink
              to="/settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all"
              activeClassName="bg-primary/10 text-primary"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Configurações</span>
            </NavLink>
          </DrawerClose>

          <Button
            variant="ghost"
            className="justify-start gap-3 px-4 py-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              signOut();
              setOpen(false);
            }}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sair</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
