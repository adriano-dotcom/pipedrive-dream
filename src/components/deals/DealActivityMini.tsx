import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, Calendar, CheckSquare, Clock } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string;
  is_completed: boolean;
}

interface DealActivityMiniProps {
  activity: Activity;
  onToggleComplete: (id: string, completed: boolean) => void;
  isLoading?: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  task: <CheckSquare className="h-3 w-3" />,
  call: <Phone className="h-3 w-3" />,
  meeting: <Calendar className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  deadline: <Clock className="h-3 w-3" />,
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, 'dd/MM', { locale: ptBR });
}

export function DealActivityMini({ activity, onToggleComplete, isLoading }: DealActivityMiniProps) {
  const dueDate = new Date(activity.due_date + 'T00:00:00');
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && !activity.is_completed;

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 text-[11px] py-0.5',
        isLoading && 'opacity-50 pointer-events-none'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        checked={activity.is_completed}
        onCheckedChange={(checked) => onToggleComplete(activity.id, !!checked)}
        className="h-3 w-3 rounded-sm"
      />
      <span className="text-muted-foreground">
        {activityIcons[activity.activity_type] || activityIcons.task}
      </span>
      <span className={cn(
        'flex-1 truncate',
        activity.is_completed && 'line-through text-muted-foreground'
      )}>
        {activity.title}
      </span>
      <span className={cn(
        'text-[10px] shrink-0',
        isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
      )}>
        {formatDueDate(activity.due_date)}
      </span>
    </div>
  );
}
