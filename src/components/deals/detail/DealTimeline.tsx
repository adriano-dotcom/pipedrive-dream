import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowRight, 
  Plus, 
  StickyNote, 
  CheckCircle2, 
  Trophy, 
  XCircle,
  Clock,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealHistory } from '@/hooks/useDealDetails';

interface DealTimelineProps {
  history: DealHistory[];
  isLoading?: boolean;
}

const eventIcons: Record<string, React.ElementType> = {
  stage_change: ArrowRight,
  created: Plus,
  note_added: StickyNote,
  activity_completed: CheckCircle2,
  deal_won: Trophy,
  deal_lost: XCircle,
  file_uploaded: Upload,
};

const eventColors: Record<string, string> = {
  stage_change: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  created: 'bg-green-500/20 text-green-400 border-green-500/30',
  note_added: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  activity_completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  deal_won: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  deal_lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  file_uploaded: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export function DealTimeline({ history, isLoading }: DealTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum evento registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {history.map((event, index) => {
          const Icon = eventIcons[event.event_type] || Clock;
          const colorClass = eventColors[event.event_type] || 'bg-muted text-muted-foreground border-border';

          return (
            <div 
              key={event.id} 
              className={cn(
                "relative flex gap-4 pl-0",
                "animate-in fade-in slide-in-from-left-2",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div className={cn(
                "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border",
                colorClass
              )}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  {event.description}
                </p>
                {/* Show lost reason if available */}
                {event.event_type === 'deal_lost' && event.new_value && (
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    Motivo: {event.new_value}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>
                    {format(new Date(event.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {event.profile?.full_name && (
                    <>
                      <span>•</span>
                      <span>{event.profile.full_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
