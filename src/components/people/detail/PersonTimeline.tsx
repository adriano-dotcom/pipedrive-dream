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
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PersonHistory } from '@/hooks/usePersonDetails';

interface PersonTimelineProps {
  history: PersonHistory[];
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
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function PersonTimeline({ history }: PersonTimelineProps) {
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
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-4">
            {history.map((event) => (
              <div key={event.id} className="relative flex gap-4 pl-10">
                {/* Event icon */}
                <div className={`absolute left-0 h-8 w-8 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                  {getEventIcon(event.event_type)}
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0 pb-4">
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
                        {format(new Date(event.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(event.created_at), { locale: ptBR, addSuffix: true })}
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
      </CardContent>
    </Card>
  );
}
