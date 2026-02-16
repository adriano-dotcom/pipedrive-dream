import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  History,
  StickyNote,
  Briefcase,
  Edit,
  UserPlus,
  MessageCircle,
  Send,
  MessageSquarePlus,
  ChevronDown,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from '@/components/ui/collapsible';
import type { PersonHistory } from '@/hooks/usePersonDetails';

interface PersonTimelineProps {
  history: PersonHistory[];
}

interface DayGroup {
  date: Date;
  dateKey: string;
  label: string;
  events: PersonHistory[];
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'created':
      return <History className="h-4 w-4" />;
    case 'file_uploaded':
      return <Upload className="h-4 w-4" />;
    case 'note_added':
      return <StickyNote className="h-4 w-4" />;
    case 'activity_completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'deal_created':
      return <Briefcase className="h-4 w-4" />;
    case 'contact_added':
      return <UserPlus className="h-4 w-4" />;
    case 'updated':
      return <Edit className="h-4 w-4" />;
    // WhatsApp events
    case 'whatsapp_received':
      return <MessageCircle className="h-4 w-4" />;
    case 'whatsapp_sent':
      return <Send className="h-4 w-4" />;
    case 'whatsapp_conversation_started':
      return <MessageSquarePlus className="h-4 w-4" />;
    case 'whatsapp_conversation_resolved':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'email_sent':
      return <Mail className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'created':
      return 'bg-primary/20 text-primary';
    case 'file_uploaded':
      return 'bg-blue-500/20 text-blue-500';
    case 'note_added':
      return 'bg-yellow-500/20 text-yellow-500';
    case 'activity_completed':
      return 'bg-green-500/20 text-green-500';
    case 'deal_created':
      return 'bg-purple-500/20 text-purple-500';
    case 'contact_added':
      return 'bg-orange-500/20 text-orange-500';
    case 'updated':
      return 'bg-muted text-muted-foreground';
    // WhatsApp events - green theme for WhatsApp
    case 'whatsapp_received':
      return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    case 'whatsapp_sent':
      return 'bg-sky-500/20 text-sky-600 dark:text-sky-400';
    case 'whatsapp_conversation_started':
      return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    case 'whatsapp_conversation_resolved':
      return 'bg-teal-500/20 text-teal-600 dark:text-teal-400';
    case 'email_sent':
      return 'bg-pink-500/20 text-pink-600 dark:text-pink-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const groupEventsByDay = (history: PersonHistory[]): DayGroup[] => {
  const groups = new Map<string, DayGroup>();
  
  history.forEach(event => {
    const eventDate = new Date(event.created_at);
    const dayStart = startOfDay(eventDate);
    const dateKey = format(dayStart, 'yyyy-MM-dd');
    
    if (!groups.has(dateKey)) {
      let label = format(dayStart, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      if (isToday(dayStart)) {
        label = `Hoje - ${format(dayStart, 'dd/MM/yyyy')}`;
      } else if (isYesterday(dayStart)) {
        label = `Ontem - ${format(dayStart, 'dd/MM/yyyy')}`;
      }
      
      groups.set(dateKey, {
        date: dayStart,
        dateKey,
        label,
        events: [],
      });
    }
    
    groups.get(dateKey)!.events.push(event);
  });
  
  // Ordenar por data decrescente
  return Array.from(groups.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export function PersonTimeline({ history }: PersonTimelineProps) {
  // Agrupar eventos por dia
  const dayGroups = useMemo(() => groupEventsByDay(history), [history]);
  
  // Estado: primeiro dia aberto, demais fechados
  const [openDays, setOpenDays] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (dayGroups.length > 0) {
      initial.add(dayGroups[0].dateKey);
    }
    return initial;
  });

  const toggleDay = (dateKey: string) => {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  if (history.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">Nenhum evento registrado</h3>
          <p className="text-sm text-muted-foreground">
            O histórico de atividades aparecerá aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Histórico ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dayGroups.map((group) => (
          <Collapsible
            key={group.dateKey}
            open={openDays.has(group.dateKey)}
            onOpenChange={() => toggleDay(group.dateKey)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
              <div className="flex items-center gap-2">
                {openDays.has(group.dateKey) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">{group.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {group.events.length} {group.events.length === 1 ? 'evento' : 'eventos'}
              </span>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="relative mt-2 ml-2">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-3">
                  {group.events.map((event) => (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      {/* Event icon */}
                      <div className={`absolute left-0 h-8 w-8 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                        {getEventIcon(event.event_type)}
                      </div>
                      
                      {/* Event content */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{event.description}</p>
                            {event.new_value && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {event.old_value && `${event.old_value} → `}{event.new_value}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), 'HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        {event.profile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            por {event.profile.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
