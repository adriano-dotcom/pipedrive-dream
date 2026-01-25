import { Bell, Check, CheckCheck, Building2, User, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

function getEntityIcon(entityType: string | null) {
  switch (entityType) {
    case 'deal':
      return <Briefcase className="h-4 w-4 text-primary" />;
    case 'person':
      return <User className="h-4 w-4 text-primary" />;
    case 'organization':
      return <Building2 className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function getEntityRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  
  switch (entityType) {
    case 'deal':
      return `/deals/${entityId}`;
    case 'person':
      return `/people/${entityId}`;
    case 'organization':
      return `/organizations/${entityId}`;
    default:
      return null;
  }
}

function NotificationItem({ 
  notification, 
  onRead, 
  onNavigate 
}: { 
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (route: string) => void;
}) {
  const route = getEntityRoute(notification.entity_type, notification.entity_id);
  
  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    if (route) {
      onNavigate(route);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 rounded-lg",
        !notification.is_read && "bg-accent/30"
      )}
    >
      <div className="mt-0.5">
        {getEntityIcon(notification.entity_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm line-clamp-2",
          !notification.is_read && "font-medium"
        )}>
          {notification.title}
        </p>
        {notification.entity_name && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            em {notification.entity_name}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllAsRead 
  } = useNotifications();

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center animate-in zoom-in-50"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
